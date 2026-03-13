import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request, { params }) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  const { rows } = await sql`
    SELECT n.*, m.name as author_name
    FROM news n
    LEFT JOIN members m ON n.author_id = m.id
    WHERE n.id = ${parseInt(id)}
  `

  if (rows.length === 0) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const article = rows[0]

  // Non-published or non-approved articles: only admin or author can view
  if (!article.published || article.approval_status !== 'approved') {
    const isAdmin = session?.user?.isAdmin
    const isAuthor = session?.user?.id && String(article.author_id) === String(session.user.id)
    if (!isAdmin && !isAuthor) {
      return Response.json({ error: 'Article not found' }, { status: 404 })
    }
  }

  return Response.json({ article })
}

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { title, titleKo, content, contentKo, imageUrl, published, category, subcategory, externalUrl, approvalStatus } = body

  // Check if article exists and get current data
  const { rows: existing } = await sql`SELECT * FROM news WHERE id = ${parseInt(id)}`
  if (existing.length === 0) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const article = existing[0]
  const isAdmin = session.user.isAdmin
  const isAuthor = String(article.author_id) === String(session.user.id)

  // Admin can edit anything; author can edit their own pending posts
  if (!isAdmin && !(isAuthor && article.approval_status === 'pending')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin can change approval status and published flag
  if (isAdmin) {
    await sql`
      UPDATE news SET
        title = ${title}, title_ko = ${titleKo || null},
        content = ${content}, content_ko = ${contentKo || null},
        image_url = ${imageUrl || null}, published = ${published || false},
        category = COALESCE(${category || null}, category),
        subcategory = ${subcategory || null},
        external_url = ${externalUrl || null},
        approval_status = COALESCE(${approvalStatus || null}, approval_status),
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `
  } else {
    // Author editing their pending post — reset to pending, not published
    await sql`
      UPDATE news SET
        title = ${title}, title_ko = ${titleKo || null},
        content = ${content}, content_ko = ${contentKo || null},
        subcategory = ${subcategory || null},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { rows: existing } = await sql`SELECT * FROM news WHERE id = ${parseInt(id)}`
  if (existing.length === 0) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const article = existing[0]
  const isAdmin = session.user.isAdmin
  const isAuthor = String(article.author_id) === String(session.user.id)

  if (!isAdmin && !isAuthor) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await sql`DELETE FROM news WHERE id = ${parseInt(id)}`
  return Response.json({ success: true })
}
