import { getServerSession } from 'next-auth'
import { del } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { sanitizePromotion } from '@/lib/promotions'
import { allPromotions, promotionById } from '@/lib/promotionsDb'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.isAdmin ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const promotions = await allPromotions()
  const { rows: counts } = await sql`
    SELECT promotion_id, status, count(*)::int AS n FROM promotion_entries GROUP BY 1, 2`
  for (const p of promotions) {
    p.entryCounts = Object.fromEntries(counts.filter(c => c.promotion_id === p.id).map(c => [c.status, c.n]))
  }
  return Response.json({ promotions })
}

const conflict = error => error?.code === '23505'
  ? Response.json({ error: 'Another promotion already uses this page address. Choose a different one.' }, { status: 409 })
  : null

export async function POST(request) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { value: p, error } = sanitizePromotion(await request.json())
  if (error) return Response.json({ error }, { status: 400 })
  try {
    const { rows: [row] } = await sql`
      INSERT INTO promotions (slug, title, title_ko, body, body_ko, image_url, button_label, button_label_ko, button_url,
        banner_text, banner_text_ko, starts_on, ends_on, audience, show_popup, show_banner, enabled,
        entry_form, entry_screenshot, entry_address, entry_note, entry_note_ko)
      VALUES (${p.slug}, ${p.title}, ${p.title_ko}, ${p.body}, ${p.body_ko}, ${p.image_url}, ${p.button_label}, ${p.button_label_ko}, ${p.button_url},
        ${p.banner_text}, ${p.banner_text_ko}, ${p.starts_on}, ${p.ends_on}, ${p.audience}, ${p.show_popup}, ${p.show_banner}, ${p.enabled},
        ${p.entry_form}, ${p.entry_screenshot}, ${p.entry_address}, ${p.entry_note}, ${p.entry_note_ko})
      RETURNING id`
    return Response.json({ promotion: await promotionById(row.id) })
  } catch (e) {
    return conflict(e) || Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const id = parseInt(body.id, 10)
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const { value: p, error } = sanitizePromotion(body)
  if (error) return Response.json({ error }, { status: 400 })
  try {
    const { rows: updated } = await sql`
      UPDATE promotions SET slug = ${p.slug}, title = ${p.title}, title_ko = ${p.title_ko}, body = ${p.body}, body_ko = ${p.body_ko},
        image_url = ${p.image_url}, button_label = ${p.button_label}, button_label_ko = ${p.button_label_ko}, button_url = ${p.button_url},
        banner_text = ${p.banner_text}, banner_text_ko = ${p.banner_text_ko}, starts_on = ${p.starts_on}, ends_on = ${p.ends_on},
        audience = ${p.audience}, show_popup = ${p.show_popup}, show_banner = ${p.show_banner}, enabled = ${p.enabled},
        entry_form = ${p.entry_form}, entry_screenshot = ${p.entry_screenshot}, entry_address = ${p.entry_address},
        entry_note = ${p.entry_note}, entry_note_ko = ${p.entry_note_ko}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id`
    if (!updated.length) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ promotion: await promotionById(id) })
  } catch (e) {
    return conflict(e) || Response.json({ error: e.message }, { status: 500 })
  }
}

// Deletes the promotion and its entries, including uploaded screenshots.
export async function DELETE(request) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const id = parseInt(new URL(request.url).searchParams.get('id'), 10)
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const { rows } = await sql`SELECT screenshot_url FROM promotion_entries WHERE promotion_id = ${id} AND screenshot_url IS NOT NULL`
  await sql`DELETE FROM promotions WHERE id = ${id}`
  const urls = rows.map(r => r.screenshot_url)
  if (urls.length) { try { await del(urls) } catch (e) { console.error('Could not delete entry screenshots:', e.message) } }
  return Response.json({ success: true })
}
