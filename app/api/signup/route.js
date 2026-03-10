import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, nameKo, graduationYear, major, location, company, title, bio } = body

    if (!email || !password || !name) {
      return Response.json({ error: 'Email, password, and name are required' }, { status: 400 })
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

    const { rows } = await sql`
      INSERT INTO members (email, password_hash, name, name_ko, graduation_year, major, location, company, title, bio)
      VALUES (${email}, ${passwordHash}, ${name}, ${nameKo || null}, ${graduationYear ? parseInt(graduationYear) : null}, ${major || null}, ${location || null}, ${company || null}, ${title || null}, ${bio || null})
      RETURNING id, email, name
    `

    return Response.json({ success: true, user: rows[0], message: 'Account created. Pending admin approval.' })
  } catch (error) {
    console.error('Signup error:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
