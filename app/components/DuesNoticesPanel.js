'use client'

import { useEffect, useState } from 'react'
import DuesNoticeEditor from './DuesNoticeEditor'

// Dues tab panel for the end-of-year notices: who gets which version, how each
// campaign is going, a test send to yourself, and a manual send of the opening
// notice (for a year whose Oct 1 run was missed).
export default function DuesNoticesPanel() {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/dues/notices')
      if (res.ok) setData(await res.json())
    } catch {}
  }
  useEffect(() => { load() }, [])

  const run = async (action) => {
    if (action === 'send') {
      const total = (data?.audience.renewal.length || 0) + (data?.audience.benefits.length || 0)
      if (!confirm(`Email the ${data?.duesYear} opening notice to ${total} members?\n\nUp to ${data?.dailyCap} go out today; the rest are sent automatically over the next days. Anyone already sent this notice is skipped.`)) return
    }
    setBusy(action); setMessage(null)
    const res = await fetch('/api/admin/dues/notices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setMessage({ error: true, text: d.error || 'Failed.' }); return }
    setMessage({ text: action === 'test'
      ? `Sent both versions to ${d.sentTo}.`
      : `Queued ${d.queued.queued}. Sent ${d.delivery.sent} now${d.delivery.deferred ? ' (email limit reached — the rest go out tomorrow)' : ''}${d.delivery.failed ? `, ${d.delivery.failed} failed` : ''}.` })
    load()
  }

  const byCampaign = {}
  for (const r of data?.campaigns || []) {
    byCampaign[r.campaign] = byCampaign[r.campaign] || {}
    byCampaign[r.campaign][r.status] = (byCampaign[r.campaign][r.status] || 0) + r.n
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-charcoal">End-of-year notices</h2>
          <p className="text-xs text-charcoal-light mt-1">
            Emailed automatically on Oct 1 (both versions) and Dec 1, 15, 28 (renewal reminders), and shown to members
            when they sign in from Oct to Dec. Executives and members who already paid are left out.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => run('test')} disabled={!!busy}
            className="px-3 py-2 bg-charcoal/10 text-charcoal text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-charcoal/20 disabled:opacity-50">
            {busy === 'test' ? 'Sending…' : 'Send test to me'}
          </button>
          <button onClick={() => run('send')} disabled={!!busy || !data}
            className="px-3 py-2 bg-burnt-orange text-white text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-burnt-dark disabled:opacity-50">
            {busy === 'send' ? 'Sending…' : 'Send opening notice now'}
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm rounded-lg px-3 py-2 mt-3 ${message.error ? 'text-red-700 bg-red-50 border border-red-200' : 'bg-cream-light/60'}`}>{message.text}</p>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[['renewal', 'Renewal — full members to renew', 'text-burnt-orange'], ['benefits', 'Benefits — general members', 'text-charcoal']].map(([key, label, tone]) => (
            <details key={key} className="rounded-xl bg-cream-light/50 p-3">
              <summary className="cursor-pointer">
                <span className="text-[0.65rem] uppercase tracking-wide text-charcoal-light font-medium">{label}</span>
                <span className={`block font-display text-xl font-bold ${tone}`}>{data.audience[key].length}</span>
              </summary>
              <p className="text-xs text-charcoal-light mt-2 leading-relaxed">{data.audience[key].map(m => m.name).join(', ') || '—'}</p>
            </details>
          ))}
        </div>
      )}

      {Object.keys(byCampaign).length > 0 && (
        <div className="mt-4 text-xs text-charcoal-light space-y-1">
          {Object.entries(byCampaign).map(([c, s]) => (
            <div key={c}><span className="font-medium text-charcoal">{c}</span>: {Object.entries(s).map(([k, n]) => `${n} ${k}`).join(' · ')}</div>
          ))}
        </div>
      )}

      <DuesNoticeEditor />
    </div>
  )
}
