// Membership status — the source of truth for why a member is or isn't active.
//
// `is_approved` remains on the members table as the derived "currently an active
// member" flag, kept in sync whenever status changes. That keeps every existing
// `WHERE is_approved = true` query (directory, profiles, birthday mail) correct
// without rewriting it, while status carries the reason.

export const MEMBER_STATUSES = [
  {
    value: 'pending',
    label: 'Pending',
    labelKo: '승인 대기',
    description: 'Signed up, awaiting admin review.',
    active: false,
    canLogin: true,
    inHistory: false,
    badge: 'bg-amber-200 text-amber-800',
  },
  {
    value: 'active',
    label: 'Active',
    labelKo: '정회원',
    description: 'Approved member in good standing.',
    active: true,
    canLogin: true,
    inHistory: true,
    badge: 'bg-green-100 text-green-800',
  },
  {
    value: 'expelled',
    label: 'Expelled',
    labelKo: '제명',
    description: 'Removed for cause. Cannot sign in, and is dropped from public listings including past presidents.',
    active: false,
    canLogin: false,
    inHistory: false,
    badge: 'bg-red-100 text-red-800',
  },
  {
    value: 'resigned',
    label: 'Resigned',
    labelKo: '탈퇴',
    description: 'Left the association voluntarily. Cannot sign in, but is retained in historical listings.',
    active: false,
    canLogin: false,
    inHistory: true,
    badge: 'bg-charcoal/10 text-charcoal-light',
  },
  {
    value: 'inactive',
    label: 'Inactive',
    labelKo: '휴면',
    description: 'Lapsed or not participating. Hidden from the directory but free to return, so sign-in still works.',
    active: false,
    canLogin: true,
    inHistory: true,
    badge: 'bg-slate-100 text-slate-700',
  },
  {
    value: 'deceased',
    label: 'Deceased',
    labelKo: '고인',
    description: 'Removed from active rosters and birthday mail, but retained in historical listings.',
    active: false,
    canLogin: false,
    inHistory: true,
    badge: 'bg-charcoal/10 text-charcoal-light',
  },
]

export const MEMBER_STATUS_VALUES = MEMBER_STATUSES.map(s => s.value)

// Rows created before the status column existed carry a null status; fall back
// to the is_approved boolean so they read as active or pending as before.
export function normalizeStatus(status, isApproved) {
  if (MEMBER_STATUS_VALUES.includes(status)) return status
  return isApproved ? 'active' : 'pending'
}

export function statusMeta(status, isApproved) {
  const value = normalizeStatus(status, isApproved)
  return MEMBER_STATUSES.find(s => s.value === value)
}

// Only active members appear in the directory, org chart, and member profiles.
export function isActiveMember(status, isApproved) {
  return statusMeta(status, isApproved).active
}

export function canLogin(status, isApproved) {
  return statusMeta(status, isApproved).canLogin
}

// Past presidents and similar historical listings keep everyone except the
// expelled — resigning, lapsing, or dying doesn't undo having served.
export function appearsInHistory(status, isApproved) {
  return statusMeta(status, isApproved).inHistory
}

// Statuses whose members must not appear in historical listings.
export const HISTORY_EXCLUDED_STATUSES = MEMBER_STATUSES
  .filter(s => !s.inHistory && s.value !== 'pending')
  .map(s => s.value)
