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
  // dues_year_paid drives the Full badge in the admin list. It is the same value
  // the entitlement check reads, so the badge cannot disagree with actual access.
  let rows
  try {
    ({ rows } = await sql`
      SELECT m.id, m.email, m.name, m.name_ko, m.graduation_year, m.major, m.location,
             m.company, m.title, m.is_admin, m.is_approved, m.status, m.membership_level,
             m.created_at, m.last_login,
             (SELECT MAX(d.dues_year) FROM dues_payments d WHERE d.member_id = m.id) AS dues_year_paid
      FROM members m
      ORDER BY m.created_at DESC
    `)
  } catch (error) {
    console.error('Members query failed, retrying without status/dues:', error.message)
    ;({ rows } = await sql`
      SELECT id, email, name, name_ko, graduation_year, major, location, company, title,
             is_admin, is_approved, NULL AS status, membership_level, created_at, last_login,
             NULL AS dues_year_paid
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
    // 'full' is no longer a level — full-member benefits are derived from the dues
    // ledger, so setting it here would write a value nothing reads.
    const validLevels = ['general', 'executive']
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
