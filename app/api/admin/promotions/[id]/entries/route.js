import { getServerSession } from 'next-auth'
import { del } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ENTRY_STATUS_VALUES } from '@/lib/promotions'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.isAdmin ? session : null
}

export async function GET(request, { params }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { rows: entries } = await sql`
    SELECT e.id, e.member_id, e.screenshot_url, e.recipient_name, e.phone, e.address, e.note, e.status,
           e.admin_note, e.consent_at, e.purged_at, e.created_at, e.updated_at,
           m.name, m.name_ko, m.email, m.graduation_year,
           (SELECT MAX(d.dues_year) FROM dues_payments d WHERE d.member_id = m.id) AS dues_year_paid
    FROM promotion_entries e JOIN members m ON m.id = e.member_id
    WHERE e.promotion_id = ${parseInt(id, 10) || 0}
    ORDER BY e.created_at, e.id`
  return Response.json({ entries })
}

// Review one entry: { entryId, status, adminNote }.
export async function PUT(request, { params }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { entryId, status, adminNote } = await request.json()
  if (status !== undefined && !ENTRY_STATUS_VALUES.includes(status)) return Response.json({ error: 'Invalid status' }, { status: 400 })
  const { rows: updated } = await sql`
    UPDATE promotion_entries SET
      status = COALESCE(${status ?? null}, status),
      admin_note = CASE WHEN ${adminNote === undefined} THEN admin_note ELSE ${String(adminNote ?? '').slice(0, 1000) || null} END,
      updated_at = NOW()
    WHERE id = ${parseInt(entryId, 10) || 0} AND promotion_id = ${parseInt(id, 10) || 0}
    RETURNING id`
  if (!updated.length) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ success: true })
}

// { action: 'purge' }: once gifts are out, erase the personal details (recipient,
// phone, address, screenshots) of every entry, keeping who took part and the outcome.
export async function POST(request, { params }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { action } = await request.json()
  if (action !== 'purge') return Response.json({ error: 'Unknown action' }, { status: 400 })
  const promotionId = parseInt(id, 10) || 0
  const { rows } = await sql`
    SELECT screenshot_url FROM promotion_entries WHERE promotion_id = ${promotionId} AND screenshot_url IS NOT NULL`
  const urls = rows.map(r => r.screenshot_url)
  if (urls.length) {
    try { await del(urls) } catch (e) {
      console.error('Could not delete entry screenshots:', e.message)
      return Response.json({ error: 'Could not delete the screenshots; nothing was erased. Try again.' }, { status: 502 })
    }
  }
  const { rows: purged } = await sql`
    UPDATE promotion_entries SET screenshot_url = NULL, recipient_name = NULL, phone = NULL, address = NULL,
      purged_at = NOW(), updated_at = NOW()
    WHERE promotion_id = ${promotionId} AND purged_at IS NULL
    RETURNING id`
  return Response.json({ success: true, purged: purged.length })
}
