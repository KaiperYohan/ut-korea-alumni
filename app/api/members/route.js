import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessDirectory } from '@/lib/permissions'

export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only executive and full members can access the directory
  if (!canAccessDirectory(session.user.membershipLevel) && !session.user.isAdmin) {
    return Response.json({ error: 'Directory access requires Full or Executive membership' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const year = searchParams.get('year') || ''
  const location = searchParams.get('location') || ''

  let query
  if (search || year || location) {
    const searchLike = `%${search}%`
    query = await sql`
      SELECT id, name, name_ko, graduation_year, major, location, company, title, bio, phone,
             linkedin, instagram, tiktok, youtube, twitter, interests, profile_image_url, membership_level
      FROM members
      WHERE is_approved = true
        AND (${!search} OR name ILIKE ${searchLike} OR name_ko ILIKE ${searchLike} OR major ILIKE ${searchLike} OR company ILIKE ${searchLike})
        AND (${!year} OR graduation_year = ${year ? parseInt(year) : 0})
        AND (${!location} OR location ILIKE ${`%${location}%`})
      ORDER BY graduation_year DESC NULLS LAST, name ASC
    `
  } else {
    query = await sql`
      SELECT id, name, name_ko, graduation_year, major, location, company, title, bio, phone,
             linkedin, instagram, tiktok, youtube, twitter, interests, profile_image_url, membership_level
      FROM members
      WHERE is_approved = true
      ORDER BY graduation_year DESC NULLS LAST, name ASC
    `
  }

  return Response.json({ members: query.rows })
}
