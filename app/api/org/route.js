import { sql } from '@/lib/db'

export async function GET() {
  try {
    // Only active members are listed. A position held by someone expelled,
    // resigned, or otherwise inactive is dropped rather than rendered as a name
    // pointing at a profile the member API refuses to serve.
    const { rows } = await sql`
      SELECT op.id, op.committee, op.role, op.member_id, op.sort_order,
             m.name, m.name_ko, m.profile_image_url, m.graduation_year, m.major, m.company, m.title
      FROM org_positions op
      JOIN members m ON op.member_id = m.id
      WHERE m.is_approved = true
      ORDER BY op.committee, op.sort_order, op.role
    `
    return Response.json({ positions: rows })
  } catch (error) {
    console.error('Org positions error:', error)
    return Response.json({ positions: [] })
  }
}
