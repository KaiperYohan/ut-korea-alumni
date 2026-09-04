import { Resend } from 'resend'

let resend

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function sendPasswordResetEmail(email, token, name) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  await getResend().emails.send({
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

  await getResend().emails.send({
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

// Reminder that the dues deadline is approaching. Sent in December to members
// with no payment recorded for the open dues year; they lapse to general
// benefits on Jan 1 if it stays unpaid.
export async function sendDuesReminderEmail(email, name, { duesYear, amount, deadline, lapseDate }) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const duesUrl = `${baseUrl}/dues`
  const label = `${duesYear}–${String(duesYear + 1).slice(2)}`
  const formattedAmount = `${amount.toLocaleString('en-US')} KRW`

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || 'UT Korea Alumni <noreply@utkorea.org>',
    to: email,
    subject: `Annual dues reminder — due ${deadline}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #BF5700; font-size: 24px; margin: 0;">UT Austin Korea Alumni</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">
          We don't have a record of your ${label} annual dues yet. Dues are
          <strong>${formattedAmount}</strong> and are due by <strong>${deadline}</strong>.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">
          If they remain unpaid, your full member benefits — including the alumni
          directory — end on ${lapseDate}. You can restore them any time by paying.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${duesUrl}" style="background-color: #BF5700; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Payment Details
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Already paid? It may not have been recorded yet — please reply and let us know.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          UT Austin Korea Alumni Association<br/>Hook 'em, Horns! 🤘
        </p>
      </div>
    `,
  })
}
