import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    membersByMonth,
    membersByYear,
    membersByLocation,
    membersByMajor,
    membershipLevels,
    eventAttendance,
    newsByCategory,
    recentLogins,
    topEvents,
  ] = await Promise.all([
    // Member signups per month (last 12 months)
    sql`
      SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM members
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `,
    // Members by graduation year
    sql`
      SELECT graduation_year AS year, COUNT(*)::int AS count
      FROM members
      WHERE graduation_year IS NOT NULL AND graduation_year != ''
      GROUP BY graduation_year
      ORDER BY graduation_year
    `,
    // Members by location
    sql`
      SELECT COALESCE(NULLIF(location, ''), 'Unknown') AS location, COUNT(*)::int AS count
      FROM members
      GROUP BY location
      ORDER BY count DESC
      LIMIT 10
    `,
    // Members by major
    sql`
      SELECT COALESCE(NULLIF(major, ''), 'Unknown') AS major, COUNT(*)::int AS count
      FROM members
      GROUP BY major
      ORDER BY count DESC
      LIMIT 10
    `,
    // Membership level breakdown
    sql`
      SELECT membership_level AS level,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE is_approved)::int AS approved,
             COUNT(*) FILTER (WHERE NOT is_approved)::int AS pending
      FROM members
      GROUP BY membership_level
    `,
    // Event RSVP counts
    sql`
      SELECT COUNT(DISTINCT event_id)::int AS events_with_rsvps,
             COUNT(*)::int AS total_rsvps,
             COUNT(*) FILTER (WHERE status = 'attending')::int AS attending
      FROM event_rsvps
    `,
    // News articles by category
    sql`
      SELECT category, COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE published)::int AS published,
             COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending
      FROM news
      GROUP BY category
    `,
    // Recent login activity (last 30 days)
    sql`
      SELECT COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '7 days')::int AS last_7d,
             COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '30 days')::int AS last_30d,
             COUNT(*) FILTER (WHERE last_login IS NULL)::int AS never_logged_in,
             COUNT(*)::int AS total
      FROM members
    `,
    // Top events by attendance
    sql`
      SELECT e.id, e.title, e.event_date,
             COUNT(r.id) FILTER (WHERE r.status = 'attending')::int AS attendees
      FROM events e
      LEFT JOIN event_rsvps r ON r.event_id = e.id
      GROUP BY e.id, e.title, e.event_date
      ORDER BY attendees DESC
      LIMIT 5
    `,
  ])

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
}
