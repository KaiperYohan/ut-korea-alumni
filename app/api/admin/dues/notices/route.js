import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { currentDuesYear } from '@/lib/dues'
import { noticeAudience, enqueueCampaign, deliverQueued, noticeStats, emailContext, readNoticeTemplates, DAILY_CAP } from '@/lib/duesNotices'
import { sendDuesNoticeEmail } from '@/lib/email'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.isAdmin ? session : null
}

// Who gets which notice now, and how each campaign is progressing.
export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const audience = await noticeAudience()
  return Response.json({
    duesYear: audience.duesYear,
    dailyCap: DAILY_CAP,
    audience: {
      renewal: audience.renewal.map(m => ({ id: m.id, name: m.name_ko || m.name })),
      benefits: audience.benefits.map(m => ({ id: m.id, name: m.name_ko || m.name })),
    },
    campaigns: await noticeStats(),
  })
}

// { action: 'test' }  — send both versions to the signed-in admin only.
// { action: 'send' }  — queue this dues year's opening notice (both versions) and
//                       start sending; the daily cron finishes anything over the cap.
export async function POST(request) {
  const session = await requireAdmin()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { action } = await request.json().catch(() => ({}))
  const duesYear = currentDuesYear()

  try {
    if (action === 'test') {
      // The saved wording, so a test shows exactly what members would receive.
      const ctx = await emailContext(duesYear)
      const templates = await readNoticeTemplates()
      const name = session.user.nameKo || session.user.name || ''
      for (const version of ['renewal', 'benefits']) {
        await sendDuesNoticeEmail(session.user.email, name, { version, template: templates[version], ...ctx })
      }
      return Response.json({ sentTo: session.user.email, versions: ['renewal', 'benefits'] })
    }
    if (action === 'send') {
      const queued = await enqueueCampaign(`${duesYear}-opening`, ['renewal', 'benefits'])
      const delivery = await deliverQueued()
      return Response.json({ queued, delivery })
    }
    return Response.json({ error: "action must be 'test' or 'send'" }, { status: 400 })
  } catch (error) {
    console.error('Dues notice admin error:', error)
    return Response.json({ error: error.message }, { status: error.statusCode === 429 ? 429 : 500 })
  }
}
