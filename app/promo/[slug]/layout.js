import { promotionBySlug } from '@/lib/promotionsDb'
import { imageVersion } from '@/lib/eventMeta'
import { kstToday } from '@/lib/promotions'

// Link preview for a promotion's page (the page itself is a client component).
// openGraph and twitter replace the root layout's objects, so shared fields repeat.
const SITE_IMAGE = { url: '/grand reunion.jpg', width: 1200, height: 630, alt: 'UT Austin Korea Alumni Association' }

export async function generateMetadata({ params }) {
  const { slug } = await params
  let promo
  try {
    promo = await promotionBySlug(slug)
  } catch (error) {
    console.error('Promotion metadata query failed:', error.message)
    return {}
  }
  if (!promo || !promo.enabled || promo.starts_on > kstToday()) return { robots: { index: false } }

  const title = promo.title_ko && promo.title && promo.title_ko !== promo.title
    ? `${promo.title_ko} · ${promo.title}`
    : promo.title_ko || promo.title
  const full = String(promo.body_ko || promo.body || '').replace(/\s+/g, ' ').trim()
  const description = full.length > 160 ? `${full.slice(0, 159).trimEnd()}…` : full
  const image = promo.image_url
    ? { url: `/api/promotions/${promo.slug}/og?v=${imageVersion(promo.image_url)}`, width: 1200, height: 630, alt: title }
    : SITE_IMAGE
  const url = `/promo/${promo.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      alternateLocale: 'en_US',
      siteName: 'UT Austin Korea Alumni Association',
      url,
      title,
      description,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  }
}

export default function PromotionLayout({ children }) {
  return children
}
