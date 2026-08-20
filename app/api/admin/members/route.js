import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MEMBER_STATUS_VALUES, isActiveMember } from '@/lib/memberStatus'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The status column arrives via /api/init-db. Until that has been run the
  // select would fail and take the whole Members tab down, so fall back to the
  // pre-status shape and let normalizeStatus derive it from is_approved.
  let rows
  try {
    ({ rows } = await sql`
      SELECT id, email, name, name_ko, graduation_year, major, location, company, title,
             is_admin, is_approved, status, membership_level, created_at, last_login
      FROM members
      ORDER BY created_at DESC
    `)
  } catch (error) {
    console.error('Members query failed, retrying without status:', error.message)
    ;({ rows } = await sql`
      SELECT id, email, name, name_ko, graduation_year, major, location, company, title,
             is_admin, is_approved, NULL AS status, membership_level, created_at, last_login
      FROM members
      ORDER BY created_at DESC
    `)
  }

  return Response.json({ members: rows })
}

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, action, level, status } = await request.json()

  if (action === 'set_level') {
    const validLevels = ['general', 'full', 'executive']
    if (!validLevels.includes(level)) {
      return Response.json({ error: 'Invalid membership level' }, { status: 400 })
    }
    await sql`UPDATE members SET membership_level = ${level} WHERE id = ${id}`
  } else if (action === 'set_status') {
    if (!MEMBER_STATUS_VALUES.includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }
    // is_approved stays the derived "active member" flag every other query reads.
    await sql`UPDATE members SET status = ${status}, is_approved = ${isActiveMember(status)} WHERE id = ${id}`
  } else if (action === 'approve') {
    await sql`UPDATE members SET status = 'active', is_approved = true WHERE id = ${id}`
  } else if (action === 'unapprove') {
    await sql`UPDATE members SET status = 'pending', is_approved = false WHERE id = ${id}`
  } else if (action === 'make_admin') {
    await sql`UPDATE members SET is_admin = true WHERE id = ${id}`
  } else if (action === 'remove_admin') {
    await sql`UPDATE members SET is_admin = false WHERE id = ${id}`
  } else if (action === 'delete') {
    await sql`DELETE FROM event_rsvps WHERE member_id = ${id}`
    await sql`DELETE FROM members WHERE id = ${id}`
  }

  return Response.json({ success: true })
}
