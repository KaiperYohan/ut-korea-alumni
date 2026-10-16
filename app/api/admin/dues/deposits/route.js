import { sql, withTransaction } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.isAdmin ? session : null
}

// Imported 50,000원 deposits: the ones waiting for review, plus the most recent
// decisions so an automatic recording can be checked after the fact.
export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { rows } = await sql`
    SELECT b.id, b.occurred_at, b.amount, b.memo, b.dues_year, b.status, b.reason, b.no_account,
           b.suggested_member_id, b.member_id, b.payment_id, b.decided_at,
           sm.name AS suggested_name, sm.name_ko AS suggested_name_ko, sm.graduation_year AS suggested_year,
           m.name AS member_name, m.name_ko AS member_name_ko
    FROM bank_deposits b
    LEFT JOIN members sm ON sm.id = b.suggested_member_id
    LEFT JOIN members m ON m.id = b.member_id
    ORDER BY (b.status = 'pending_review') DESC, b.occurred_at DESC
    LIMIT 200`
  return Response.json({
    pending: rows.filter(r => r.status === 'pending_review'),
    recent: rows.filter(r => r.status !== 'pending_review').slice(0, 30),
  })
}

// Resolve a queued deposit: approve it as a member's dues, or skip it (an event
// fee, a duplicate, someone without an account).
export async function PUT(request) {
  const session = await requireAdmin()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action, memberId } = await request.json()
  if (!Number.isInteger(id) || !['approve', 'skip'].includes(action)) {
    return Response.json({ error: 'id and action (approve|skip) are required' }, { status: 400 })
  }
  const adminId = parseInt(session.user.id) || null

  try {
    const result = await withTransaction(async (tx) => {
      // Locked so two admins acting at once cannot record the same deposit twice.
      const { rows: [dep] } = await tx`SELECT * FROM bank_deposits WHERE id = ${id} FOR UPDATE`
      if (!dep) return { error: 'Deposit not found', status: 404 }
      if (dep.status !== 'pending_review') return { error: `Already ${dep.status.replace('_', ' ')}`, status: 409 }

      if (action === 'skip') {
        await tx`UPDATE bank_deposits SET status = 'skipped', decided_by = ${adminId}, decided_at = NOW() WHERE id = ${id}`
        return { ok: true }
      }

      const target = parseInt(memberId)
      if (!Number.isInteger(target)) return { error: 'Choose the member this deposit is for', status: 400 }
      const { rows: [member] } = await tx`SELECT id FROM members WHERE id = ${target}`
      if (!member) return { error: 'Member not found', status: 404 }
      const paidAt = new Date(new Date(dep.occurred_at).getTime() + 9 * 3600e3).toISOString().slice(0, 10)
      const { rows: [pay] } = await tx`
        INSERT INTO dues_payments (member_id, dues_year, amount, paid_at, method, note, recorded_by)
        VALUES (${target}, ${dep.dues_year}, ${dep.amount}, ${paidAt}, 'bank transfer (reviewed)',
                ${`토스 모임통장 확인: ${dep.memo} / ${paidAt}`}, ${adminId})
        RETURNING id`
      await tx`
        UPDATE bank_deposits SET status = 'approved', member_id = ${target}, payment_id = ${pay.id},
               decided_by = ${adminId}, decided_at = NOW()
        WHERE id = ${id}`
      return { ok: true, paymentId: pay.id }
    })
    if (result.error) return Response.json({ error: result.error }, { status: result.status })
    return Response.json(result)
  } catch (error) {
    console.error('Deposit review error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
