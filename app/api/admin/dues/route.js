import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { currentDuesYear, requiredDuesYear, DUES_AMOUNT_KRW } from '@/lib/dues'
import { isActiveMember } from '@/lib/memberStatus'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) return null
  return session
}

// Collection state for one dues year: every member who is expected to pay, what
// they have paid, and the totals. Executives are included because they are
// expected to pay even though their benefits never depend on it.
export async function GET(request) {
  const session = await requireAdmin()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || '', 10)
  const duesYear = Number.isInteger(year) ? year : currentDuesYear()

  try {
    const { rows: members } = await sql`
      SELECT m.id, m.name, m.name_ko, m.email, m.graduation_year,
             m.membership_level, m.status, m.is_approved,
             COALESCE(p.paid_total, 0) AS paid_total,
             p.payment_count,
             p.last_paid_at,
             p.payments,
             (SELECT MAX(dues_year) FROM dues_payments d2 WHERE d2.member_id = m.id) AS latest_dues_year
      FROM members m
      LEFT JOIN (
        SELECT member_id,
               SUM(COALESCE(amount, 0)) AS paid_total,
               COUNT(*)::int AS payment_count,
               MAX(paid_at) AS last_paid_at,
               json_agg(json_build_object(
                 'id', id, 'amount', amount, 'paidAt', paid_at, 'note', note, 'method', method
               ) ORDER BY paid_at NULLS LAST, id) AS payments
        FROM dues_payments
        WHERE dues_year = ${duesYear}
        GROUP BY member_id
      ) p ON p.member_id = m.id
      ORDER BY m.name
    `

    // Only members who are actually part of the association are billable, so
    // resigned, expelled and deceased members are not chased for dues. Executives
    // are billable like anyone else — they are expected to pay, their benefits
    // just never depend on having done so.
    const billable = members.filter(m => isActiveMember(m.status, m.is_approved))

    const paid = billable.filter(m => m.payment_count > 0)
    const unpaid = billable.filter(m => !m.payment_count)

    return Response.json({
      duesYear,
      currentDuesYear: currentDuesYear(),
      requiredDuesYear: requiredDuesYear(),
      amount: DUES_AMOUNT_KRW,
      summary: {
        billable: billable.length,
        paid: paid.length,
        unpaid: unpaid.length,
        collected: paid.reduce((sum, m) => sum + Number(m.paid_total || 0), 0),
      },
      members: billable,
    })
  } catch (error) {
    console.error('Dues list error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const session = await requireAdmin()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId, duesYear, amount, paidAt, method, note } = await request.json()

  if (!memberId || !Number.isInteger(duesYear)) {
    return Response.json({ error: 'memberId and duesYear are required' }, { status: 400 })
  }

  try {
    const { rows } = await sql`
      INSERT INTO dues_payments (member_id, dues_year, amount, paid_at, method, note, recorded_by)
      VALUES (${memberId}, ${duesYear}, ${amount ?? DUES_AMOUNT_KRW}, ${paidAt || null},
              ${method || 'bank transfer'}, ${note || null}, ${parseInt(session.user.id)})
      RETURNING *
    `
    return Response.json({ payment: rows[0] })
  } catch (error) {
    console.error('Record dues error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// Corrections — a payment recorded against the wrong member or year.
export async function DELETE(request) {
  const session = await requireAdmin()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = parseInt(searchParams.get('id') || '', 10)
  if (!Number.isInteger(id)) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    const { rows } = await sql`DELETE FROM dues_payments WHERE id = ${id} RETURNING id`
    return Response.json({ success: true, deleted: rows.length })
  } catch (error) {
    console.error('Delete dues error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
