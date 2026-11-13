// Promotions: time-limited campaigns (a December 자동이체 gift event, an early-bird
// offer) that admins set up without a deploy. Each one runs from starts_on to
// ends_on inclusive, in KST, and turns itself off afterwards; it can show as a
// home-page pop-up, as the orange bar at the top of every page, or both, and
// always has its own page at /promo/<slug>, optionally with an entry form.
//
// Pure helpers, shared by the API routes and the admin form.

export const AUDIENCES = [
  { value: 'everyone', label: 'Everyone', labelKo: '모든 방문자', hint: 'including people who are not logged in' },
  { value: 'members', label: 'Logged-in members', labelKo: '로그인한 회원', hint: 'any member, full or general (not visitors)' },
  { value: 'general', label: 'General members', labelKo: '일반 회원', hint: 'logged in, dues for this year not paid' },
  { value: 'full', label: 'Full members', labelKo: '정회원', hint: 'dues current, or executives' },
]
export const AUDIENCE_VALUES = AUDIENCES.map(a => a.value)

export const ENTRY_STATUSES = [
  { value: 'submitted', label: 'Submitted', labelKo: '접수됨', badge: 'bg-amber-100 text-amber-800' },
  { value: 'approved', label: 'Approved', labelKo: '확인 완료', badge: 'bg-green-100 text-green-800' },
  { value: 'gift_sent', label: 'Gift sent', labelKo: '선물 발송 완료', badge: 'bg-sky-100 text-sky-800' },
  { value: 'rejected', label: 'Not eligible', labelKo: '대상 아님', badge: 'bg-red-100 text-red-700' },
]
export const ENTRY_STATUS_VALUES = ENTRY_STATUSES.map(s => s.value)
export const entryStatus = value => ENTRY_STATUSES.find(s => s.value === value) || ENTRY_STATUSES[0]

// Today's date in Korea, as YYYY-MM-DD.
export function kstToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

export function isLive(promo, today = kstToday()) {
  return Boolean(promo?.enabled) && promo.starts_on <= today && today <= promo.ends_on
}

// viewer: null when logged out, else { membershipLevel, hasFullBenefits }.
export function audienceMatches(audience, viewer) {
  if (audience === 'everyone') return true
  if (!viewer || viewer.membershipLevel === 'visitor') return false
  if (audience === 'members') return true
  if (audience === 'full') return Boolean(viewer.hasFullBenefits)
  if (audience === 'general') return !viewer.hasFullBenefits
  return false
}

export function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const str = (v, max) => String(v ?? '').trim().slice(0, max)

// Cleans an admin-submitted promotion. Returns { value } or { error }.
export function sanitizePromotion(input) {
  const p = {
    slug: slugify(input.slug || input.title || ''),
    title: str(input.title, 200),
    title_ko: str(input.title_ko, 200),
    body: str(input.body, 5000),
    body_ko: str(input.body_ko, 5000),
    image_url: str(input.image_url, 1000) || null,
    button_label: str(input.button_label, 60),
    button_label_ko: str(input.button_label_ko, 60),
    button_url: str(input.button_url, 1000) || null,
    banner_text: str(input.banner_text, 200),
    banner_text_ko: str(input.banner_text_ko, 200),
    starts_on: str(input.starts_on, 10),
    ends_on: str(input.ends_on, 10),
    audience: AUDIENCE_VALUES.includes(input.audience) ? input.audience : 'everyone',
    show_popup: Boolean(input.show_popup),
    show_banner: Boolean(input.show_banner),
    enabled: input.enabled === undefined ? true : Boolean(input.enabled),
    entry_form: Boolean(input.entry_form),
    entry_screenshot: Boolean(input.entry_screenshot),
    entry_address: Boolean(input.entry_address),
    entry_note: str(input.entry_note, 2000),
    entry_note_ko: str(input.entry_note_ko, 2000),
  }
  if (!p.title && !p.title_ko) return { error: 'Give the promotion a title.' }
  if (!p.slug) return { error: 'Give the promotion a page address (English letters or numbers).' }
  if (!DATE.test(p.starts_on) || !DATE.test(p.ends_on)) return { error: 'Set a start and an end date.' }
  if (p.ends_on < p.starts_on) return { error: 'The end date is before the start date.' }
  if (p.button_url && !/^(https?:\/\/|\/)/.test(p.button_url)) return { error: 'The button link must start with https:// or /.' }
  if (p.show_banner && !p.banner_text && !p.banner_text_ko) return { error: 'Write the top-bar text, or turn the top bar off.' }
  return { value: p }
}

// Columns as the API returns them: dates as plain YYYY-MM-DD strings rather than
// Date objects that would shift with the server's time zone.
export const PROMO_COLUMNS = `id, slug, title, title_ko, body, body_ko, image_url, button_label, button_label_ko,
  button_url, banner_text, banner_text_ko, to_char(starts_on, 'YYYY-MM-DD') AS starts_on,
  to_char(ends_on, 'YYYY-MM-DD') AS ends_on, audience, show_popup, show_banner, enabled,
  entry_form, entry_screenshot, entry_address, entry_note, entry_note_ko, created_at, updated_at`

// What a visitor's browser needs to show a promotion (nothing admin-only).
export function publicPromotion(p) {
  return {
    id: p.id, slug: p.slug, title: p.title, title_ko: p.title_ko, body: p.body, body_ko: p.body_ko,
    image_url: p.image_url, button_label: p.button_label, button_label_ko: p.button_label_ko,
    button_url: p.button_url, banner_text: p.banner_text, banner_text_ko: p.banner_text_ko,
    starts_on: p.starts_on, ends_on: p.ends_on, show_popup: p.show_popup, show_banner: p.show_banner,
    entry_form: p.entry_form, entry_screenshot: p.entry_screenshot, entry_address: p.entry_address,
    entry_note: p.entry_note, entry_note_ko: p.entry_note_ko,
  }
}

// Pick the Korean or English version of a field, falling back to the other.
export function pick(p, field, locale) {
  const ko = p?.[`${field}_ko`], en = p?.[field]
  return (locale === 'ko' ? ko || en : en || ko) || ''
}
