import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const { rows } = await sql`
    SELECT n.*, m.name as author_name
    FROM news n
    LEFT JOIN members m ON n.author_id = m.id
    WHERE n.published = true
    ORDER BY n.created_at DESC
  `
  return Response.json({ articles: rows })
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, titleKo, content, contentKo, imageUrl, published } = body

  if (!title || !content) {
    return Response.json({ error: 'Title and content are required' }, { status: 400 })
  }

  const { rows } = await sql`
    INSERT INTO news (title, title_ko, content, content_ko, author_id, image_url, published)
    VALUES (${title}, ${titleKo || null}, ${content}, ${contentKo || null}, ${parseInt(session.user.id)}, ${imageUrl || null}, ${published || false})
    RETURNING *
  `

  return Response.json({ article: rows[0] })
}
