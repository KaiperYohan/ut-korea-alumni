import { getServerSession } from 'next-auth'
import { put, del } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { isLive } from '@/lib/promotions'
import { promotionBySlug } from '@/lib/promotionsDb'

// A member's entry to a promotion (e.g. proof of a 자동이체 set-up and where to
// send the gift). One per member per promotion; it can be changed or withdrawn
// until an admin has reviewed it.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 8 * 1024 * 1024

async function load(params, session) {
  const { slug } = await params
  if (!session?.user?.id) return { error: Response.json({ error: 'Please log in to take part.' }, { status: 401 }) }
  if (session.user.membershipLevel === 'visitor') return { error: Response.json({ error: 'This promotion is for alumni members.' }, { status: 403 }) }
  const promo = await promotionBySlug(slug)
  if (!promo || !promo.entry_form) return { error: Response.json({ error: 'Not found' }, { status: 404 }) }
  if (!isLive(promo)) return { error: Response.json({ error: 'This promotion is not open for entries.' }, { status: 409 }) }
  const { rows: [entry] } = await sql`
    SELECT id, screenshot_url, status FROM promotion_entries
    WHERE promotion_id = ${promo.id} AND member_id = ${session.user.id}`
  return { promo, entry }
}

const removeBlob = async url => {
  if (!url) return
  try { await del(url) } catch (error) { console.error('Could not delete entry screenshot:', error.message) }
}

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  const { promo, entry, error } = await load(params, session)
  if (error) return error
  if (entry && entry.status !== 'submitted') {
    return Response.json({ error: 'Your entry has already been reviewed and can no longer be changed.' }, { status: 409 })
  }

  const form = await request.formData()
  const text = (key, max) => String(form.get(key) ?? '').trim().slice(0, max)
  const fields = {
    recipient_name: text('recipient_name', 100),
    phone: text('phone', 30),
    address: text('address', 500),
    note: text('note', 1000),
  }
  if (form.get('consent') !== 'true') {
    return Response.json({ error: 'Please agree to the use of your information for this promotion.' }, { status: 400 })
  }
  if (promo.entry_address && (!fields.recipient_name || !fields.phone || !fields.address)) {
    return Response.json({ error: 'Please fill in the recipient, phone number and address.' }, { status: 400 })
  }

  const file = form.get('screenshot')
  const hasFile = file && typeof file === 'object' && file.size > 0
  if (promo.entry_screenshot && !hasFile && !entry?.screenshot_url) {
    return Response.json({ error: 'Please attach the screenshot.' }, { status: 400 })
  }

  let screenshotUrl = entry?.screenshot_url || null
  if (hasFile) {
    if (!IMAGE_TYPES.includes(file.type)) return Response.json({ error: 'Attach a JPG, PNG, WebP or HEIC image.' }, { status: 400 })
    if (file.size > MAX_BYTES) return Response.json({ error: 'The image is too large (max 8MB).' }, { status: 400 })
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    // Not listed anywhere public: the random suffix makes the URL unguessable and
    // only admins are shown it. Deleted when the entry is withdrawn or purged.
    const blob = await put(`promotions/${promo.id}/entry-${session.user.id}.${ext}`, file, { access: 'public', addRandomSuffix: true })
    screenshotUrl = blob.url
  }

  await sql`
    INSERT INTO promotion_entries (promotion_id, member_id, screenshot_url, recipient_name, phone, address, note, consent_at)
    VALUES (${promo.id}, ${session.user.id}, ${screenshotUrl}, ${fields.recipient_name || null}, ${fields.phone || null},
            ${fields.address || null}, ${fields.note || null}, NOW())
    ON CONFLICT (promotion_id, member_id) DO UPDATE SET
      screenshot_url = EXCLUDED.screenshot_url, recipient_name = EXCLUDED.recipient_name, phone = EXCLUDED.phone,
      address = EXCLUDED.address, note = EXCLUDED.note, consent_at = NOW(), updated_at = NOW()
    WHERE promotion_entries.status = 'submitted'`
  if (hasFile && entry?.screenshot_url && entry.screenshot_url !== screenshotUrl) await removeBlob(entry.screenshot_url)

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  const { entry, error } = await load(params, session)
  if (error) return error
  if (!entry) return Response.json({ success: true })
  if (entry.status !== 'submitted') {
    return Response.json({ error: 'Your entry has already been reviewed.' }, { status: 409 })
  }
  await sql`DELETE FROM promotion_entries WHERE id = ${entry.id}`
  await removeBlob(entry.screenshot_url)
  return Response.json({ success: true })
}
