import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { memberDuesProfile } from '@/lib/duesRecord'
import { hasFullBenefits } from '@/lib/permissions'
import { currentDuesYear, duesDeadline, duesLapseDate, paidThrough } from '@/lib/dues'

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
    return Response.json({
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
