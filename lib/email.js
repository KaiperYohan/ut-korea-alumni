import { Resend } from 'resend'
import { duesNoticeContent, resolveTemplate } from '@/lib/duesNoticeTemplate'

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

// End-of-year dues notice. The wording lives in lib/duesNoticeTemplate, editable
// from the admin Dues tab; `template` is the saved wording for this version.
export async function sendDuesNoticeEmail(email, name, { version, template, idempotencyKey, ...ctx }) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://www.utkorea.org'
  const { subject, html } = duesNoticeContent(version, name, ctx, template || resolveTemplate(version), baseUrl)
  await send(
    { from: process.env.EMAIL_FROM || 'UT Korea Alumni <noreply@utkorea.org>', to: email, subject, html },
    // A retried run never sends the same member the same campaign twice.
    idempotencyKey ? { idempotencyKey } : undefined,
  )
}
