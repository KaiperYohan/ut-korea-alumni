// Birthdays are stored as YYMMDD, the format the birthday cron reads (it matches
// characters 3-6 against today's MMDD). The form only checks for six digits, so
// a date typed month-first in the US order, such as 112378 for Nov 23 1978, passed
// and then never matched any day. This rejects anything that is not a real date.

const PATTERN = /^\d{6}$/

// Returns { ok: true, value } where value is the cleaned YYMMDD or null when left
// blank, or { ok: false, error } when the input is not a real calendar date.
export function validateBirthday(input) {
  const raw = input === null || input === undefined ? '' : String(input).trim()
  if (!raw) return { ok: true, value: null }
  if (!PATTERN.test(raw)) {
    return { ok: false, error: 'Birthday must be 6 digits in YYMMDD order, e.g. 900315.' }
  }

  const yy = Number(raw.slice(0, 2))
  const mm = Number(raw.slice(2, 4))
  const dd = Number(raw.slice(4, 6))
  // The century only matters for Feb 29. Two-digit years ahead of this one are
  // read as 19xx, since nobody registering was born in the future.
  const currentYY = new Date().getUTCFullYear() % 100
  const year = (yy > currentYY ? 1900 : 2000) + yy

  const date = new Date(Date.UTC(year, mm - 1, dd))
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === mm - 1 && date.getUTCDate() === dd
  if (!real) {
    return { ok: false, error: 'Birthday is not a real date. Use YYMMDD order, e.g. 900315 for 15 March 1990.' }
  }
  return { ok: true, value: raw }
}
