import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function safeQuery(name, queryFn) {
  try {
    const result = await queryFn()
    return result
  } catch (err) {
    console.error(`Analytics query "${name}" failed:`, err.message)
    throw new Error(`Query "${name}" failed: ${err.message}`)
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const signupsByWeek = await safeQuery('signupsByWeek', () => sql`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week, COUNT(*) AS count
      FROM members
      WHERE created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY date_trunc('week', created_at)
      ORDER BY week
    `)

    const profileCompleteness = await safeQuery('profileCompleteness', () => sql`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN name_ko IS NOT NULL AND name_ko != '' THEN 1 ELSE 0 END) AS has_name_ko,
        SUM(CASE WHEN graduation_year IS NOT NULL THEN 1 ELSE 0 END) AS has_grad_year,
        SUM(CASE WHEN major IS NOT NULL AND major != '' THEN 1 ELSE 0 END) AS has_major,
        SUM(CASE WHEN location IS NOT NULL AND location != '' THEN 1 ELSE 0 END) AS has_location,
        SUM(CASE WHEN company IS NOT NULL AND company != '' THEN 1 ELSE 0 END) AS has_company,
        SUM(CASE WHEN title IS NOT NULL AND title != '' THEN 1 ELSE 0 END) AS has_title,
        SUM(CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 ELSE 0 END) AS has_bio,
        SUM(CASE WHEN profile_image_url IS NOT NULL AND profile_image_url != '' THEN 1 ELSE 0 END) AS has_photo
      FROM members
    `)

    const membersByYear = await safeQuery('membersByYear', () => sql`
      SELECT CAST(graduation_year AS TEXT) AS year, COUNT(*) AS count
      FROM members
      WHERE graduation_year IS NOT NULL
      GROUP BY graduation_year
      ORDER BY graduation_year
    `)

    const membersByLocation = await safeQuery('membersByLocation', () => sql`
      SELECT COALESCE(NULLIF(location, ''), 'Unknown') AS location, COUNT(*) AS count
      FROM members
      GROUP BY COALESCE(NULLIF(location, ''), 'Unknown')
      ORDER BY count DESC
      LIMIT 10
    `)

    const membersByMajor = await safeQuery('membersByMajor', () => sql`
      SELECT COALESCE(NULLIF(major, ''), 'Unknown') AS major, COUNT(*) AS count
      FROM members
      GROUP BY COALESCE(NULLIF(major, ''), 'Unknown')
      ORDER BY count DESC
      LIMIT 10
    `)

    const membershipLevels = await safeQuery('membershipLevels', () => sql`
      SELECT membership_level AS level,
             COUNT(*) AS total,
             SUM(CASE WHEN is_approved = true THEN 1 ELSE 0 END) AS approved,
             SUM(CASE WHEN is_approved = false THEN 1 ELSE 0 END) AS pending
      FROM members
      GROUP BY membership_level
    `)

    const eventAttendance = await safeQuery('eventAttendance', () => sql`
      SELECT COUNT(DISTINCT event_id) AS events_with_rsvps,
             COUNT(*) AS total_rsvps,
             SUM(CASE WHEN status = 'attending' THEN 1 ELSE 0 END) AS attending
      FROM event_rsvps
    `)

    const newsByCategory = await safeQuery('newsByCategory', () => sql`
      SELECT category, COUNT(*) AS count,
             SUM(CASE WHEN published = true THEN 1 ELSE 0 END) AS published,
             SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending
      FROM news
      GROUP BY category
    `)

    const recentLogins = await safeQuery('recentLogins', () => sql`
      SELECT SUM(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) AS last_7d,
             SUM(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) AS last_30d,
             SUM(CASE WHEN last_login IS NULL THEN 1 ELSE 0 END) AS never_logged_in,
             COUNT(*) AS total
      FROM members
    `)

    const topEvents = await safeQuery('topEvents', () => sql`
      SELECT e.id, e.title, e.event_date,
             SUM(CASE WHEN r.status = 'attending' THEN 1 ELSE 0 END) AS attendees
      FROM events e
      LEFT JOIN event_rsvps r ON r.event_id = e.id
      GROUP BY e.id, e.title, e.event_date
      ORDER BY SUM(CASE WHEN r.status = 'attending' THEN 1 ELSE 0 END) DESC
      LIMIT 5
    `)

    return Response.json({
      signupsByWeek: signupsByWeek.rows,
      profileCompleteness: profileCompleteness.rows[0] || {},
      membersByYear: membersByYear.rows,
      membersByLocation: membersByLocation.rows,
      membersByMajor: membersByMajor.rows,
      membershipLevels: membershipLevels.rows,
      eventAttendance: eventAttendance.rows[0] || {},
      newsByCategory: newsByCategory.rows,
      recentLogins: recentLogins.rows[0] || {},
      topEvents: topEvents.rows,
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return Response.json({ error: err.message || 'Failed to load analytics' }, { status: 500 })
  }
}
