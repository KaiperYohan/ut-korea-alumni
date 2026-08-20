// Shared committee/role structure for the organization chart.
//
// Consumed by the public About page (which renders whichever positions exist)
// and the admin org editor (which assigns members to them). Keep this the only
// place committee names, role labels, and translations are defined.
//
// minSlots — assignment slots the admin form always shows for a role. Saved
//   positions beyond that are shown as well, and admins can add more.
// maxSlots — cap for a structurally singular role. The About page's greeting
//   section resolves a single president, so that role is pinned to one.

export const COMMITTEES = [
  {
    key: 'board',
    en: 'Board of Directors',
    ko: '이사회',
    descEn: null,
    descKo: null,
    roles: [
      { role: 'president', en: 'President', ko: '회장', minSlots: 1, maxSlots: 1 },
      { role: 'vice_president', en: 'Vice President', ko: '부회장', minSlots: 2 },
      { role: 'general_secretary', en: 'General Secretary', ko: '총무', minSlots: 1 },
      { role: 'treasurer', en: 'Treasurer', ko: '재무', minSlots: 1 },
    ],
  },
  {
    key: 'executive',
    en: 'Executive Committee',
    ko: '집행위원회',
    descEn: null,
    descKo: null,
    roles: [
      { role: 'chair', en: 'Chair', ko: '위원장', minSlots: 1 },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장', minSlots: 2 },
      { role: 'general_secretary', en: 'General Secretary', ko: '총무', minSlots: 1 },
      { role: 'historian', en: 'Historian', ko: '서기', minSlots: 1 },
    ],
  },
  {
    key: 'membership',
    en: 'Membership Development Committee',
    ko: '회원개발위원회',
    descEn: 'Focuses on increasing alumni engagement and membership, developing programs and benefits to attract and retain members.',
    descKo: '동문 참여 및 회원 확대에 주력하며, 회원 유치와 유지를 위한 프로그램과 혜택을 개발합니다.',
    roles: [
      { role: 'chair', en: 'Chair (Vice President)', ko: '위원장 (부회장)', minSlots: 1 },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장', minSlots: 2 },
      { role: 'member', en: 'Committee Member', ko: '위원', minSlots: 3 },
    ],
  },
  {
    key: 'social',
    en: 'Social Affairs Committee',
    ko: '소셜위원회',
    descEn: 'Oversees all social activities and community events.',
    descKo: '모든 사교 활동과 커뮤니티 행사를 총괄합니다.',
    roles: [
      { role: 'chair', en: 'Chair (Vice President)', ko: '위원장 (부회장)', minSlots: 1 },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장', minSlots: 2 },
      { role: 'member', en: 'Committee Member', ko: '위원', minSlots: 3 },
    ],
  },
  {
    key: 'nominating',
    en: 'Nominating Committee',
    ko: '인사위원회',
    descEn: 'Identifies and recruits candidates for board positions, ensuring a diverse and skilled leadership team.',
    descKo: '이사회 후보자를 발굴하고 모집하여 다양하고 유능한 리더십 팀을 구성합니다.',
    roles: [
      { role: 'chair', en: 'Chair', ko: '위원장', minSlots: 1 },
      { role: 'member', en: 'Committee Member', ko: '위원', minSlots: 3 },
    ],
  },
  {
    key: 'finance',
    en: 'Finance and Planning Committee',
    ko: '재정기획위원회',
    descEn: "Responsible for overseeing the association's financial health, managing budgets, investments, and financial planning.",
    descKo: '동문회의 재정 건전성을 감독하고 예산, 투자 및 재정 계획을 관리합니다.',
    roles: [
      { role: 'chair', en: 'Chair (Treasurer)', ko: '위원장 (재무)', minSlots: 1 },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장', minSlots: 2 },
      { role: 'member', en: 'Committee Member', ko: '위원', minSlots: 3 },
    ],
  },
]

export const COMMITTEE_KEYS = COMMITTEES.map(c => c.key)

// Seed the admin editor's slot state from saved positions.
// Returns { [committeeKey]: { [role]: ['12', '', '7', ...] } }, where each entry
// is a member id as a string ('' meaning an unfilled slot).
export function buildOrgSlots(positions) {
  const slots = {}
  for (const committee of COMMITTEES) {
    slots[committee.key] = {}
    for (const roleInfo of committee.roles) {
      const assigned = (positions || [])
        .filter(p => p.committee === committee.key && p.role === roleInfo.role && p.member_id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(p => String(p.member_id))
      const min = roleInfo.minSlots ?? 1
      while (assigned.length < min) assigned.push('')
      // Never truncate to maxSlots — legacy overfill stays visible and removable
      // rather than being silently dropped on the next save.
      slots[committee.key][roleInfo.role] = assigned
    }
  }
  return slots
}
