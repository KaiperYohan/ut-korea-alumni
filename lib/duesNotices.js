import { sql } from '@/lib/db'
import { currentDuesYear, isDuesCurrent, duesDeadline, duesLapseDate, paidThrough } from '@/lib/dues'
import { isActiveMember } from '@/lib/memberStatus'
import { readDuesRates } from '@/lib/duesRecord'
import { sendDuesNoticeEmail } from '@/lib/email'
import { resolveTemplate, NOTICE_SETTING_PREFIX } from '@/lib/duesNoticeTemplate'

// End-of-year dues notices, in two versions:
//   'renewal'  — a full member whose dues for the open year are not paid yet.
//                Benefits continue to Dec 31; paying renews them for a year.
//   'benefits' — a general member, told what full membership offers and how to join.
// Members who have already paid for the open year, executives (who pay their own
// rates and never lose access), and members who are not active get neither.
//
// Sends go through notice_sends, one row per member per campaign, so a member is
// never mailed twice for the same campaign and an interrupted run resumes where it
// stopped. Delivery is capped per day to stay under the email provider's daily
// limit (100/day on Resend's free plan), leaving room for sign-up and password
// mail; a large campaign simply finishes over a few days.

export const DAILY_CAP = Number(process.env.DUES_NOTICE_DAILY_CAP) || 90

// Campaigns, by KST date. Oct 1 opens the dues year: both versions. December
// reminds full members who still have not renewed before they lapse on Jan 1.
export function campaignsFor(kstMonth, kstDay, duesYear) {
  if (kstMonth === 10 && kstDay === 1) return [{ key: `${duesYear}-opening`, versions: ['renewal', 'benefits'] }]
  if (kstMonth === 12 && [1, 15, 28].includes(kstDay)) return [{ key: `${duesYear}-renewal-dec${String(kstDay).padStart(2, '0')}`, versions: ['renewal'] }]
  return []
}

// Which version a member should see, ignoring how it reaches them. Shared by the
// email queue and the notice shown on the site when they sign in.
export function audienceVersion(member, duesYear, now = new Date()) {
  if (!isActiveMember(member.status, member.is_approved)) return null
  if (member.membership_level === 'executive') return null
  if (member.dues_year_paid != null && Number(member.dues_year_paid) >= duesYear) return null
  return isDuesCurrent(member.dues_year_paid, now) ? 'renewal' : 'benefits'
}

export function noticeVersion(member, duesYear, now = new Date()) {
  if (!member.email || !member.email_verified) return null
  return audienceVersion(member, duesYear, now)
}

async function loadMembers(db = sql) {
  const { rows } = await db`
    SELECT m.id, m.email, m.email_verified, m.name, m.name_ko, m.status, m.is_approved, m.membership_level,
           (SELECT MAX(d.dues_year) FROM dues_payments d WHERE d.member_id = m.id) AS dues_year_paid
    FROM members m`
  return rows
}

// Who would get which version right now.
export async function noticeAudience(now = new Date()) {
  const duesYear = currentDuesYear(now)
  const members = await loadMembers()
  const audience = { duesYear, renewal: [], benefits: [] }
  for (const m of members) {
    const v = noticeVersion(m, duesYear, now)
    if (v) audience[v].push({ id: m.id, name: m.name, name_ko: m.name_ko, email: m.email })
  }
  return audience
}

// Queue a campaign. Members already queued for this campaign are left alone.
export async function enqueueCampaign(key, versions, now = new Date()) {
  const audience = await noticeAudience(now)
  let queued = 0
  for (const version of versions) {
    for (const m of audience[version]) {
      const { rowCount } = await sql`
        INSERT INTO notice_sends (member_id, campaign, version, status)
        VALUES (${m.id}, ${key}, ${version}, 'queued')
        ON CONFLICT (member_id, campaign) DO NOTHING`
      queued += rowCount
    }
  }
  return { campaign: key, queued }
}

// The wording admins have saved for each version, or the defaults.
export async function readNoticeTemplates() {
  const { rows } = await sql`SELECT key, value FROM site_settings WHERE key LIKE ${NOTICE_SETTING_PREFIX + '%'}`
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return { renewal: resolveTemplate('renewal', settings), benefits: resolveTemplate('benefits', settings) }
}

export async function emailContext(duesYear) {
  const rates = await readDuesRates()
  return {
    duesYear,
    amount: rates.general,
    deadline: duesDeadline(duesYear),
    lapseDate: duesLapseDate(duesYear),
    paidThrough: paidThrough(duesYear),
  }
}

// Send up to the remaining daily allowance from the queue, oldest first. Each
// member is re-checked first: anyone who paid after being queued is skipped.
export async function deliverQueued({ now = new Date(), limit } = {}) {
  const duesYear = currentDuesYear(now)
  const { rows: [{ n: sentToday }] } = await sql`
    SELECT count(*)::int AS n FROM notice_sends
    WHERE status = 'sent' AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'`
  const allowance = Math.max(0, (limit ?? DAILY_CAP) - sentToday)
  const result = { allowance, sent: 0, skipped: 0, failed: 0, deferred: false }
  if (!allowance) return result

  const { rows: queue } = await sql`
    SELECT s.id, s.member_id, s.campaign, s.version FROM notice_sends s
    WHERE s.status = 'queued' ORDER BY s.created_at, s.id LIMIT ${allowance}`
  if (!queue.length) return result

  const members = new Map((await loadMembers()).map(m => [m.id, m]))
  const ctx = await emailContext(duesYear)
  const templates = await readNoticeTemplates()

  for (const item of queue) {
    const m = members.get(item.member_id)
    const version = m ? noticeVersion(m, duesYear, now) : null
    if (!version) {
      await sql`UPDATE notice_sends SET status = 'skipped', error = 'no longer needs this notice' WHERE id = ${item.id}`
      result.skipped++
      continue
    }
    try {
      await sendDuesNoticeEmail(m.email, m.name_ko || m.name || '', {
        version: item.version, template: templates[item.version], ...ctx, idempotencyKey: `dues-notice-${item.campaign}-${m.id}`,
      })
      await sql`UPDATE notice_sends SET status = 'sent', sent_at = NOW(), error = NULL WHERE id = ${item.id}`
      result.sent++
    } catch (error) {
      if (error.statusCode === 429) {
        // Provider limit reached: leave the rest queued for tomorrow.
        await sql`UPDATE notice_sends SET error = ${'rate limited, will retry'} WHERE id = ${item.id}`
        result.deferred = true
        break
      }
      await sql`UPDATE notice_sends SET status = 'failed', error = ${String(error.message).slice(0, 300)} WHERE id = ${item.id}`
      result.failed++
    }
  }
  return result
}

export async function noticeStats() {
  const { rows } = await sql`
    SELECT campaign, version, status, count(*)::int AS n, MAX(sent_at) AS last_sent
    FROM notice_sends GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`
  return rows
}
