import { sql } from '@/lib/db'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/email'

export async function GET(request) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return Response.json({ error: 'Token is required' }, { status: 400 })
  }

  try {
    const { rows } = await sql`
      SELECT id, name, email, email_verified, verification_token_expires
      FROM members
      WHERE verification_token = ${token}
    `

    if (!rows.length) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    const member = rows[0]

    if (member.email_verified) {
      return Response.json({ success: true, alreadyVerified: true })
    }

    if (new Date(member.verification_token_expires) < new Date()) {
      return Response.json({ error: 'Token has expired' }, { status: 400 })
    }

    await sql`
      UPDATE members
      SET email_verified = true, verification_token = NULL, verification_token_expires = NULL
      WHERE id = ${member.id}
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error('Verify email error:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Resend verification email
export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    const { rows } = await sql`
      SELECT id, name, email, email_verified FROM members WHERE email = ${email}
    `

    if (!rows.length) {
      // Don't reveal whether email exists
      return Response.json({ success: true })
    }

    const member = rows[0]

    if (member.email_verified) {
      return Response.json({ success: true })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await sql`
      UPDATE members
      SET verification_token = ${verificationToken}, verification_token_expires = ${tokenExpires.toISOString()}
      WHERE id = ${member.id}
    `

    await sendVerificationEmail(member.email, verificationToken, member.name)

    return Response.json({ success: true })
  } catch (error) {
    console.error('Resend verification error:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
