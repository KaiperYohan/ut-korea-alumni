'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  NOTICE_VERSIONS, NOTICE_DEFAULTS, PLACEHOLDERS, noticeSettingKey, resolveTemplate,
  unknownPlaceholders, duesNoticeContent,
} from '@/lib/duesNoticeTemplate'
import { currentDuesYear, duesDeadline, duesLapseDate, paidThrough, duesRates } from '@/lib/dues'

// Edits the wording of the two end-of-year dues emails. Saved to site_settings;
// a field left blank uses the default. The preview is the real email, rendered
// with this year's dates and amount for a sample member.
const LABELS = { renewal: 'Renewal — full members', benefits: 'Benefits — general members' }
const FIELD_LABELS = { subject: 'Subject', ko: 'Korean text', en: 'English text' }

export default function DuesNoticeEditor() {
  const [settings, setSettings] = useState(null)
  const [drafts, setDrafts] = useState(null)
  const [version, setVersion] = useState('renewal')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => (r.ok ? r.json() : null)).then(d => {
      const s = d?.settings || {}
      setSettings(s)
      setDrafts(Object.fromEntries(NOTICE_VERSIONS.map(v => [v, resolveTemplate(v, s)])))
    }).catch(() => setMessage({ error: true, text: 'Could not load the saved wording.' }))
  }, [])

  const ctx = useMemo(() => {
    const y = currentDuesYear()
    return { duesYear: y, amount: duesRates(settings || {}).general, deadline: duesDeadline(y), lapseDate: duesLapseDate(y), paidThrough: paidThrough(y) }
  }, [settings])

  if (!drafts) return <p className="text-xs text-charcoal-light mt-4">{message?.text || 'Loading wording…'}</p>

  const draft = drafts[version]
  const saved = resolveTemplate(version, settings)
  const dirty = ['subject', 'ko', 'en'].some(f => draft[f] !== saved[f])
  const unknown = [...new Set(['subject', 'ko', 'en'].flatMap(f => unknownPlaceholders(draft[f])))]
  const preview = duesNoticeContent(version, '김진홍', ctx, draft, typeof window !== 'undefined' ? window.location.origin : undefined)

  const setField = (field, value) => setDrafts(prev => ({ ...prev, [version]: { ...prev[version], [field]: value } }))

  const save = async () => {
    if (unknown.length && !confirm(`These placeholders are not recognised and will appear as typed: ${unknown.map(u => `{${u}}`).join(', ')}\n\nSave anyway?`)) return
    setSaving(true); setMessage(null)
    // A field equal to the default is stored blank, so later improvements to the
    // default reach it instead of a frozen copy.
    const payload = {}
    for (const f of ['subject', 'ko', 'en']) {
      payload[noticeSettingKey(version, f)] = draft[f].trim() === NOTICE_DEFAULTS[version][f] ? '' : draft[f]
    }
    const res = await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: payload }),
    })
    setSaving(false)
    if (!res.ok) { setMessage({ error: true, text: 'Save failed.' }); return }
    const next = { ...settings }
    for (const [k, v] of Object.entries(payload)) { if (v.trim()) next[k] = v; else delete next[k] }
    setSettings(next)
    setMessage({ text: `Saved the ${version} email. "Send test to me" now uses this wording.` })
  }

  const resetToDefault = () => setDrafts(prev => ({ ...prev, [version]: { ...NOTICE_DEFAULTS[version] } }))

  return (
    <div className="mt-5 border-t border-charcoal/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-charcoal">Email wording</h3>
        <div className="flex gap-1">
          {NOTICE_VERSIONS.map(v => (
            <button key={v} onClick={() => setVersion(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border-none ${version === v ? 'bg-burnt-orange text-white' : 'bg-charcoal/10 text-charcoal'}`}>
              {LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {['subject', 'ko', 'en'].map(field => (
            <label key={field} className="block">
              <span className="block text-xs font-medium text-charcoal mb-1">{FIELD_LABELS[field]}</span>
              {field === 'subject' ? (
                <input value={draft[field]} onChange={e => setField(field, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm" />
              ) : (
                <textarea value={draft[field]} onChange={e => setField(field, e.target.value)} rows={field === 'ko' ? 6 : 4}
                  className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm leading-relaxed" />
              )}
            </label>
          ))}

          <div className="text-[0.7rem] text-charcoal-light leading-relaxed bg-cream-light/60 rounded-lg p-3">
            <p className="mb-1">Blank line = new paragraph · <code>**bold**</code> · placeholders are filled in for each member:</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {PLACEHOLDERS.map(([k, desc, eg]) => (
                <span key={k} title={`${desc}, e.g. ${eg}`}><code className="text-burnt-orange">{`{${k}}`}</code> {desc}</span>
              ))}
            </div>
            <p className="mt-2">The benefits list, payment details, transfer tip and button are added automatically.</p>
          </div>

          {unknown.length > 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Not recognised, will appear as typed: {unknown.map(u => `{${u}}`).join(', ')}
            </p>
          )}
          {message && (
            <p className={`text-xs rounded-lg px-3 py-2 ${message.error ? 'text-red-700 bg-red-50 border border-red-200' : 'bg-cream-light/60'}`}>{message.text}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={saving || !dirty}
              className="px-4 py-2 bg-burnt-orange text-white text-xs font-semibold rounded-lg cursor-pointer border-none disabled:opacity-40">
              {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
            </button>
            {dirty && (
              <button onClick={() => setDrafts(prev => ({ ...prev, [version]: saved }))}
                className="px-4 py-2 bg-charcoal/10 text-charcoal text-xs font-semibold rounded-lg cursor-pointer border-none">Discard changes</button>
            )}
            <button onClick={resetToDefault}
              className="px-4 py-2 bg-transparent text-charcoal-light text-xs font-semibold rounded-lg cursor-pointer border border-charcoal/15">Reset to default</button>
          </div>
        </div>

        <div>
          <p className="text-xs text-charcoal-light mb-1">Preview · <span className="text-charcoal">{preview.subject}</span></p>
          <iframe title="Email preview" srcDoc={`<meta charset="utf-8"><body style="margin:0;background:#f4f4f4">${preview.html}</body>`}
            className="w-full h-[640px] rounded-lg border border-charcoal/10 bg-white" sandbox="" />
        </div>
      </div>
    </div>
  )
}
