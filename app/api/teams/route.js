import { sql } from '@/lib/db'

export async function GET() {
  try {
    const { rows: teams } = await sql`
      SELECT id, key, name_en, name_ko, description_en, description_ko,
             leader_label_en, leader_label_ko, sort_order
      FROM teams
      ORDER BY sort_order, id
    `

    if (teams.length === 0) {
      return Response.json({ teams: [] })
    }

    // Only active members are listed; see the org route for the same reason.
    const teamKeys = teams.map(t => t.key)
    const { rows: positions } = await sql`
      SELECT op.id, op.committee, op.role, op.member_id, op.sort_order,
             m.name, m.name_ko, m.profile_image_url, m.graduation_year, m.major, m.company, m.title
      FROM org_positions op
      JOIN members m ON op.member_id = m.id
      WHERE op.committee = ANY(${teamKeys}) AND m.is_approved = true
      ORDER BY op.sort_order, op.role
    `

    const teamsWithMembers = teams.map(t => ({
      ...t,
      leader: positions.find(p => p.committee === t.key && p.role === 'leader') || null,
      members: positions.filter(p => p.committee === t.key && p.role === 'member'),
    }))

    return Response.json({ teams: teamsWithMembers })
  } catch (error) {
    console.error('Teams error:', error)
    return Response.json({ teams: [] })
  }
}
