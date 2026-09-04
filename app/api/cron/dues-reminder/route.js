import { sql } from '@/lib/db'
import { sendDuesReminderEmail } from '@/lib/email'
import { currentDuesYear, duesDeadline, duesLapseDate, DUES_AMOUNT_KRW } from '@/lib/dues'
import { isActiveMember } from '@/lib/memberStatus'

// December reminder to members with no payment recorded for the open dues year.
// Scheduled daily; it only acts during the reminder window, so the schedule can
// stay simple and the window is defined here in one place.
const REMINDER_DAYS = [1, 15, 28] // December days on which it sends

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'
  const dryRun = searchParams.get('dryRun') === 'true'

  // Evaluated in KST, matching the dues year boundary.
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const month = kst.getUTCMonth() + 1
  const day = kst.getUTCDate()

  if (!force && !(month === 12 && REMINDER_DAYS.includes(day))) {
    return Response.json({ success: true, skipped: true, reason: `Not a reminder day (KST ${month}/${day})` })
  }

  const duesYear = currentDuesYear()

  try {
    // Members with no payment for the open dues year. Status decides who is
    // chased: resigned, expelled and deceased members are never mailed.
    const { rows } = await sql`
      SELECT m.id, m.name, m.name_ko, m.email, m.status, m.is_approved, m.membership_level
      FROM members m
      WHERE m.email IS NOT NULL AND m.email <> ''
        AND NOT EXISTS (
          SELECT 1 FROM dues_payments d
          WHERE d.member_id = m.id AND d.dues_year = ${duesYear}
        )
      ORDER BY m.name
    `
    const recipients = rows.filter(m => isActiveMember(m.status, m.is_approved))

    if (dryRun) {
      return Response.json({
        success: true,
        dryRun: true,
        duesYear,
        wouldSend: recipients.length,
        sample: recipients.slice(0, 10).map(m => ({ name: m.name, email: m.email })),
      })
    }

    let sent = 0
    const failed = []
    for (const member of recipients) {
      try {
        await sendDuesReminderEmail(member.email, member.name || member.name_ko || 'there', {
          duesYear,
          amount: DUES_AMOUNT_KRW,
          deadline: duesDeadline(duesYear),
          lapseDate: duesLapseDate(duesYear),
        })
        sent++
      } catch (error) {
        // One bad address must not abort the run.
        console.error(`Dues reminder failed for ${member.email}:`, error.message)
        failed.push(member.email)
      }
    }

    return Response.json({ success: true, duesYear, candidates: recipients.length, sent, failed: failed.length })
  } catch (error) {
    console.error('Dues reminder error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
