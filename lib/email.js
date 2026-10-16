import { Resend } from 'resend'

let resend

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// Resend's SDK does not throw when a send fails — it resolves with { error } —
// so a rejected or rate-limited email used to look sent. This throws instead,
// carrying the HTTP status so callers can tell a daily limit (429) from a bad
// address.
async function send(message, options) {
  const { data, error } = await getResend().emails.send(message, options)
  if (error) {
    const err = new Error(error.message || 'Email send failed')
    err.statusCode = error.statusCode
    err.name = error.name || 'EmailError'
    throw err
  }
  return data
}

export async function sendPasswordResetEmail(email, token, name) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  await send({
    from: process.env.EMAIL_FROM || 'UT Korea Alumni <noreply@utkorea.org>',
    to: email,
    subject: 'Reset your password — UT Austin Korea Alumni',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #BF5700; font-size: 24px; margin: 0;">UT Austin Korea Alumni</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">
          We received a request to reset your password. Click the button below to set a new password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #BF5700; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          UT Austin Korea Alumni Association<br/>Hook 'em, Horns! 🤘
        </p>
      </div>
    `,
  })
}

export async function sendVerificationEmail(email, token, name) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`

  await send({
    from: process.env.EMAIL_FROM || 'UT Korea Alumni <noreply@utkorea.org>',
    to: email,
    subject: 'Verify your email — UT Austin Korea Alumni',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #BF5700; font-size: 24px; margin: 0;">UT Austin Korea Alumni</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">
          Thank you for joining the UT Austin Korea Alumni network. Please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #BF5700; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          This link expires in 24 hours. If you didn't create an account, you can ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          UT Austin Korea Alumni Association<br/>Hook 'em, Horns! 🤘
        </p>
      </div>
    `,
  })
}

// End-of-year dues notice (see lib/duesNotices). Korean first, English below, since
// both languages are in use across the membership.
//   version 'renewal'  — full member who has not renewed for the open dues year
//   version 'benefits' — general member, told what full membership offers
const ACCOUNT = { bank: '토스뱅크', bankEn: 'Toss Bank', number: '1001-8306-7179', holder: '장우진 (모임통장)', holderEn: 'Jang Woojin (Association Account)' }
const BENEFITS = [
  ['Alumni Directory 열람', 'Access to the Alumni Directory'],
  ['각종 행사 우선 등록 및 할인', 'Priority registration and discounts for events'],
  ['멘토링·리크루팅 프로그램 우선 참여', 'Priority access to mentoring and recruiting programs'],
  ['동문 네트워크를 통한 회사·제품 홍보 가능', 'Promote your company or product to the alumni network'],
]

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const krDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${y}년 ${m}월 ${d}일` }
const enDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

export function duesNoticeContent(version, name, { duesYear, amount, deadline, paidThrough }) {
  const label = `${duesYear}–${String(duesYear + 1).slice(2)}`
  const won = `${Number(amount).toLocaleString('ko-KR')}원`
  const krw = `${Number(amount).toLocaleString('en-US')} KRW`
  const renewal = version === 'renewal'
  const subject = renewal
    ? `[UT Austin 한국 동문회] ${label} 정회원 회비 갱신 안내 · Renew your membership`
    : `[UT Austin 한국 동문회] 정회원 혜택 안내 · Become a full member`

  const ko = renewal
    ? `<p>${esc(name)}님, 정회원으로 함께해 주셔서 감사합니다.</p>
       <p>현재 정회원 자격은 <strong>${krDate(deadline)}</strong>까지 유지됩니다. ${label} 연회비 <strong>${won}</strong>을 ${krDate(deadline)}까지 납부해 주시면 <strong>${krDate(paidThrough)}</strong>까지 정회원 혜택이 이어집니다. 기한이 지나면 1월 1일부터 일반 회원으로 전환됩니다.</p>`
    : `<p>${esc(name)}님, UT Austin 한국 동문회 회원이 되어 주셔서 감사합니다.</p>
       <p>연회비 <strong>${won}</strong>을 납부하시면 <strong>${krDate(paidThrough)}</strong>까지 정회원으로 아래 혜택을 누리실 수 있습니다.</p>`
  const en = renewal
    ? `<p>Thank you for being a full member. Your benefits run until <strong>${enDate(deadline)}</strong>. Pay the ${label} dues of <strong>${krw}</strong> by then to keep them through <strong>${enDate(paidThrough)}</strong>; otherwise your membership becomes general on January 1.</p>`
    : `<p>Pay the annual dues of <strong>${krw}</strong> to become a full member through <strong>${enDate(paidThrough)}</strong>, with the benefits listed above.</p>`

  const benefits = `<ul style="margin:12px 0;padding-left:20px;color:#333;font-size:15px;line-height:1.7">${BENEFITS.map(([k, e]) => `<li>${k} <span style="color:#888">· ${e}</span></li>`).join('')}</ul>`
  const payment = `
    <table role="presentation" style="width:100%;background:#FAF6F1;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:14px;color:#333">
      <tr><td style="padding:3px 0;color:#888;width:96px">은행 Bank</td><td>${ACCOUNT.bank} · ${ACCOUNT.bankEn}</td></tr>
      <tr><td style="padding:3px 0;color:#888">계좌 Account</td><td style="font-family:monospace;font-size:15px;font-weight:600">${ACCOUNT.number}</td></tr>
      <tr><td style="padding:3px 0;color:#888">예금주 Holder</td><td>${ACCOUNT.holder}</td></tr>
      <tr><td style="padding:3px 0;color:#888">금액 Amount</td><td style="font-weight:600">${won} · ${krw}</td></tr>
      <tr><td style="padding:3px 0;color:#888">입금자명 Memo</td><td>이름 + 졸업연도 (예: 홍길동09) · name + class year</td></tr>
    </table>`
  const autoTip = `
    <p style="font-size:14px;color:#555;line-height:1.6;background:#FFF7ED;border-left:3px solid #BF5700;padding:10px 12px;margin:16px 0">
      <strong>매년 잊지 않도록</strong> 사용하시는 은행 앱에서 매년 10월 1일 위 계좌로 <strong>예약이체</strong>(또는 자동이체)를 등록해 두시면 갱신을 놓치지 않으실 수 있습니다.<br>
      <span style="color:#888">Tip: schedule a transfer to this account every October 1 in your banking app so you never miss a renewal.</span>
    </p>`

  const baseUrl = process.env.NEXTAUTH_URL || 'https://www.utkorea.org'
  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:36px 20px;color:#333">
      <h1 style="color:#BF5700;font-size:22px;margin:0 0 24px;text-align:center">UT Austin Korea Alumni</h1>
      <div style="font-size:15px;line-height:1.7">${ko}</div>
      ${benefits}
      <div style="font-size:15px;line-height:1.7;color:#555">${en}</div>
      ${payment}
      ${autoTip}
      <div style="text-align:center;margin:28px 0">
        <a href="${baseUrl}/dues" style="background:#BF5700;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">${renewal ? '회비 납부 안내 · Renew' : '정회원 가입 · Join'}</a>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.6">이미 납부하셨다면 반영까지 며칠이 걸릴 수 있으니 이 메일은 무시해 주세요. · Already paid? It can take a few days to be recorded.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;text-align:center">UT Austin Korea Alumni Association<br>Hook 'em, Horns! 🤘</p>
    </div>`
  return { subject, html }
}

export async function sendDuesNoticeEmail(email, name, { version, idempotencyKey, ...ctx }) {
  const { subject, html } = duesNoticeContent(version, name, ctx)
  await send(
    { from: process.env.EMAIL_FROM || 'UT Korea Alumni <noreply@utkorea.org>', to: email, subject, html },
    // A retried run never sends the same member the same campaign twice.
    idempotencyKey ? { idempotencyKey } : undefined,
  )
}
