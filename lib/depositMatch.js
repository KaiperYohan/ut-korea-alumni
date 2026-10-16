// Decides what to do with a bank deposit from the 모임통장 statement.
//
// Policy: a 50,000원 deposit from a general member pays that member's dues for the
// open dues year, and is recorded automatically. Everything that is not clearly
// that goes to a review list instead of being guessed at.
//
// Deposits are only considered from the start of the current dues year: the
// account also takes 50,000원 for events (Texas Hold'em buy-ins, socials), and
// without a cutoff a past Hold'em night would mark every entrant as paid.

import { currentDuesYear, DUES_YEAR_START_MONTH } from '@/lib/dues'

export const AUTO_AMOUNT = 50000

// A memo that names an event is an event fee even at 50,000원.
const EVENT_WORDS = /(홀덤|소셜|야구|연탄|후드|후디|hoodie|참가비|모임|목요일|기부|후원|총동문회|동반인|(^|[^a-z])ft([^a-z]|$))/i

const compact = s => String(s || '').replace(/[\s()[\]'"‘’`_\-/,.·:;~!?+]/g, '')
const latin = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '')

// Oct 1 00:00 KST of the dues year now open.
export function collectionStart(now = new Date()) {
  const y = currentDuesYear(now)
  return new Date(`${y}-${String(DUES_YEAR_START_MONTH).padStart(2, '0')}-01T00:00:00+09:00`)
}

// Finds the member a deposit memo names. Toss shows the sender's name or the memo
// they typed, cut to about 18 characters: "김진홍 연회비", "이경호09", "KIM WON YO",
// "노예은(정한나)" (paid on someone else's behalf).
export function matchMember(memo, members) {
  const text = compact(memo)
  const years = (String(memo).match(/\d{2,4}/g) || []).map(d => d.slice(-2))

  // Korean names anywhere in the memo, longest first so 이민지 beats 이민.
  const ko = members
    .map(m => ({ m, name: compact(m.name_ko) }))
    .filter(x => x.name.length >= 2 && /[가-힣]/.test(x.name) && text.includes(x.name))
  const names = [...new Set(ko.map(x => x.name))].sort((a, b) => b.length - a.length)
  const distinct = names.filter(n => !names.some(longer => longer !== n && longer.includes(n)))

  let pool = []
  let how = ''
  if (distinct.length > 1) {
    // Two different people named, e.g. "김기배(구길자)" — whose dues is unclear.
    return { status: 'ambiguous', reason: `names more than one person (${distinct.join(', ')})`, candidates: ko.filter(x => distinct.includes(x.name)).map(x => x.m) }
  }
  if (distinct.length === 1) {
    pool = ko.filter(x => x.name === distinct[0]).map(x => x.m)
    how = 'Korean name'
  } else {
    // Romanized names, as banks show them for accounts held in English.
    const memoLatin = latin(memo)
    if (memoLatin.length >= 6) {
      pool = members.filter(m => {
        const tokens = String(m.name || '').toUpperCase().split(/\s+/).filter(Boolean)
        const forms = [tokens.join(''), [...tokens].reverse().join('')].map(latin).filter(f => f.length >= 4)
        return forms.some(f => f.startsWith(memoLatin) || memoLatin.startsWith(f))
      })
      how = 'English name'
    }
  }

  if (!pool.length) return { status: 'none', reason: 'no member with this name', candidates: [] }
  if (pool.length === 1) return { status: 'unique', member: pool[0], how, candidates: pool }
  const byYear = pool.filter(m => m.graduation_year && years.includes(String(m.graduation_year).slice(-2)))
  if (byYear.length === 1) return { status: 'unique', member: byYear[0], how: `${how} + class year`, candidates: pool }
  return { status: 'ambiguous', reason: `${pool.length} members share this name`, candidates: pool }
}

// One deposit -> { action: 'ignore' | 'review' | 'auto', reason, member?, duesYear }
// `paid` is a Set of "memberId|duesYear" already recorded, including earlier rows
// of the same import, so a repeat buy-in cannot pay dues twice.
export function decideDeposit(tx, members, paid, now = new Date()) {
  if (tx.kind !== '입금' || tx.amount !== AUTO_AMOUNT) return { action: 'ignore', reason: 'not a 50,000원 deposit' }
  const at = new Date(tx.occurredAt)
  if (at < collectionStart(now)) return { action: 'ignore', reason: 'before the current dues year opened' }
  const duesYear = currentDuesYear(at)

  const match = matchMember(tx.memo, members)
  const base = { duesYear, candidates: match.candidates || [] }
  if (EVENT_WORDS.test(tx.memo)) return { ...base, action: 'review', reason: 'memo names an event', member: match.member }
  if (match.status === 'none') return { ...base, action: 'review', reason: 'no member with this name — may not have signed up', noAccount: true }
  if (match.status === 'ambiguous') return { ...base, action: 'review', reason: match.reason }

  const m = match.member
  if (m.membership_level === 'executive') return { ...base, action: 'review', reason: 'executive — executive dues are not 50,000원', member: m }
  if (!m.is_approved || (m.status && m.status !== 'active')) return { ...base, action: 'review', reason: `member is ${m.status || 'not approved'}`, member: m }
  if (paid.has(`${m.id}|${duesYear}`)) return { ...base, action: 'review', reason: 'already paid for this dues year', member: m }
  return { ...base, action: 'auto', reason: `matched by ${match.how}`, member: m }
}
