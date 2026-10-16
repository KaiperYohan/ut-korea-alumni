// Editable wording for the end-of-year dues notice emails (see lib/duesNotices).
//
// Admins can change, per version, the subject and the Korean and English
// paragraphs from the Dues tab; they are stored in site_settings and fall back to
// the defaults below when left blank. The benefits list, the payment box, the
// transfer tip and the button stay fixed, so an edit cannot break the layout or
// drop the account details.
//
// Text is plain: a blank line starts a new paragraph, **double asterisks** make
// bold, and {placeholders} are filled in per member and per dues year, so the
// same text stays correct every year. Pure — used by the server to send and by
// the admin page to preview.

export const NOTICE_VERSIONS = ['renewal', 'benefits']
export const NOTICE_FIELDS = ['subject', 'ko', 'en']
export const NOTICE_SETTING_PREFIX = 'dues_notice_'
export const noticeSettingKey = (version, field) => `${NOTICE_SETTING_PREFIX}${version}_${field}`

export const PLACEHOLDERS = [
  ['name', "member's name", '김진홍'],
  ['year', 'dues year', '2026–27'],
  ['amount', 'amount in Korean', '50,000원'],
  ['amountEn', 'amount in English', '50,000 KRW'],
  ['deadline', 'pay-by date, Korean', '2026년 12월 31일'],
  ['deadlineEn', 'pay-by date, English', 'December 31, 2026'],
  ['through', 'benefits last until, Korean', '2027년 12월 31일'],
  ['throughEn', 'benefits last until, English', 'December 31, 2027'],
]

export const NOTICE_DEFAULTS = {
  renewal: {
    subject: '[UT Austin 한국 동문회] {year} 정회원 회비 갱신 안내 · Renew your membership',
    ko: '{name}님, 정회원으로 함께해 주셔서 감사합니다.\n\n현재 정회원 자격은 **{deadline}**까지 유지됩니다. {year} 연회비 **{amount}**을 {deadline}까지 납부해 주시면 **{through}**까지 정회원 혜택이 이어집니다. 기한이 지나면 1월 1일부터 일반 회원으로 전환됩니다.',
    en: 'Thank you for being a full member. Your benefits run until **{deadlineEn}**. Pay the {year} dues of **{amountEn}** by then to keep them through **{throughEn}**; otherwise your membership becomes general on January 1.',
  },
  benefits: {
    subject: '[UT Austin 한국 동문회] 정회원 혜택 안내 · Become a full member',
    ko: '{name}님, UT Austin 한국 동문회 회원이 되어 주셔서 감사합니다.\n\n연회비 **{amount}**을 납부하시면 **{through}**까지 정회원으로 아래 혜택을 누리실 수 있습니다.',
    en: 'Pay the annual dues of **{amountEn}** to become a full member through **{throughEn}**, with the benefits listed above.',
  },
}

// Saved wording for one version, with blanks falling back to the default.
export function resolveTemplate(version, settings = {}) {
  const out = {}
  for (const field of NOTICE_FIELDS) {
    const saved = settings[noticeSettingKey(version, field)]
    out[field] = typeof saved === 'string' && saved.trim() ? saved : NOTICE_DEFAULTS[version][field]
  }
  return out
}

