import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run sequentially to avoid overwhelming Neon free tier
    const membersByMonth = await sql`
      SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM members
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month
    `

    const membersByYear = await sql`
      SELECT graduation_year AS year, COUNT(*)::int AS count
      FROM members
      WHERE graduation_year IS NOT NULL AND graduation_year != ''
      GROUP BY graduation_year
      ORDER BY graduation_year
    `

    const membersByLocation = await sql`
      SELECT COALESCE(NULLIF(location, ''), 'Unknown') AS location, COUNT(*)::int AS count
      FROM members
      GROUP BY COALESCE(NULLIF(location, ''), 'Unknown')
      ORDER BY count DESC
      LIMIT 10
    `

    const membersByMajor = await sql`
      SELECT COALESCE(NULLIF(major, ''), 'Unknown') AS major, COUNT(*)::int AS count
      FROM members
      GROUP BY COALESCE(NULLIF(major, ''), 'Unknown')
      ORDER BY count DESC
      LIMIT 10
    `

    const membershipLevels = await sql`
      SELECT membership_level AS level,
             COUNT(*)::int AS total,
             SUM(CASE WHEN is_approved THEN 1 ELSE 0 END)::int AS approved,
             SUM(CASE WHEN NOT is_approved THEN 1 ELSE 0 END)::int AS pending
      FROM members
      GROUP BY membership_level
    `

    const eventAttendance = await sql`
      SELECT COUNT(DISTINCT event_id)::int AS events_with_rsvps,
             COUNT(*)::int AS total_rsvps,
             SUM(CASE WHEN status = 'attending' THEN 1 ELSE 0 END)::int AS attending
      FROM event_rsvps
    `

    const newsByCategory = await sql`
      SELECT category, COUNT(*)::int AS count,
             SUM(CASE WHEN published THEN 1 ELSE 0 END)::int AS published,
             SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END)::int AS pending
      FROM news
      GROUP BY category
    `

    const recentLogins = await sql`
      SELECT SUM(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::int AS last_7d,
             SUM(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)::int AS last_30d,
             SUM(CASE WHEN last_login IS NULL THEN 1 ELSE 0 END)::int AS never_logged_in,
             COUNT(*)::int AS total
      FROM members
    `

    const topEvents = await sql`
      SELECT e.id, e.title, e.event_date,
             SUM(CASE WHEN r.status = 'attending' THEN 1 ELSE 0 END)::int AS attendees
      FROM events e
      LEFT JOIN event_rsvps r ON r.event_id = e.id
      GROUP BY e.id, e.title, e.event_date
      ORDER BY attendees DESC
      LIMIT 5
    `

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
    console.error('Analytics query error:', err)
    return Response.json({ error: err.message || 'Failed to load analytics' }, { status: 500 })
  }
}
