// Profile completion calculator — shared between profile page and directory
// Each field is worth equal weight. Social links count filled social accounts
// (up to 2) so members without TikTok/YouTube can still reach 100%.

const PROFILE_FIELDS = [
  { key: 'profilePhoto', check: (m) => !!(m.profile_image_url || m.profileImageUrl) },
  { key: 'nameKo', check: (m) => !!(m.name_ko || m.nameKo) },
  { key: 'graduationYear', check: (m) => !!(m.graduation_year || m.graduationYear) },
  { key: 'major', check: (m) => !!m.major },
  { key: 'location', check: (m) => !!m.location },
  { key: 'company', check: (m) => !!m.company },
  { key: 'title', check: (m) => !!m.title },
  { key: 'phone', check: (m) => !!m.phone },
  { key: 'bio', check: (m) => !!m.bio },
  { key: 'interests', check: (m) => !!m.interests },
]

// Count how many social accounts are filled (linkedin, instagram, tiktok, youtube)
function getSocialCount(member) {
  return [member.linkedin, member.instagram, member.tiktok, member.youtube, member.twitter]
    .filter(Boolean).length
}

const SOCIAL_TARGET = 2 // need 2 social links for full credit
const TOTAL_POINTS = PROFILE_FIELDS.length + SOCIAL_TARGET // 10 + 2 = 12

export function getProfileCompletion(member) {
  const fieldPoints = PROFILE_FIELDS.filter(f => f.check(member)).length
  const socialPoints = Math.min(getSocialCount(member), SOCIAL_TARGET)
  const pct = Math.round(((fieldPoints + socialPoints) / TOTAL_POINTS) * 100)
  return Math.min(pct, 100)
}

export function getMissingFields(member) {
  const missing = PROFILE_FIELDS.filter(f => !f.check(member)).map(f => f.key)
  if (getSocialCount(member) < SOCIAL_TARGET) {
    missing.push('socialLinks')
  }
  return missing
}