// Placeholders in `text` that are not recognised, so the editor can warn before
// "{nmae}" goes out to two hundred people.
export function unknownPlaceholders(text) {
  const known = new Set(PLACEHOLDERS.map(p => p[0]))
  return [...new Set([...String(text || '').matchAll(/\{([^{}\s]+)\}/g)].map(m => m[1]).filter(k => !known.has(k)))]
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const krDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${y}년 ${m}월 ${d}일` }
const enDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

export function placeholderValues(name, { duesYear, amount, deadline, paidThrough }) {
  return {
    name: name || '',
    year: `${duesYear}–${String(duesYear + 1).slice(2)}`,
    amount: `${Number(amount).toLocaleString('ko-KR')}원`,
    amountEn: `${Number(amount).toLocaleString('en-US')} KRW`,
    deadline: krDate(deadline),
    deadlineEn: enDate(deadline),
    through: krDate(paidThrough),
    throughEn: enDate(paidThrough),
  }
}

// Escapes first, so neither the admin's text nor a member's name can inject
// markup; then fills placeholders (escaped too) and applies **bold**.
const fill = (text, vals, escapeValues) =>
  text.replace(/\{([^{}\s]+)\}/g, (m, k) => (k in vals ? (escapeValues ? esc(vals[k]) : vals[k]) : m))
const inline = (text, vals) => fill(esc(text), vals, true).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
export const renderParagraphs = (text, vals) =>
  String(text || '').trim().split(/\n\s*\n/).map(p => `<p>${inline(p.trim(), vals)}</p>`).join('\n')
export const renderSubject = (text, vals) => fill(String(text || ''), vals, false).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()

const ACCOUNT = { bank: '토스뱅크', bankEn: 'Toss Bank', number: '1001-8306-7179', holder: '장우진 (모임통장)' }
const BENEFITS = [
  ['Alumni Directory 열람', 'Access to the Alumni Directory'],
  ['각종 행사 우선 등록 및 할인', 'Priority registration and discounts for events'],
  ['멘토링·리크루팅 프로그램 우선 참여', 'Priority access to mentoring and recruiting programs'],
  ['동문 네트워크를 통한 회사·제품 홍보 가능', 'Promote your company or product to the alumni network'],
]

export function duesNoticeContent(version, name, ctx, template = resolveTemplate(version), baseUrl = 'https://www.utkorea.org') {
  const vals = placeholderValues(name, ctx)
  const renewal = version === 'renewal'
  const benefits = `<ul style="margin:12px 0;padding-left:20px;color:#333;font-size:15px;line-height:1.7">${BENEFITS.map(([k, e]) => `<li>${k} <span style="color:#888">· ${e}</span></li>`).join('')}</ul>`
  const payment = `
    <table role="presentation" style="width:100%;background:#FAF6F1;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:14px;color:#333">
      <tr><td style="padding:3px 0;color:#888;width:96px">은행 Bank</td><td>${ACCOUNT.bank} · ${ACCOUNT.bankEn}</td></tr>
      <tr><td style="padding:3px 0;color:#888">계좌 Account</td><td style="font-family:monospace;font-size:15px;font-weight:600">${ACCOUNT.number}</td></tr>
      <tr><td style="padding:3px 0;color:#888">예금주 Holder</td><td>${ACCOUNT.holder}</td></tr>
      <tr><td style="padding:3px 0;color:#888">금액 Amount</td><td style="font-weight:600">${vals.amount} · ${vals.amountEn}</td></tr>
      <tr><td style="padding:3px 0;color:#888">입금자명 Memo</td><td>이름 + 졸업연도 (예: 홍길동09) · name + class year</td></tr>
    </table>`
  const autoTip = `
    <p style="font-size:14px;color:#555;line-height:1.6;background:#FFF7ED;border-left:3px solid #BF5700;padding:10px 12px;margin:16px 0">
      <strong>매년 잊지 않도록</strong> 사용하시는 은행 앱에서 매년 10월 1일 위 계좌로 <strong>예약이체</strong>(또는 자동이체)를 등록해 두시면 갱신을 놓치지 않으실 수 있습니다.<br>
      <span style="color:#888">Tip: schedule a transfer to this account every October 1 in your banking app so you never miss a renewal.</span>
    </p>`
  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:36px 20px;color:#333">
      <h1 style="color:#BF5700;font-size:22px;margin:0 0 24px;text-align:center">UT Austin Korea Alumni</h1>
      <div style="font-size:15px;line-height:1.7">${renderParagraphs(template.ko, vals)}</div>
      ${benefits}
      <div style="font-size:15px;line-height:1.7;color:#555">${renderParagraphs(template.en, vals)}</div>
      ${payment}
      ${autoTip}
      <div style="text-align:center;margin:28px 0">
        <a href="${baseUrl}/dues" style="background:#BF5700;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">${renewal ? '회비 납부 안내 · Renew' : '정회원 가입 · Join'}</a>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.6">이미 납부하셨다면 반영까지 며칠이 걸릴 수 있으니 이 메일은 무시해 주세요. · Already paid? It can take a few days to be recorded.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;text-align:center">UT Austin Korea Alumni Association<br>Hook 'em, Horns! 🤘</p>
    </div>`
  return { subject: renderSubject(template.subject, vals), html }
}
