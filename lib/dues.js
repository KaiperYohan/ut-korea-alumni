// Annual membership dues.
//
// A dues year runs Oct 1 to Sept 30 and is named for the year it opens, so dues
// year 2026 covers Oct 1 2026 through Sept 30 2027. Collection opens Oct 1, the
// deadline is Dec 31, and members who have not paid lapse to general benefits on
// Jan 1.
//
// The whole policy reduces to one comparison: a member is full when their latest
// paid dues year is at least the current calendar year minus one. Nothing runs on
// Jan 1 — the threshold moves because the calendar year changed. There is no
// scheduled job to half-run, run twice, or miss, and no stored value that a reset
// would overwrite, so the record of who paid is never destroyed.
//
// Worked through: a payment for dues year 2026 keeps a member full until Dec 31
// 2027, because the threshold only reaches 2027 on Jan 1 2028. Someone who paid
// for 2025 and not 2026 stays full through Dec 2026 and lapses on Jan 1 2027.

export const DUES_YEAR_START_MONTH = 10 // October
export const DUES_AMOUNT_KRW = 50000

// Dues vary by position: the president pays more than a committee chair, who
// pays more than an ordinary member. Rates live in site_settings under
// dues_rate_<key> so they can be changed without a deploy; the values below are
// only the fallback when a key has never been set.
//
// The first eight keys are exactly the role keys used in org_positions, so a
// position maps straight to a rate with no translation table in between.
// 'executive' covers members marked executive who hold no committee post, and
// 'general' is everyone else.
export const DUES_RATE_TIERS = [
  { key: 'president', en: 'President', ko: '회장', fallback: 5000000, fromRole: true },
  { key: 'vice_president', en: 'Vice President', ko: '부회장', fallback: 2000000, fromRole: true },
  { key: 'chair', en: 'Chair', ko: '위원장', fallback: 300000, fromRole: true },
  { key: 'vice_chair', en: 'Vice Chair', ko: '부위원장', fallback: 100000, fromRole: true },
  { key: 'general_secretary', en: 'General Secretary', ko: '총무', fallback: 100000, fromRole: true },
  { key: 'treasurer', en: 'Treasurer', ko: '재무', fallback: 100000, fromRole: true },
  { key: 'historian', en: 'Historian', ko: '서기', fallback: 100000, fromRole: true },
  { key: 'member', en: 'Committee Member', ko: '위원', fallback: 100000, fromRole: true },
  { key: 'executive', en: 'Executive (no committee post)', ko: '임원 (보직 없음)', fallback: 100000, fromRole: false },
  { key: 'general', en: 'General Member', ko: '일반 회원', fallback: DUES_AMOUNT_KRW, fromRole: false },
]

export const DUES_RATE_PREFIX = 'dues_rate_'

export function duesRateSettingKey(tier) {
  return `${DUES_RATE_PREFIX}${tier}`
}

// Reads rates out of a site_settings map. Values are stored as strings and may
// have been typed with separators, so "1,000,000" parses the same as 1000000.
// Anything unparseable falls back rather than becoming NaN and silently pricing
// a position at nothing.
export function duesRates(settings = {}) {
  const rates = {}
  for (const tier of DUES_RATE_TIERS) {
    const raw = settings[duesRateSettingKey(tier.key)]
    const parsed = raw === undefined || raw === null || String(raw).trim() === ''
      ? NaN
      : Number(String(raw).replace(/[,\s₩]/g, ''))
    rates[tier.key] = Number.isFinite(parsed) && parsed >= 0 ? parsed : tier.fallback
  }
  return rates
}

// A member can hold more than one position — the president also chairs the
// executive committee, and two vice presidents also chair committees — so the
// highest applicable rate is the one that applies.
export function resolveDuesAmount(rates, { roles = [], membershipLevel } = {}) {
  const candidates = (roles || [])
    .map(role => rates[role])
    .filter(amount => Number.isFinite(amount))
  if (membershipLevel === 'executive') candidates.push(rates.executive)
  if (!candidates.length) return rates.general
  return Math.max(...candidates)
}

// Which tier produced the amount, for showing the member why they owe it.
export function resolveDuesTier(rates, { roles = [], membershipLevel } = {}) {
  const amount = resolveDuesAmount(rates, { roles, membershipLevel })
  const fromRole = (roles || []).find(role => rates[role] === amount)
  if (fromRole) return fromRole
  if (membershipLevel === 'executive' && rates.executive === amount) return 'executive'
  return 'general'
}

export function formatKrw(amount) {
  return `${Number(amount || 0).toLocaleString('en-US')} KRW`
}

// The association is in Korea, so the year boundary is evaluated in KST rather
// than wherever the server happens to run. Without this a member in Seoul could
// lapse partway through Dec 31 their time.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function kstParts(now = new Date()) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, day: kst.getUTCDate() }
}

// The dues year currently being collected. October through December belong to the
// year that has just opened; January through September still belong to the year
// that opened the previous October.
export function currentDuesYear(now = new Date()) {
  const { year, month } = kstParts(now)
  return month >= DUES_YEAR_START_MONTH ? year : year - 1
}

// The dues year a member must have paid to count as full right now. From October
// to December this trails currentDuesYear by one, and that gap is the grace
// period: the new year is collectable but not yet enforced.
export function requiredDuesYear(now = new Date()) {
  return kstParts(now).year - 1
}

export function isDuesCurrent(latestPaidYear, now = new Date()) {
  if (latestPaidYear === null || latestPaidYear === undefined) return false
  return Number(latestPaidYear) >= requiredDuesYear(now)
}

// True from Oct 1 to Dec 31, while the open dues year is not yet enforced.
export function inGracePeriod(now = new Date()) {
  return currentDuesYear(now) !== requiredDuesYear(now)
}

// Dec 31 of the dues year — the date by which it must be paid.
export function duesDeadline(duesYear) {
  return `${duesYear}-12-31`
}

// The date a member lapses if this dues year goes unpaid.
export function duesLapseDate(duesYear) {
  return `${duesYear + 1}-01-01`
}

export function duesYearRange(duesYear) {
  return { start: `${duesYear}-10-01`, end: `${duesYear + 1}-09-30` }
}

// "2026–27"
export function duesYearLabel(duesYear) {
  return `${duesYear}–${String(duesYear + 1).slice(2)}`
}

// The date through which a payment for this dues year keeps a member full.
export function paidThrough(duesYear) {
  return `${duesYear + 1}-12-31`
}

// Dues years worth offering in an admin dropdown: the open year plus a couple
// either side, so late and corrective entries are recordable.
export function selectableDuesYears(now = new Date()) {
  const open = currentDuesYear(now)
  return [open + 1, open, open - 1, open - 2]
}
