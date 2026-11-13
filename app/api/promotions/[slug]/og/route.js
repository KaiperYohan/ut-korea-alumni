import { ogCardResponse } from '@/lib/ogCard'
import { promotionBySlug } from '@/lib/promotionsDb'

// The link-preview image for a promotion's page, made from its image.
export async function GET(request, { params }) {
  const { slug } = await params
  const promo = await promotionBySlug(slug)
  if (!promo?.image_url || !promo.enabled) return new Response('Not found', { status: 404 })
  return ogCardResponse(promo.image_url, `Promotion ${promo.slug}`)
}
