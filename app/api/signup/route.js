import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/email'
import { validateBirthday } from '@/lib/birthday'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, nameKo, graduationYear, major, location, company, title, bio, birthday, phone, privacyConsent, marketingConsent } = body

    if (!email || !password || !name || !phone) {
      return Response.json({ error: 'Email, password, name, and phone are required' }, { status: 400 })
    }

    if (!privacyConsent) {
      return Response.json({ error: 'Privacy consent is required' }, { status: 400 })
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const birthdayCheck = validateBirthday(birthday)
    if (!birthdayCheck.ok) {
      return Response.json({ error: birthdayCheck.error }, { status: 400 })
    }

    // Emails are stored lowercase and compared case-insensitively. A plain
    // equality check let "Foo@x.com" and "foo@x.com" register as two people, and
    // a member stored in capitals could only sign in by typing them exactly.
    const normalizedEmail = String(email).trim().toLowerCase()
    const { rows: existing } = await sql`SELECT id FROM members WHERE lower(email) = ${normalizedEmail}`
    if (existing.length > 0) {
      return Response.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const now = new Date().toISOString()
    // New members wait for an admin to approve them: status 'pending' means
    // "signed up, awaiting review", and is_approved stays false until then so they
    // are not listed in the directory or org chart before anyone has looked. This
    // used to insert is_approved = true with status left at its 'pending' default,
    // so an unreviewed signup was already public while the admin list called it
    // pending. Pending members can still sign in.
    const { rows } = await sql`
      INSERT INTO members (email, password_hash, name, name_ko, graduation_year, major, location, company, title, bio, birthday, phone, is_approved, status, email_verified, verification_token, verification_token_expires, privacy_consent, privacy_consent_date, marketing_consent, marketing_consent_date)
      VALUES (${normalizedEmail}, ${passwordHash}, ${String(name).trim()}, ${nameKo?.trim() || null}, ${graduationYear ? parseInt(graduationYear) : null}, ${major || null}, ${location || null}, ${company || null}, ${title || null}, ${bio || null}, ${birthdayCheck.value}, ${String(phone).trim()}, false, 'pending', false, ${verificationToken}, ${tokenExpires.toISOString()}, ${true}, ${now}, ${!!marketingConsent}, ${marketingConsent ? now : null})
      RETURNING id, email, name
    `

    // Send verification email
    try {
      await sendVerificationEmail(normalizedEmail, verificationToken, name)
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
