import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`
    SELECT * FROM news
    WHERE author_id = ${parseInt(session.user.id)}
      AND category IN ('members_news', 'pr')
    ORDER BY created_at DESC
  `

  return Response.json({ posts: rows })
}
