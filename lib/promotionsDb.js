import { sql } from '@/lib/db'
import { PROMO_COLUMNS } from '@/lib/promotions'

// Server-side reads of the promotions table. Dates are selected as text (see
// PROMO_COLUMNS); the column list is spliced into the query text, never values.
const select = (tail, ...values) => sql([`SELECT ${PROMO_COLUMNS} FROM promotions ${tail[0]}`, ...tail.slice(1)], ...values)

export async function promotionBySlug(slug) {
  const { rows: [p] } = await select`WHERE slug = ${String(slug || '').toLowerCase()}`
  return p || null
}

export async function promotionById(id) {
  const { rows: [p] } = await select`WHERE id = ${parseInt(id, 10) || 0}`
  return p || null
}

// Switched on and inside their dates today in Korea, newest start first.
export async function livePromotions() {
  const { rows } = await select`
    WHERE enabled = true
      AND starts_on <= (NOW() AT TIME ZONE 'Asia/Seoul')::date
      AND ends_on >= (NOW() AT TIME ZONE 'Asia/Seoul')::date
    ORDER BY starts_on DESC, id DESC`
  return rows
}

export async function allPromotions() {
  const { rows } = await select`ORDER BY starts_on DESC, id DESC`
  return rows
}

// Who is looking, in the shape audienceMatches expects.
export function viewerOf(session) {
  if (!session?.user) return null
  return { membershipLevel: session.user.membershipLevel, hasFullBenefits: Boolean(session.user.hasFullBenefits) }
}
