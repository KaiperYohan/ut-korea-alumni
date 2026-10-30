import { sql } from '@/lib/db'

export async function GET(request) {
  // Verify cron secret (Vercel cron or manual trigger)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get today's MMDD in KST (UTC+9)
    const now = new Date()
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(kst.getUTCDate()).padStart(2, '0')
    const todayMMDD = mm + dd

    // Find members whose birthday MMDD matches today (birthday is YYMMDD, so last 4 chars = MMDD)
    const { rows: birthdayMembers } = await sql`
      SELECT id, name, name_ko, graduation_year, birthday
      FROM members
      WHERE is_approved = true
        AND COALESCE(membership_level, 'general') <> 'visitor'
        AND birthday IS NOT NULL
        AND LENGTH(birthday) = 6
        AND SUBSTRING(birthday FROM 3 FOR 4) = ${todayMMDD}
    `

    if (birthdayMembers.length === 0) {
      return Response.json({ success: true, message: 'No birthdays today', created: 0 })
    }

    // Check which birthday posts already exist today (avoid duplicates)
    const todayStart = new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()).toISOString()
    const { rows: existing } = await sql`
      SELECT author_id FROM news
      WHERE category = 'members_news'
        AND subcategory = 'birthday'
        AND created_at >= ${todayStart}
    `
    const alreadyPosted = new Set(existing.map(r => r.author_id))

    let created = 0
    for (const member of birthdayMembers) {
      if (alreadyPosted.has(member.id)) continue

      const nameEn = member.name
      const nameKo = member.name_ko || member.name
      const gradYear = member.graduation_year ? ` (Class of ${member.graduation_year})` : ''
      const gradYearKo = member.graduation_year ? ` (${member.graduation_year}년 졸업)` : ''

      const titleEn = `Happy Birthday, ${nameEn}!`
      const titleKo = `${nameKo}님, 생일 축하합니다!`
      const contentEn = `Wishing a wonderful birthday to our fellow Longhorn ${nameEn}${gradYear}! 🤘`
      const contentKo = `동문 ${nameKo}${gradYearKo}님의 생일을 축하합니다! 🤘`

      await sql`
        INSERT INTO news (title, title_ko, content, content_ko, author_id, category, subcategory, approval_status, published, created_at, updated_at)
        VALUES (${titleEn}, ${titleKo}, ${contentEn}, ${contentKo}, ${member.id}, 'members_news', 'birthday', 'approved', true, NOW(), NOW())
      `
      created++
    }

    return Response.json({ success: true, created, checked: birthdayMembers.length })
  } catch (error) {
    console.error('Birthday cron error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
