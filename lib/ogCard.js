import sharp from 'sharp'

// A 1200x630 link-preview card (what KakaoTalk, Slack and others show when a link
// is shared) made from any uploaded image: the whole image fitted in, over a
// darkened, blurred copy of itself. Shared as-is, a portrait poster would be
// cropped to a strip by the app, and a full-size upload (often several MB) can
// be too big for KakaoTalk to fetch at all.
const W = 1200
const H = 630

export async function ogCardResponse(imageUrl, label) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`image fetch ${res.status}`)
    const source = Buffer.from(await res.arrayBuffer())

    const backdrop = await sharp(source).rotate()
      .resize(W, H, { fit: 'cover' })
      .blur(28)
      .modulate({ brightness: 0.55 })
      .toBuffer()
    const front = await sharp(source).rotate()
      .resize(W, H, { fit: 'inside' })
      .toBuffer()
    const card = await sharp(backdrop)
      .composite([{ input: front, gravity: 'center' }])
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer()

    return new Response(card, {
      headers: {
        'Content-Type': 'image/jpeg',
        // Callers put a version of the source image in the URL, so it can be cached hard.
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error(`${label} preview image failed:`, error.message)
    // Fall back to the original image rather than no preview.
    return Response.redirect(imageUrl, 302)
  }
}
