import { isDuesCurrent } from '@/lib/dues'

// membership_level carries the member's role — 'general', 'executive' or
// 'visitor'. A visitor is a visiting student or scholar, not a UT graduate: they
// can sign in, read news and RSVP to events, but are not alumni, so they never get
// full-member benefits, are left out of the directory, and are not billed. Whether
// someone has full-member benefits is no longer stored there: it is derived from
// the dues ledger, so it lapses on its own when a dues year goes unpaid.
//
// Executives keep benefits regardless of dues. They are still expected to pay and
// their payments are recorded, but holding a committee position never depends on
// the ledger.
export function hasFullBenefits(member, now = new Date()) {
  if (!member) return false
  if (isVisitor(member)) return false
  if (member.membershipLevel === 'executive') return true
  return isDuesCurrent(member.duesYearPaid, now)
}

export function isVisitor(member) {
  return member?.membershipLevel === 'visitor'
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

// The tier to show next to a member's name: 'executive', 'full', 'general' or 'visitor'.
// Derived the same way as access itself, so a badge can never claim a member is
// full while the directory turns them away, or the reverse. membership_level
// alone stopped being enough once full benefits moved to the dues ledger: it now
// reads 'general' for every paid member who is not an executive.
export function memberTier(member, now = new Date()) {
  if (!member) return 'general'
  if (isVisitor(member)) return 'visitor'
  if (member.membershipLevel === 'executive') return 'executive'
  return isDuesCurrent(member.duesYearPaid, now) ? 'full' : 'general'
}
