import sharp from 'sharp'
import { sql } from '@/lib/db'
import { eventImages } from '@/lib/eventMeta'

// The link-preview image for an event: its main image fitted whole into the
// 1200x630 card chat apps show, over a darkened, blurred copy of itself. Shared
// as-is, a portrait poster would be cropped to a strip by the app, and a full
// size upload (often several MB) can be too big for KakaoTalk to fetch at all.
const W = 1200
const H = 630

export async function GET(request, { params }) {
  const { id } = await params
  const eventId = parseInt(id, 10)
  if (!Number.isInteger(eventId)) return new Response('Not found', { status: 404 })

  const { rows: [event] } = await sql`SELECT image_url FROM events WHERE id = ${eventId}`
  const [main] = eventImages(event?.image_url)
  if (!main) return new Response('Not found', { status: 404 })

  try {
    const res = await fetch(main)
    if (!res.ok) throw new Error(`image fetch ${res.status}`)
    const source = Buffer.from(await res.arrayBuffer())

    const backdrop = await sharp(source).rotate()
      .resize(W, H, { fit: 'cover' })
      .blur(28)
      .modulate({ brightness: 0.55 })
      .toBuffer()
    const front = await sharp(source).rotate()
      .resize(W, H, { fit: 'inside', withoutEnlargement: false })
      .toBuffer()
    const card = await sharp(backdrop)
      .composite([{ input: front, gravity: 'center' }])
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer()

    return new Response(card, {
      headers: {
        'Content-Type': 'image/jpeg',
        // The URL carries a version of the source image, so it can be cached hard.
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error(`Event ${eventId} preview image failed:`, error.message)
    // Fall back to the original image rather than no preview.
    return Response.redirect(main, 302)
  }
}
