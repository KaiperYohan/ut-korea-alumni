import crypto from 'crypto'
import sharp from 'sharp'
import { head, put } from '@vercel/blob'

// News thumbnails, stored as our own small copies.
//
// SXSK articles are imported with the image their site uses, at full size — the
// cover of one issue is a 2.6 MB PNG — and the news cards display them at about
// 380 x 176. On a phone a single one of those could outweigh the rest of the
// homepage. This downloads the source once, resizes it to card size, converts it
// to WebP, and stores it in Vercel Blob, so every visitor gets a ~50 KB file.

const MAX_WIDTH = 800 // widest card slot (~380 css px) at 2x density, with margin
const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const FETCH_TIMEOUT_MS = 10000

export function isStoredThumbnail(url) {
  try {
    return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

// The same source always maps to the same file, so re-syncing an issue reuses the
// copy already stored instead of downloading and uploading it again.
function pathFor(sourceUrl) {
  return `news/${crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0, 20)}.webp`
}

// Returns the URL of a stored, resized copy of sourceUrl. Never throws: on any
// failure it returns the source unchanged, so a card still shows its image, just
// unoptimized. `converted` says whether a stored copy is being returned.
export async function storeNewsThumbnail(sourceUrl) {
  if (!sourceUrl) return { url: sourceUrl, converted: false }
  if (isStoredThumbnail(sourceUrl)) return { url: sourceUrl, converted: false, alreadyStored: true }

  let absolute
  try {
    absolute = new URL(sourceUrl)
    if (!/^https?:$/.test(absolute.protocol)) throw new Error('not http')
  } catch {
    return { url: sourceUrl, converted: false, error: 'not an absolute http(s) URL' }
  }

  const pathname = pathFor(absolute.href)
  try {
    const existing = await head(pathname)
    return { url: existing.url, converted: true, reused: true }
  } catch {
    // Not stored yet — fall through and create it.
  }

  try {
    const res = await fetch(absolute.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (UT Korea Alumni thumbnailer)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const type = res.headers.get('content-type') || ''
    if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'no content-type'})`)
    const declared = Number(res.headers.get('content-length') || 0)
    if (declared > MAX_SOURCE_BYTES) throw new Error(`source too large (${declared} bytes)`)
    const source = Buffer.from(await res.arrayBuffer())
    if (source.length > MAX_SOURCE_BYTES) throw new Error(`source too large (${source.length} bytes)`)

    const webp = await sharp(source, { animated: false })
      .rotate() // honour camera orientation before EXIF is dropped
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toBuffer()

    const blob = await put(pathname, webp, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    })
    return { url: blob.url, converted: true, sourceBytes: source.length, storedBytes: webp.length }
  } catch (error) {
    console.error(`Thumbnail failed for ${absolute.href}:`, error.message)
    return { url: sourceUrl, converted: false, error: error.message }
  }
}

// Runs fn over items with at most `limit` in flight, keeping input order.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}
