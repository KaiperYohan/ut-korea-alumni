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
    const membersByMonth = await safeQuery('membersByMonth', () => sql`
      SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
      FROM members
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month
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
      membersByMonth: membersByMonth.rows,
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
