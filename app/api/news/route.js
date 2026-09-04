import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canWritePost } from '@/lib/permissions'
import { memberEntitlement } from '@/lib/duesRecord'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'utaka_news'
  const subcategory = searchParams.get('subcategory') || ''

  let result
  if (subcategory) {
    result = await sql`
      SELECT n.*, m.name as author_name
      FROM news n
      LEFT JOIN members m ON n.author_id = m.id
      WHERE n.published = true AND n.approval_status = 'approved'
        AND n.category = ${category} AND n.subcategory = ${subcategory}
      ORDER BY n.created_at DESC
    `
  } else if (category === 'all') {
    result = await sql`
      SELECT n.*, m.name as author_name
      FROM news n
      LEFT JOIN members m ON n.author_id = m.id
      WHERE n.published = true AND n.approval_status = 'approved'
      ORDER BY n.created_at DESC
    `
  } else {
    result = await sql`
      SELECT n.*, m.name as author_name
      FROM news n
      LEFT JOIN members m ON n.author_id = m.id
      WHERE n.published = true AND n.approval_status = 'approved'
        AND n.category = ${category}
      ORDER BY n.created_at DESC
    `
  }

  return Response.json({ articles: result.rows })
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  let { title, titleKo, content, contentKo, imageUrl, published, category, subcategory, externalUrl } = body

  // Auto-scrape OG image from external URL if no image provided
  if (externalUrl && !imageUrl) {
    try {
      const res = await fetch(externalUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) })
      const html = await res.text()
      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      if (ogMatch) imageUrl = ogMatch[1]
    } catch {}
  }

  if (!title || !content) {
    return Response.json({ error: 'Title and content are required' }, { status: 400 })
  }

  const isAdmin = session.user.isAdmin

  // Admin creating SXSK or UTAKA News articles
  if (category === 'sxsk' || category === 'utaka_news' || !category) {
    if (!isAdmin) {
      return Response.json({ error: 'Only admins can create SXSK/UTAKA News articles' }, { status: 403 })
    }
    const cat = category || 'sxsk'
    const { rows } = await sql`
      INSERT INTO news (title, title_ko, content, content_ko, author_id, image_url, published, category, external_url, approval_status)
      VALUES (${title}, ${titleKo || null}, ${content}, ${contentKo || null}, ${parseInt(session.user.id)}, ${imageUrl || null}, ${published || false}, ${cat}, ${externalUrl || null}, 'approved')
      RETURNING *
    `
    return Response.json({ article: rows[0] })
  }

  // Member submitting members_news or pr
  if (category === 'members_news' || category === 'pr') {
    if (!isAdmin && !canWritePost(await memberEntitlement(session.user.id))) {
      return Response.json({ error: 'Current membership dues required to submit posts' }, { status: 403 })
    }

    if (category === 'members_news' && !subcategory) {
      return Response.json({ error: 'Subcategory is required for Members News' }, { status: 400 })
    }

    const validSubcategories = ['marriage', 'birth', 'death', 'promotion', 'job_change', 'seeking_employment', 'hiring', 'interview', 'other']
    if (category === 'members_news' && !validSubcategories.includes(subcategory)) {
      return Response.json({ error: 'Invalid subcategory' }, { status: 400 })
    }

    // Admin posts are auto-approved, member posts need approval
    const approvalStatus = isAdmin ? 'approved' : 'pending'
    const isPublished = isAdmin ? true : false

    const { rows } = await sql`
      INSERT INTO news (title, title_ko, content, content_ko, author_id, image_url, published, category, subcategory, external_url, approval_status)
      VALUES (${title}, ${titleKo || null}, ${content}, ${contentKo || null}, ${parseInt(session.user.id)}, ${imageUrl || null}, ${isPublished}, ${category}, ${subcategory || null}, ${externalUrl || null}, ${approvalStatus})
      RETURNING *
    `
    return Response.json({ article: rows[0] })
  }

  return Response.json({ error: 'Invalid category' }, { status: 400 })
}
