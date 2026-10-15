import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storeNewsThumbnail, mapLimit } from '@/lib/newsImages'

// Converts existing news thumbnails into small stored copies (see lib/newsImages).
// Works through articles newest first in batches, so no single request runs long
// enough to time out; the caller passes back `nextBeforeId` until `done`.
// Articles whose image cannot be converted keep their original image_url and are
// skipped by the cursor rather than retried forever.
//
// Allowed for a signed-in admin, or with the ADMIN_SECRET bearer token that
// /api/init-db uses, so it can also be run once from a terminal.
const BATCH = 12
const CONCURRENCY = 4

async function authorized(request) {
  const secret = process.env.ADMIN_SECRET
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return true
  const session = await getServerSession(authOptions)
  return !!session?.user?.isAdmin
}

export async function POST(request) {
  if (!(await authorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const beforeId = parseInt(searchParams.get('beforeId') || '', 10)
  const dryRun = searchParams.get('dryRun') === 'true'

  const { rows } = Number.isInteger(beforeId)
    ? await sql`
        SELECT id, image_url FROM news
        WHERE image_url IS NOT NULL AND image_url <> ''
          AND image_url NOT LIKE '%.public.blob.vercel-storage.com/%'
          AND id < ${beforeId}
        ORDER BY id DESC LIMIT ${BATCH}`
    : await sql`
        SELECT id, image_url FROM news
        WHERE image_url IS NOT NULL AND image_url <> ''
          AND image_url NOT LIKE '%.public.blob.vercel-storage.com/%'
        ORDER BY id DESC LIMIT ${BATCH}`

  if (dryRun) {
    const { rows: [{ n }] } = await sql`
      SELECT count(*)::int AS n FROM news
      WHERE image_url IS NOT NULL AND image_url <> ''
        AND image_url NOT LIKE '%.public.blob.vercel-storage.com/%'`
    return Response.json({ dryRun: true, pending: n, firstBatch: rows.map(r => r.id) })
  }

  const results = await mapLimit(rows, CONCURRENCY, async (row) => {
    const result = await storeNewsThumbnail(row.image_url)
    if (result.converted && result.url !== row.image_url) {
      // Guarded on the URL read above, so an edit made meanwhile is not clobbered.
      await sql`
        UPDATE news
        SET image_original_url = COALESCE(image_original_url, image_url), image_url = ${result.url}
        WHERE id = ${row.id} AND image_url = ${row.image_url}`
    }
    return { id: row.id, converted: result.converted, reused: !!result.reused,
      sourceBytes: result.sourceBytes, storedBytes: result.storedBytes, error: result.error }
  })

  const done = rows.length < BATCH
  return Response.json({
    processed: results.length,
    converted: results.filter(r => r.converted).length,
    failed: results.filter(r => !r.converted).map(r => ({ id: r.id, error: r.error })),
    savedBytes: results.reduce((s, r) => s + (r.sourceBytes && r.storedBytes ? r.sourceBytes - r.storedBytes : 0), 0),
    nextBeforeId: rows.length ? rows[rows.length - 1].id : null,
    done,
  })
}
