import { sql } from '@/lib/db'
import { HISTORY_EXCLUDED_STATUSES } from '@/lib/memberStatus'

export async function GET() {
  try {
    // Serving as president is a matter of record, so resigned, lapsed, and
    // deceased members stay listed. Only the expelled are removed.
    const { rows } = await sql`
      SELECT pp.id, pp.member_id, pp.term_start, pp.term_end, pp.sort_order,
             m.name, m.name_ko, m.profile_image_url, m.graduation_year, m.major, m.company, m.title
      FROM past_presidents pp
      LEFT JOIN members m ON pp.member_id = m.id
      WHERE m.status IS NULL OR NOT (m.status = ANY(${HISTORY_EXCLUDED_STATUSES}))
      ORDER BY pp.sort_order, pp.term_start
    `
    return Response.json({ pastPresidents: rows })
  } catch (error) {
    // Before /api/init-db adds the status column the filter above is invalid.
    // Fall back to the unfiltered list rather than hiding every past president.
    console.error('Past presidents query failed, retrying without status filter:', error.message)
    try {
      const { rows } = await sql`
        SELECT pp.id, pp.member_id, pp.term_start, pp.term_end, pp.sort_order,
               m.name, m.name_ko, m.profile_image_url, m.graduation_year, m.major, m.company, m.title
        FROM past_presidents pp
        LEFT JOIN members m ON pp.member_id = m.id
        ORDER BY pp.sort_order, pp.term_start
      `
      return Response.json({ pastPresidents: rows })
    } catch (fallbackError) {
      console.error('Past presidents error:', fallbackError)
      return Response.json({ pastPresidents: [] })
    }
  }
}
