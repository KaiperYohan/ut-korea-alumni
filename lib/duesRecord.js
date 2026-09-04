import { sql } from '@/lib/db'
import { hasFullBenefits } from '@/lib/permissions'

// Server-side dues lookups. Kept apart from lib/dues.js so that module stays free
// of database imports and can be used from client components.

const UNDEFINED_TABLE = '42P01'

// Reads role and latest paid dues year in one query, so entitlement never depends
// on a session value that an admin may have changed since sign-in.
//
// Only a missing dues_payments table is swallowed, which is the window between
// deploying and running /api/init-db. Connection blips are rethrown rather than
// quietly reported as "no dues on record", because denying a paid-up member the
// directory is a worse answer than an error.
export async function memberEntitlement(memberId) {
  if (!memberId) return { membershipLevel: 'general', duesYearPaid: null }
  try {
    const { rows } = await sql`
      SELECT m.membership_level,
             (SELECT MAX(d.dues_year) FROM dues_payments d WHERE d.member_id = m.id) AS dues_year_paid
      FROM members m
      WHERE m.id = ${memberId}
    `
    const row = rows[0]
    return {
      membershipLevel: row?.membership_level || 'general',
      duesYearPaid: row?.dues_year_paid ?? null,
    }
  } catch (error) {
    if (error.code !== UNDEFINED_TABLE) throw error
    console.error('dues_payments missing — run /api/init-db. Falling back to role only.')
    const { rows } = await sql`SELECT membership_level FROM members WHERE id = ${memberId}`
    return { membershipLevel: rows[0]?.membership_level || 'general', duesYearPaid: null }
  }
}

export async function memberHasFullBenefits(memberId, now = new Date()) {
  return hasFullBenefits(await memberEntitlement(memberId), now)
}

// Latest paid dues year only, for stamping into the session token.
export async function latestDuesYear(memberId) {
  try {
    const { rows } = await sql`
      SELECT MAX(dues_year) AS y FROM dues_payments WHERE member_id = ${memberId}
    `
    return rows[0]?.y ?? null
  } catch (error) {
    if (error.code !== UNDEFINED_TABLE) throw error
    return null
  }
}
