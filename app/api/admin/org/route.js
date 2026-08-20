import { sql, withTransaction } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { COMMITTEE_KEYS } from '@/lib/committees'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`
    SELECT op.id, op.committee, op.role, op.member_id, op.sort_order,
           m.name, m.name_ko
    FROM org_positions op
    LEFT JOIN members m ON op.member_id = m.id
    ORDER BY op.committee, op.sort_order, op.role
  `
  return Response.json({ positions: rows })
}

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { positions } = await request.json()
  if (!Array.isArray(positions)) {
    return Response.json({ error: 'positions must be an array' }, { status: 400 })
  }

  // Empty slots arrive as null and simply aren't stored.
  const rows = positions
    .filter(p => COMMITTEE_KEYS.includes(p.committee))
    .map(p => ({ ...p, member_id: parseInt(p.member_id) }))
    .filter(p => Number.isFinite(p.member_id))

  try {
    await withTransaction(async (tx) => {
      // Only committee rows are managed here. Teams store their leader/members
      // in the same table keyed by team slug, so the delete must stay scoped to
      // the known committee keys — a blanket delete would wipe every team roster.
      await tx`DELETE FROM org_positions WHERE committee = ANY(${COMMITTEE_KEYS})`

      for (const pos of rows) {
        await tx`
          INSERT INTO org_positions (committee, role, member_id, sort_order)
          VALUES (${pos.committee}, ${pos.role}, ${pos.member_id}, ${pos.sort_order || 0})
        `
      }
    })
  } catch (error) {
    console.error('Org save error:', error)
    return Response.json({ error: 'Failed to save organization chart' }, { status: 500 })
  }

  return Response.json({ success: true })
}
