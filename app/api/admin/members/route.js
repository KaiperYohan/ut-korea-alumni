import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`
    SELECT id, email, name, name_ko, graduation_year, major, location, company, title,
           is_admin, is_approved, created_at, last_login
    FROM members
    ORDER BY created_at DESC
  `

  return Response.json({ members: rows })
}

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, action } = await request.json()

  if (action === 'approve') {
    await sql`UPDATE members SET is_approved = true WHERE id = ${id}`
  } else if (action === 'unapprove') {
    await sql`UPDATE members SET is_approved = false WHERE id = ${id}`
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
