import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { memberDuesProfile } from '@/lib/duesRecord'
import { hasFullBenefits } from '@/lib/permissions'
import { currentDuesYear, duesDeadline, duesLapseDate, paidThrough, inGracePeriod } from '@/lib/dues'
import { audienceVersion } from '@/lib/duesNotices'
import { sql } from '@/lib/db'

// A member's own dues position. Read live rather than from the session token, so
// a payment recorded moments ago shows immediately instead of waiting out the
// token's refresh interval.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await memberDuesProfile(session.user.id)
    const duesYear = currentDuesYear()
    // End-of-year notice for the site (the same rule as the emailed one), shown
    // from Oct 1 to Dec 31 while the open dues year can still be paid in time.
    const { rows: [standing] } = await sql`SELECT status, is_approved FROM members WHERE id = ${session.user.id}`
    const noticeVersion = inGracePeriod() && standing
      ? audienceVersion({ ...standing, membership_level: profile.membershipLevel, dues_year_paid: profile.duesYearPaid }, duesYear)
      : null
    return Response.json({
      noticeVersion,
      duesYear,
      membershipLevel: profile.membershipLevel,
      duesYearPaid: profile.duesYearPaid,
      benefitsActive: hasFullBenefits(profile),
      expectedAmount: profile.expectedAmount,
      tier: profile.tier,
      roles: profile.roles,
      deadline: duesDeadline(duesYear),
      lapseDate: duesLapseDate(duesYear),
      paidThrough: profile.duesYearPaid ? paidThrough(profile.duesYearPaid) : null,
    })
  } catch (error) {
    console.error('Dues profile error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
