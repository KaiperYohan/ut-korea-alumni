'use client'

import { useEffect, useState } from 'react'
import MemberPicker from './MemberPicker'

// Dues tab panel: upload a Toss 모임통장 거래내역서 PDF, see what was recorded
// automatically, and resolve the deposits that need a person to look at them.
const kst = (iso) => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')

export default function DuesBankImport({ members, onRecorded }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [queue, setQueue] = useState({ pending: [], recent: [] })
  const [choice, setChoice] = useState({})
  const [acting, setActing] = useState(null)

  const loadQueue = async () => {
    try {
      const res = await fetch('/api/admin/dues/deposits')
      if (res.ok) setQueue(await res.json())
    } catch {}
  }
  useEffect(() => { loadQueue() }, [])

  const upload = async (file) => {
    if (!file) return
    setBusy(true); setError(null); setResult(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/admin/dues/import', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Import failed.')
      else { setResult(data); await loadQueue(); if (data.recorded) onRecorded?.() }
    } catch {
      setError('Import failed.')
    }
    setBusy(false)
  }

  const resolve = async (dep, action) => {
    const memberId = choice[dep.id] ?? dep.suggested_member_id
    if (action === 'approve' && !memberId) { alert('Choose the member this deposit is for.'); return }
    setActing(dep.id)
    const res = await fetch('/api/admin/dues/deposits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dep.id, action, memberId: memberId ? Number(memberId) : undefined }),
    })
    const data = await res.json().catch(() => ({}))
    setActing(null)
    if (!res.ok) { alert(data.error || 'Failed.'); return }
    await loadQueue()
    if (action === 'approve') onRecorded?.()
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-charcoal">Import Toss statement</h2>
          <p className="text-xs text-charcoal-light mt-1">
            Toss 앱 → 모임통장 → 관리 → 거래내역서 → PDF. 50,000원 deposits since Oct 1 that match one general
            member are recorded as dues; everything else waits below. Uploading the same statement again is safe.
          </p>
        </div>
        <label className={`btn-primary !py-2 !px-4 text-sm cursor-pointer shrink-0 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          {busy ? 'Reading…' : 'Upload PDF'}
          <input type="file" accept="application/pdf,.pdf" className="hidden"
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{error}</p>}
      {result && (
        <div className="text-sm bg-cream-light/60 rounded-lg px-3 py-2 mt-3">
          Read {result.transactions} transactions. <strong className="text-green-700">{result.recorded} recorded as dues</strong>,{' '}
          <strong className="text-amber-700">{result.review} to review</strong>
          {result.alreadyImported ? `, ${result.alreadyImported} already imported` : ''}.
          {result.noAccount ? ` ${result.noAccount} from people with no account.` : ''}
        </div>
      )}

      <h3 className="text-sm font-semibold text-charcoal mt-5 mb-2">Needs review ({queue.pending.length})</h3>
      {!queue.pending.length && <p className="text-xs text-charcoal-light">Nothing waiting.</p>}
      <div className="space-y-2">
        {queue.pending.map(dep => (
          <div key={dep.id} className="border border-amber-200 bg-amber-50/40 rounded-xl p-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-charcoal">{dep.memo || '(no memo)'}</span>
              <span className="text-charcoal-light">{dep.amount.toLocaleString()}원 · {kst(dep.occurred_at)}</span>
              <span className="text-xs text-amber-800">{dep.reason}</span>
            </div>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0">
                <MemberPicker
                  members={members}
                  value={choice[dep.id] ?? dep.suggested_member_id ?? ''}
                  onChange={(id) => setChoice(prev => ({ ...prev, [dep.id]: id }))}
                  emptyLabel={dep.no_account ? '— No account yet —' : '— Choose member —'}
                  className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm"
                  ariaLabel={`Member for deposit ${dep.memo}`}
                />
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => resolve(dep, 'approve')} disabled={acting === dep.id}
                  className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-green-700 disabled:opacity-50">
                  Record as dues
                </button>
                <button onClick={() => resolve(dep, 'skip')} disabled={acting === dep.id}
                  className="px-3 py-2 bg-charcoal/10 text-charcoal text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-charcoal/20 disabled:opacity-50">
                  Not dues
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {queue.recent.length > 0 && (
        <details className="mt-5">
          <summary className="text-sm font-semibold text-charcoal cursor-pointer">Recently processed ({queue.recent.length})</summary>
          <div className="mt-2 space-y-1 text-xs text-charcoal-light">
            {queue.recent.map(dep => (
              <div key={dep.id} className="flex flex-wrap gap-x-3">
                <span className={dep.status === 'skipped' ? '' : 'text-green-700 font-medium'}>
                  {dep.status === 'auto_recorded' ? 'Auto' : dep.status === 'approved' ? 'Approved' : 'Skipped'}
                </span>
                <span className="text-charcoal">{dep.memo}</span>
                <span>{kst(dep.occurred_at)}</span>
                {dep.member_name && <span>→ {dep.member_name_ko || dep.member_name}</span>}
              </div>
            ))}
            <p className="pt-1">To undo an automatic recording, remove the payment in the member's row below.</p>
          </div>
        </details>
      )}
    </div>
  )
}
