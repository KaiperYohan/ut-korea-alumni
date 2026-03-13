import { sql } from '@/lib/db'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const authQuery = request.nextUrl.searchParams.get('Authorization')
  const isAuthorized = authHeader === `Bearer ${process.env.ADMIN_SECRET}` || authQuery === `Bearer ${process.env.ADMIN_SECRET}`

  if (!isAuthorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Members table
    await sql`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        name_ko VARCHAR(100),
        graduation_year INTEGER,
        major VARCHAR(200),
        location VARCHAR(200),
        company VARCHAR(200),
        title VARCHAR(200),
        bio TEXT,
        profile_image_url TEXT,
        is_admin BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT false,
        membership_level VARCHAR(20) DEFAULT 'general',
        email_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `

    // Add email verification columns to existing tables
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP`

    // Add membership level column to existing tables
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_level VARCHAR(20) DEFAULT 'general'`

    // Add birthday column (MMDD format for annual matching)
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS birthday VARCHAR(6)`

    // Add phone number column
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`

    // Add password reset columns
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP`

    // Auto-verify existing approved members so they aren't locked out
    await sql`UPDATE members SET email_verified = true WHERE is_approved = true AND email_verified = false`

    // Add news category and approval columns
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'news'`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS subcategory VARCHAR(30)`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved'`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS external_url TEXT`

    // Events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        title_ko VARCHAR(300),
        description TEXT,
        description_ko TEXT,
        event_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        location VARCHAR(300),
        location_ko VARCHAR(300),
        image_url TEXT,
        max_attendees INTEGER,
        created_by INTEGER REFERENCES members(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Event RSVPs table
    await sql`
      CREATE TABLE IF NOT EXISTS event_rsvps (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'attending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(event_id, member_id)
      )
    `

    // News table
    await sql`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        title_ko VARCHAR(300),
        content TEXT NOT NULL,
        content_ko TEXT,
        author_id INTEGER REFERENCES members(id),
        image_url TEXT,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    return Response.json({ success: true, message: 'All tables created successfully' })
  } catch (error) {
    console.error('DB init error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
