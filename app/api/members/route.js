import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const year = searchParams.get('year') || ''
  const location = searchParams.get('location') || ''

  let query
  if (search || year || location) {
    const searchLike = `%${search}%`
    query = await sql`
      SELECT id, name, name_ko, graduation_year, major, location, company, title, bio, profile_image_url
      FROM members
      WHERE is_approved = true
        AND (${!search} OR name ILIKE ${searchLike} OR name_ko ILIKE ${searchLike} OR major ILIKE ${searchLike} OR company ILIKE ${searchLike})
        AND (${!year} OR graduation_year = ${year ? parseInt(year) : 0})
        AND (${!location} OR location ILIKE ${`%${location}%`})
      ORDER BY graduation_year DESC NULLS LAST, name ASC
    `
  } else {
    query = await sql`
      SELECT id, name, name_ko, graduation_year, major, location, company, title, bio, profile_image_url
      FROM members
      WHERE is_approved = true
      ORDER BY graduation_year DESC NULLS LAST, name ASC
    `
  }

  return Response.json({ members: query.rows })
}
