import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request, { params }) {
  const { id } = await params
  const { rows: comments } = await sql`
    SELECT nc.*, m.name, m.name_ko, m.profile_image_url
    FROM news_comments nc
    JOIN members m ON nc.member_id = m.id
    WHERE nc.news_id = ${parseInt(id)}
    ORDER BY nc.created_at ASC
  `
  return Response.json({ comments })
}

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { content } = await request.json()

  if (!content || !content.trim()) {
    return Response.json({ error: 'Content is required' }, { status: 400 })
  }

  const { rows } = await sql`
    INSERT INTO news_comments (news_id, member_id, content)
    VALUES (${parseInt(id)}, ${parseInt(session.user.id)}, ${content.trim()})
    RETURNING *
  `

  return Response.json({ comment: rows[0] })
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get('commentId')

  if (!commentId) {
    return Response.json({ error: 'Comment ID required' }, { status: 400 })
  }

  const { rows } = await sql`SELECT * FROM news_comments WHERE id = ${parseInt(commentId)} AND news_id = ${parseInt(id)}`
  if (rows.length === 0) {
    return Response.json({ error: 'Comment not found' }, { status: 404 })
  }

  const isOwner = String(rows[0].member_id) === String(session.user.id)
  if (!isOwner && !session.user.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await sql`DELETE FROM news_comments WHERE id = ${parseInt(commentId)}`
  return Response.json({ success: true })
}
