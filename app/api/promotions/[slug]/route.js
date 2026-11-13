import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { isLive, kstToday, publicPromotion } from '@/lib/promotions'
import { promotionBySlug } from '@/lib/promotionsDb'

// One promotion's page. Shown from its start date on; after it ends the page stays
// up (so links already shared still work) but entries close. Admins can preview it
// before it starts, or while it is switched off.
export async function GET(request, { params }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  const isAdmin = Boolean(session?.user?.isAdmin)

  const promo = await promotionBySlug(slug)
  const today = kstToday()
  if (!promo || (!isAdmin && (!promo.enabled || promo.starts_on > today))) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  let entry = null
  if (session?.user?.id && promo.entry_form) {
    const { rows: [e] } = await sql`
      SELECT id, screenshot_url, recipient_name, phone, address, note, status, created_at, updated_at
      FROM promotion_entries WHERE promotion_id = ${promo.id} AND member_id = ${session.user.id}`
    entry = e || null
  }

  return Response.json({
    promotion: publicPromotion(promo),
    live: isLive(promo, today),
    ended: promo.ends_on < today,
    preview: isAdmin && !isLive(promo, today),
    loggedIn: Boolean(session?.user),
    isVisitor: session?.user?.membershipLevel === 'visitor',
    entry,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
