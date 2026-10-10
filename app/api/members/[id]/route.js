import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessDirectory, memberTier } from '@/lib/permissions'
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
           linkedin, instagram, tiktok, youtube, twitter, interests, profile_image_url, membership_level,
             (SELECT MAX(d.dues_year) FROM dues_payments d WHERE d.member_id = members.id) AS dues_year_paid
    FROM members
    WHERE id = ${id} AND is_approved = true
  `

  if (!rows.length) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }

  const { dues_year_paid, ...member } = rows[0]
  return Response.json({
    member: {
      ...member,
      member_tier: memberTier({ membershipLevel: member.membership_level, duesYearPaid: dues_year_paid }),
    },
  })
}
