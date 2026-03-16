import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, nameKo, graduationYear, major, location, company, title, bio, birthday, privacyConsent, marketingConsent } = body

    if (!email || !password || !name) {
      return Response.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    if (!privacyConsent) {
      return Response.json({ error: 'Privacy consent is required' }, { status: 400 })
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check if email exists
    const { rows: existing } = await sql`SELECT id FROM members WHERE email = ${email}`
    if (existing.length > 0) {
      return Response.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const now = new Date().toISOString()
    const { rows } = await sql`
      INSERT INTO members (email, password_hash, name, name_ko, graduation_year, major, location, company, title, bio, birthday, email_verified, verification_token, verification_token_expires, privacy_consent, privacy_consent_date, marketing_consent, marketing_consent_date)
      VALUES (${email}, ${passwordHash}, ${name}, ${nameKo || null}, ${graduationYear ? parseInt(graduationYear) : null}, ${major || null}, ${location || null}, ${company || null}, ${title || null}, ${bio || null}, ${birthday || null}, false, ${verificationToken}, ${tokenExpires.toISOString()}, ${true}, ${now}, ${!!marketingConsent}, ${marketingConsent ? now : null})
      RETURNING id, email, name
    `

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, name)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Account is created but email failed — they can request a resend
    }

    return Response.json({ success: true, user: rows[0], message: 'Account created. Please check your email to verify.' })
  } catch (error) {
    console.error('Signup error:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
