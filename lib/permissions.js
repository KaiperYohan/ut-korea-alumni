import { isDuesCurrent } from '@/lib/dues'

// membership_level carries the member's role — 'general' or 'executive'. Whether
// someone has full-member benefits is no longer stored there: it is derived from
// the dues ledger, so it lapses on its own when a dues year goes unpaid.
//
// Executives keep benefits regardless of dues. They are still expected to pay and
// their payments are recorded, but holding a committee position never depends on
// the ledger.
export function hasFullBenefits(member, now = new Date()) {
  if (!member) return false
  if (member.membershipLevel === 'executive') return true
  return isDuesCurrent(member.duesYearPaid, now)
}

export function canAccessDirectory(member, now = new Date()) {
  return hasFullBenefits(member, now)
}

export function canWritePost(member, now = new Date()) {
  return hasFullBenefits(member, now)
}

// Running events is a role, not a benefit, so this ignores dues entirely.
export function canCreateEvent(member, isAdmin) {
  return Boolean(isAdmin) || member?.membershipLevel === 'executive'
}
