import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessDirectory } from '@/lib/permissions'
import { memberEntitlement } from '@/lib/duesRecord'

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.user.isAdmin && !canAccessDirectory(await memberEntitlement(session.user.id))) {
    return Response.json({ error: 'Directory access requires current membership dues' }, { status: 403 })
  }

  const { id } = await params

  const { rows } = await sql`
    SELECT id, email, name, name_ko, graduation_year, major, location, company, title, bio, phone,
           linkedin, instagram, tiktok, youtube, twitter, interests, profile_image_url, membership_level
    FROM members
    WHERE id = ${id} AND is_approved = true
  `

  if (!rows.length) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }

  return Response.json({ member: rows[0] })
}
