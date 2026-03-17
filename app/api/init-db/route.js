import { sql } from '@/lib/db'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const authHeader = request.headers.get('authorization')
    const authQuery = url.searchParams.get('Authorization')
    const secret = process.env.ADMIN_SECRET

    if (!secret) {
      return Response.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 })
    }

    const isAuthorized = authHeader === `Bearer ${secret}` || authQuery === `Bearer ${secret}`

    if (!isAuthorized) {
      return Response.json({ error: 'Unauthorized', hint: 'Pass ?Authorization=Bearer <secret>' }, { status: 401 })
    }
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

    // Organization positions table
    await sql`
      CREATE TABLE IF NOT EXISTS org_positions (
        id SERIAL PRIMARY KEY,
        committee VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
        sort_order INTEGER DEFAULT 0
      )
    `

    // Site settings table
    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Add columns to members (idempotent)
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_level VARCHAR(20) DEFAULT 'general'`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS birthday VARCHAR(6)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS instagram VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS youtube VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS twitter VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS interests TEXT`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT false`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS privacy_consent_date TIMESTAMP`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS marketing_consent_date TIMESTAMP`

    // Auto-verify existing approved members
    await sql`UPDATE members SET email_verified = true WHERE is_approved = true AND email_verified = false`

    // Add columns to events (idempotent)
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS external_url TEXT`
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT`
    // Convert event_date/end_date to TIMESTAMPTZ so timezone offsets are preserved
    await sql`ALTER TABLE events ALTER COLUMN event_date TYPE TIMESTAMPTZ USING event_date AT TIME ZONE 'Asia/Seoul'`
    await sql`ALTER TABLE events ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date AT TIME ZONE 'Asia/Seoul'`

    // Add columns to news (idempotent)
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'news'`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS subcategory VARCHAR(30)`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved'`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS external_url TEXT`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS external_url_ko TEXT`

    return Response.json({ success: true, message: 'All tables created successfully' })
  } catch (error) {
    console.error('DB init error:', error)
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
