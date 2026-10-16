import { currentDuesYear } from '@/lib/dues'
import { campaignsFor, enqueueCampaign, deliverQueued, noticeAudience } from '@/lib/duesNotices'

// Daily (10:00 KST). On campaign days it queues end-of-year dues notices — both
// versions on Oct 1, renewal reminders on Dec 1, 15 and 28 — and every day it
// sends what is queued, within the daily email cap, so a large campaign finishes
// over a few days instead of hitting the provider's limit.
//
// ?dryRun=true reports today's campaigns and audience without writing or sending.
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(request.url).searchParams.get('dryRun') === 'true'

  const kst = new Date(Date.now() + 9 * 3600e3)
  const month = kst.getUTCMonth() + 1
  const day = kst.getUTCDate()
  const duesYear = currentDuesYear()
  const campaigns = campaignsFor(month, day, duesYear)

  try {
    if (dryRun) {
      const audience = await noticeAudience()
      return Response.json({
        dryRun: true, kstDate: `${month}/${day}`, duesYear,
        campaignsToday: campaigns.map(c => c.key),
        audience: { renewal: audience.renewal.length, benefits: audience.benefits.length },
      })
    }
    const queued = []
    for (const c of campaigns) queued.push(await enqueueCampaign(c.key, c.versions))
    const delivery = await deliverQueued()
    return Response.json({ success: true, kstDate: `${month}/${day}`, queued, delivery })
  } catch (error) {
    console.error('Dues notice cron error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
