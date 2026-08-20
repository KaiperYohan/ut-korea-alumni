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

    // News comments table
    await sql`
      CREATE TABLE IF NOT EXISTS news_comments (
        id SERIAL PRIMARY KEY,
        news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
        member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
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

    // Past presidents table
    await sql`
      CREATE TABLE IF NOT EXISTS past_presidents (
        id SERIAL PRIMARY KEY,
        member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
        term_start INTEGER NOT NULL,
        term_end INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `

    // Teams table (admin-editable: orchestra, golf, running crew, etc.)
    // Member assignments live in org_positions with committee = teams.key,
    // role = 'leader' or 'member'.
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        key VARCHAR(50) UNIQUE NOT NULL,
        name_en VARCHAR(200) NOT NULL,
        name_ko VARCHAR(200),
        description_en TEXT,
        description_ko TEXT,
        leader_label_en VARCHAR(100) NOT NULL DEFAULT 'Leader',
        leader_label_ko VARCHAR(100),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Seed initial teams (idempotent — only runs when table is empty)
    const { rows: teamCount } = await sql`SELECT COUNT(*)::int AS n FROM teams`
    if (teamCount[0]?.n === 0) {
      await sql`
        INSERT INTO teams (key, name_en, name_ko, leader_label_en, leader_label_ko, sort_order)
        VALUES
          ('orchestra', 'Longhorn Orchestra', '롱혼 오케스트라', 'Director', '단장', 0),
          ('golf', 'Golf Team', '골프 팀', 'Captain', '주장', 1),
          ('running_crew', 'Running Crew', '러닝 크루', 'Crew Leader', '크루 리더', 2)
      `
    }

    // Seed past presidents (idempotent — only runs when table is empty)
    const { rows: ppCount } = await sql`SELECT COUNT(*)::int AS n FROM past_presidents`
    if (ppCount[0]?.n === 0) {
      await sql`
        INSERT INTO past_presidents (member_id, term_start, term_end, sort_order)
        SELECT id, 2015, 2019, 0 FROM members WHERE id = 135
      `
      await sql`
        INSERT INTO past_presidents (member_id, term_start, term_end, sort_order)
        SELECT id, 2020, 2024, 1 FROM members WHERE id = 36
      `
    }

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
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS status VARCHAR(20)`

    // Backfill status from the old approved/pending boolean. Only touches rows
    // that have never been given a status, so it is safe to re-run.
    await sql`
      UPDATE members
      SET status = CASE WHEN is_approved THEN 'active' ELSE 'pending' END
      WHERE status IS NULL
    `
    await sql`ALTER TABLE members ALTER COLUMN status SET DEFAULT 'pending'`

    // Auto-verify existing approved members
    await sql`UPDATE members SET email_verified = true WHERE is_approved = true AND email_verified = false`

    // Add columns to events (idempotent)
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS external_url TEXT`
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT`
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS time_tba BOOLEAN DEFAULT false`
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS location_tba BOOLEAN DEFAULT false`
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS attendee_override INTEGER`
    // Convert event_date/end_date to TEXT so the exact entered value is preserved (no timezone shifting)
    // Only convert if columns are still timestamp type (idempotent)
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'events' AND column_name = 'event_date'
            AND data_type != 'text'
        ) THEN
          ALTER TABLE events ALTER COLUMN event_date TYPE TEXT
            USING to_char(event_date AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD"T"HH24:MI');
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'events' AND column_name = 'end_date'
            AND data_type != 'text'
        ) THEN
          ALTER TABLE events ALTER COLUMN end_date TYPE TEXT
            USING to_char(end_date AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD"T"HH24:MI');
        END IF;
      END $$
    `

    // Add columns to news (idempotent)
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'news'`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS subcategory VARCHAR(30)`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved'`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS external_url TEXT`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS external_url_ko TEXT`
    await sql`ALTER TABLE news ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0`

    // Migrate old 'news' category to 'sxsk'
    await sql`UPDATE news SET category = 'sxsk' WHERE category = 'news'`

    return Response.json({ success: true, message: 'All tables created successfully' })
  } catch (error) {
    console.error('DB init error:', error)
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
