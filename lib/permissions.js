export function canAccessDirectory(membershipLevel) {
  return ['executive', 'full'].includes(membershipLevel)
}

export function canWritePost(membershipLevel) {
  return ['executive', 'full'].includes(membershipLevel)
}

export function canCreateEvent(membershipLevel, isAdmin) {
  return isAdmin || membershipLevel === 'executive'
}
