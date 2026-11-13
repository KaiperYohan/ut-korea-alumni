import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { audienceMatches, publicPromotion } from '@/lib/promotions'
import { livePromotions, viewerOf } from '@/lib/promotionsDb'

// The promotions running today that this visitor should see, for the home-page
// pop-up and the top bar.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const viewer = viewerOf(session)
    const promotions = (await livePromotions())
      .filter(p => (p.show_popup || p.show_banner) && audienceMatches(p.audience, viewer))
      .map(publicPromotion)
    return Response.json({ promotions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    // Before /api/init-db has created the table, or on a database hiccup, the site
    // simply shows no promotions.
    console.error('Promotions query failed:', error.message)
    return Response.json({ promotions: [] })
  }
}
