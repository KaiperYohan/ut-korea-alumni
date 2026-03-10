import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request, { params }) {
  const { id } = await params

  const { rows } = await sql`
    SELECT n.*, m.name as author_name
    FROM news n
    LEFT JOIN members m ON n.author_id = m.id
    WHERE n.id = ${parseInt(id)}
  `

  if (rows.length === 0) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  return Response.json({ article: rows[0] })
}

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { title, titleKo, content, contentKo, imageUrl, published } = body

  await sql`
    UPDATE news SET
      title = ${title}, title_ko = ${titleKo || null},
      content = ${content}, content_ko = ${contentKo || null},
      image_url = ${imageUrl || null}, published = ${published || false},
      updated_at = NOW()
    WHERE id = ${parseInt(id)}
  `

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await sql`DELETE FROM news WHERE id = ${parseInt(id)}`
  return Response.json({ success: true })
}
