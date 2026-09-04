import { sql } from '@/lib/db'
import { DUES_RATE_PREFIX, duesRateSettingKey } from '@/lib/dues'

export const dynamic = 'force-dynamic'

// This endpoint is unauthenticated. The dues rate card is not public: the officer
// rates say what named individuals pay, since each office is held by one or two
// people. Only the general member rate is exposed, and that figure is already on
// the public dues page. Admins read the full card from /api/admin/settings, and a
// signed-in member gets their own amount from /api/dues/me.
const PUBLIC_DUES_RATE_KEY = duesRateSettingKey('general')

function isPublic(key) {
  return !key.startsWith(DUES_RATE_PREFIX) || key === PUBLIC_DUES_RATE_KEY
}

export async function GET() {
  try {
    const { rows } = await sql`SELECT key, value FROM site_settings`
    const settings = {}
    for (const row of rows) {
      if (!isPublic(row.key)) continue
      settings[row.key] = row.value
    }
    return Response.json({ settings }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  } catch {
    return Response.json({ settings: {} })
  }
}
