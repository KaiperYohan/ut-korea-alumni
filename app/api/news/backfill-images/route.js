import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storeNewsThumbnail } from '@/lib/newsImages'
import { resolveImageUrl } from '@/lib/resolveUrl'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`
    SELECT id, external_url, external_url_ko FROM news
    WHERE (external_url IS NOT NULL AND external_url != ''
        OR external_url_ko IS NOT NULL AND external_url_ko != '')
      AND (image_url IS NULL OR image_url = '')
  `

  let updated = 0
  for (const article of rows) {
    const url = article.external_url || article.external_url_ko
    if (!url) continue
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      })
      const html = await res.text()
      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      if (ogMatch) {
        // Stored as a small copy, like synced thumbnails, rather than hotlinking
        // the full-size og:image.
        const og = resolveImageUrl(ogMatch[1], res.url || url)
        if (!og) continue
        const thumb = await storeNewsThumbnail(og)
        await sql`UPDATE news SET image_url = ${thumb.url}, image_original_url = ${thumb.converted ? og : null} WHERE id = ${article.id}`
        updated++
      }
    } catch {}
  }

  return Response.json({ success: true, total: rows.length, updated })
}
