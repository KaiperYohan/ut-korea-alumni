import crypto from 'crypto'
import { sql } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    const { rows } = await sql`
      SELECT id, name, email FROM members WHERE lower(email) = ${String(email).trim().toLowerCase()}
    `

    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return Response.json({ success: true })
    }

    const member = rows[0]
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await sql`
      UPDATE members
      SET password_reset_token = ${token},
          password_reset_token_expires = ${expires.toISOString()}
      WHERE id = ${member.id}
    `

    try {
      await sendPasswordResetEmail(member.email, token, member.name)
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr)
      return Response.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
