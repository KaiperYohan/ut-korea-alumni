'use client'

import { useEffect, useState } from 'react'
import { AUDIENCES, ENTRY_STATUSES, entryStatus, kstToday, slugify } from '@/lib/promotions'
import { isDuesCurrent } from '@/lib/dues'

// Admin tab for promotions: create and schedule them, and review entries.
const inputClass = 'w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange'
const labelClass = 'block text-xs font-medium text-charcoal-light mb-1'

const EMPTY = {
  slug: '', title: '', title_ko: '', body: '', body_ko: '', image_url: '',
  button_label: '', button_label_ko: '', button_url: '', banner_text: '', banner_text_ko: '',
  starts_on: '', ends_on: '', audience: 'everyone', show_popup: true, show_banner: false, enabled: true,
  entry_form: false, entry_screenshot: false, entry_address: false, entry_note: '', entry_note_ko: '',
}

// A starting point for the December 자동이체 gift event; every field can be edited.
function autopayTemplate() {
  const y = Number(kstToday().slice(0, 4))
  return {
    ...EMPTY,
    slug: `autopay-${y}`,
    title_ko: '회비 자동이체 등록 이벤트', title: 'Dues Auto-Transfer Event',
    body_ko: `연회비를 자동이체로 등록해 주신 회원분께 감사 선물을 보내 드립니다.\n\n1. 사용하시는 은행 앱에서 동문회 계좌(토스뱅크 1001-8306-7179, 예금주 장우진)로 매년 10월 1일 50,000원 자동이체(예약이체)를 등록해 주세요.\n2. 등록 완료 화면을 캡처해 아래 양식으로 올려 주세요.\n3. 확인 후 선물을 보내 드립니다.`,
    body: `Set up your annual dues as an automatic transfer and we will send you a thank-you gift.\n\n1. In your banking app, schedule a yearly transfer of 50,000 KRW to the association account (Toss Bank 1001-8306-7179, holder 장우진) on October 1.\n2. Take a screenshot of the confirmation and upload it with the form below.\n3. We will check it and send your gift.`,
    button_label_ko: '참여하기', button_label: 'Take part',
    banner_text_ko: '🎁 회비 자동이체 등록하고 선물 받으세요', banner_text: '🎁 Set up dues auto-transfer and get a gift',
    starts_on: `${y}-12-01`, ends_on: `${y}-12-31`,
    audience: 'members', show_popup: true, show_banner: true,
    entry_form: true, entry_screenshot: true, entry_address: true,
    entry_note_ko: '자동이체(예약이체) 등록 완료 화면을 캡처해 올려 주세요. 받는 분 정보는 선물 발송에만 사용하고 이벤트가 끝나면 파기합니다.',
    entry_note: 'Upload a screenshot of your confirmed automatic transfer. Your delivery details are used only to send the gift and are deleted after the event.',
  }
}

function stateOf(p) {
  const today = kstToday()
  if (!p.enabled) return { label: 'Off', cls: 'bg-charcoal/10 text-charcoal-light' }
  if (today < p.starts_on) return { label: 'Scheduled', cls: 'bg-sky-100 text-sky-800' }
  if (today > p.ends_on) return { label: 'Ended', cls: 'bg-charcoal/10 text-charcoal-light' }
  return { label: 'Running', cls: 'bg-green-100 text-green-800' }
}

export default function PromotionsAdmin() {
  const [promotions, setPromotions] = useState(null)
  const [editing, setEditing] = useState(null) // form object; id present when editing
  const [entriesFor, setEntriesFor] = useState(null)
  const [error, setError] = useState(null)

  const load = async () => {
    const res = await fetch('/api/admin/promotions', { cache: 'no-store' })
    if (!res.ok) { setError('Could not load promotions.'); return }
    setPromotions((await res.json()).promotions)
  }
  useEffect(() => { load() }, [])

  const remove = async p => {
    const n = Object.values(p.entryCounts || {}).reduce((a, b) => a + b, 0)
    if (!confirm(`Delete "${p.title_ko || p.title}"${n ? ` and its ${n} entries (with their screenshots)` : ''}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/promotions?id=${p.id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Delete failed.'); return }
    if (entriesFor?.id === p.id) setEntriesFor(null)
    load()
  }

  if (editing) return <PromotionForm initial={editing} onDone={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} />

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-charcoal">Promotions</h2>
            <p className="text-xs text-charcoal-light mt-0.5">Time-limited campaigns shown as a home-page pop-up and/or the top bar. Each turns itself off after its end date.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditing(autopayTemplate())} className="px-3 py-2 bg-burnt-orange/10 text-burnt-orange text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-burnt-orange/20">+ 자동이체 event template</button>
            <button onClick={() => setEditing({ ...EMPTY, starts_on: kstToday(), ends_on: kstToday() })} className="px-3 py-2 bg-burnt-orange text-white text-xs font-semibold rounded-lg cursor-pointer border-none">+ New promotion</button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {!promotions && !error && <p className="text-sm text-charcoal-light">Loading…</p>}
      {promotions?.length === 0 && <p className="text-sm text-charcoal-light text-center py-8">No promotions yet.</p>}

      {promotions?.map(p => {
        const st = stateOf(p)
        const counts = p.entryCounts || {}
        const total = Object.values(counts).reduce((a, b) => a + b, 0)
        return (
          <div key={p.id} className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {p.image_url && <img src={p.image_url} alt="" className="w-full sm:w-28 h-28 object-cover rounded-lg bg-charcoal/5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-charcoal">{p.title_ko || p.title}</span>
                  <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-xs text-charcoal-light mt-1">
                  {p.starts_on} – {p.ends_on} · {AUDIENCES.find(a => a.value === p.audience)?.label}
                  {' · '}{[p.show_popup && 'pop-up', p.show_banner && 'top bar'].filter(Boolean).join(' + ') || 'page only'}
                </p>
                <p className="text-xs mt-1"><a href={`/promo/${p.slug}`} target="_blank" className="text-burnt-orange">utkorea.org/promo/{p.slug}</a></p>
                {p.entry_form && (
                  <p className="text-xs text-charcoal mt-1">
                    {total} {total === 1 ? 'entry' : 'entries'}
                    {ENTRY_STATUSES.filter(s => counts[s.value]).map(s => ` · ${counts[s.value]} ${s.label.toLowerCase()}`).join('')}
                  </p>
                )}
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0">
                <button onClick={() => setEditing({ ...EMPTY, ...p, image_url: p.image_url || '', button_url: p.button_url || '' })} className="px-3 py-1.5 bg-burnt-orange/10 text-burnt-orange text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-burnt-orange/20">Edit</button>
                {p.entry_form && (
                  <button onClick={() => setEntriesFor(entriesFor?.id === p.id ? null : p)} className="px-3 py-1.5 bg-charcoal text-white text-xs font-semibold rounded-lg cursor-pointer border-none">
                    {entriesFor?.id === p.id ? 'Hide entries' : 'Entries'}
                  </button>
                )}
                <button onClick={() => remove(p)} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-100">Delete</button>
              </div>
            </div>
            {entriesFor?.id === p.id && <EntriesPanel promotion={p} onChange={load} />}
          </div>
        )
      })}
    </div>
  )
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer text-sm text-charcoal">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 w-4 h-4" />
      <span>{label}{hint && <span className="block text-xs text-charcoal-light">{hint}</span>}</span>
    </label>
  )
}

function PromotionForm({ initial, onDone, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id || initial.slug))
  const set = (k, v) => setF(prev => {
    const next = { ...prev, [k]: v }
    if (k === 'title' && !slugTouched) next.slug = slugify(v)
    return next
  })
  const field = k => ({ value: f[k] ?? '', onChange: e => set(k, e.target.value) })

  const upload = async file => {
    if (!file) return
    setUploading(true); setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/events/image', { method: 'POST', body: fd })
    const d = await res.json().catch(() => ({}))
    setUploading(false)
    if (!res.ok) { setError(d.error || 'Upload failed.'); return }
    set('image_url', d.url)
  }

  const save = async e => {
    e.preventDefault()
    setSaving(true); setError(null)
    const res = await fetch('/api/admin/promotions', {
      method: f.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(d.error || 'Save failed.'); return }
    onDone()
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-charcoal">{f.id ? 'Edit promotion' : 'New promotion'}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-charcoal-light bg-transparent border-none cursor-pointer">Cancel</button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelClass}>Title (Korean)</label><input {...field('title_ko')} className={inputClass} /></div>
        <div><label className={labelClass}>Title (English)</label><input {...field('title')} className={inputClass} /></div>
        <div><label className={labelClass}>Text (Korean) — blank line = new paragraph</label><textarea {...field('body_ko')} rows={7} className={inputClass} /></div>
        <div><label className={labelClass}>Text (English)</label><textarea {...field('body')} rows={7} className={inputClass} /></div>
      </section>

      <section>
        <label className={labelClass}>Image / poster (shown in the pop-up, on the page, and in shared-link previews)</label>
        <div className="flex items-center gap-3 flex-wrap">
          {f.image_url && <img src={f.image_url} alt="" className="h-24 rounded-lg border border-charcoal/10" />}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => upload(e.target.files?.[0])} className="text-sm" />
          {uploading && <span className="text-xs text-charcoal-light">Uploading…</span>}
          {f.image_url && <button type="button" onClick={() => set('image_url', '')} className="text-xs text-red-600 bg-transparent border-none cursor-pointer">Remove image</button>}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className={labelClass}>Button (Korean)</label><input {...field('button_label_ko')} className={inputClass} placeholder="참여하기" /></div>
        <div><label className={labelClass}>Button (English)</label><input {...field('button_label')} className={inputClass} placeholder="Take part" /></div>
        <div><label className={labelClass}>Button link (blank = the promotion&apos;s own page)</label><input {...field('button_url')} className={inputClass} placeholder="https://… or /events/31" /></div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div><label className={labelClass}>Starts (KST)</label><input type="date" {...field('starts_on')} className={inputClass} required /></div>
        <div><label className={labelClass}>Ends (KST, inclusive)</label><input type="date" {...field('ends_on')} className={inputClass} required /></div>
        <div className="md:col-span-2">
          <label className={labelClass}>Who sees the pop-up and top bar</label>
          <select value={f.audience} onChange={e => set('audience', e.target.value)} className={inputClass}>
            {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label} — {a.hint}</option>)}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Toggle checked={f.enabled} onChange={v => set('enabled', v)} label="Switched on" hint="Off hides it everywhere, whatever the dates" />
        <Toggle checked={f.show_popup} onChange={v => set('show_popup', v)} label="Home-page pop-up" hint="With “오늘 하루 보지 않기”" />
        <Toggle checked={f.show_banner} onChange={v => set('show_banner', v)} label="Top bar on every page" hint="Links to the promotion" />
      </section>
      {f.show_banner && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelClass}>Top bar text (Korean)</label><input {...field('banner_text_ko')} className={inputClass} maxLength={200} /></div>
          <div><label className={labelClass}>Top bar text (English)</label><input {...field('banner_text')} className={inputClass} maxLength={200} /></div>
        </section>
      )}

      <section className="rounded-lg border border-charcoal/10 p-4 space-y-3">
        <Toggle checked={f.entry_form} onChange={v => set('entry_form', v)} label="Entry form on the promotion page" hint="Logged-in members submit an entry; you review them under Entries" />
        {f.entry_form && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Toggle checked={f.entry_screenshot} onChange={v => set('entry_screenshot', v)} label="Ask for a screenshot" hint="e.g. the 자동이체 confirmation" />
              <Toggle checked={f.entry_address} onChange={v => set('entry_address', v)} label="Ask for recipient, phone and address" hint="For sending gifts" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Instructions above the form (Korean)</label><textarea {...field('entry_note_ko')} rows={3} className={inputClass} /></div>
              <div><label className={labelClass}>Instructions above the form (English)</label><textarea {...field('entry_note')} rows={3} className={inputClass} /></div>
            </div>
          </>
        )}
      </section>

      <section>
        <label className={labelClass}>Page address</label>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-charcoal-light">utkorea.org/promo/</span>
          <input value={f.slug} onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} className={inputClass + ' max-w-xs'} placeholder="autopay-2026" />
        </div>
      </section>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        <button type="submit" disabled={saving || uploading} className="px-4 py-2 bg-burnt-orange text-white text-sm font-semibold rounded-lg cursor-pointer border-none disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        {f.slug && <a href={`/promo/${f.slug}`} target="_blank" className="px-4 py-2 text-sm text-charcoal-light">Preview saved page ↗</a>}
      </div>
    </form>
  )
}

function EntriesPanel({ promotion, onChange }) {
  const [entries, setEntries] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    const res = await fetch(`/api/admin/promotions/${promotion.id}/entries`, { cache: 'no-store' })
    setEntries(res.ok ? (await res.json()).entries : [])
  }
  useEffect(() => { load() }, [promotion.id])

  const update = async (entry, patch) => {
    setEntries(list => list.map(e => (e.id === entry.id ? { ...e, ...(patch.status ? { status: patch.status } : {}), ...(patch.adminNote !== undefined ? { admin_note: patch.adminNote } : {}) } : e)))
    const res = await fetch(`/api/admin/promotions/${promotion.id}/entries`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: entry.id, ...patch }),
    })
    if (!res.ok) { alert('Update failed.'); load() } else if (patch.status) onChange()
  }

  const purge = async () => {
    if (!confirm('Erase every entry’s recipient, phone, address and screenshot? Who took part and their status are kept. Do this once all gifts are sent. This cannot be undone.')) return
    const res = await fetch(`/api/admin/promotions/${promotion.id}/entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'purge' }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { alert(d.error || 'Failed.'); return }
    alert(`Erased the personal details of ${d.purged} entries.`)
    load()
  }

  const downloadCsv = () => {
    const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const headers = ['Name', 'Name (KO)', 'Email', 'Class', 'Status', 'Recipient', 'Phone', 'Address', 'Message', 'Admin note', 'Submitted']
    const rows = (entries || []).map(e => [e.name, e.name_ko, e.email, e.graduation_year, entryStatus(e.status).label, e.recipient_name, e.phone, e.address, e.note, e.admin_note,
      new Date(e.created_at).toLocaleDateString()].map(esc).join(','))
    const blob = new Blob(['﻿' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `promotion_${promotion.slug}_entries.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (!entries) return <p className="text-sm text-charcoal-light mt-4">Loading entries…</p>
  const shown = filter === 'all' ? entries : entries.filter(e => e.status === filter)
  const hasPersonal = entries.some(e => !e.purged_at && (e.address || e.phone || e.screenshot_url))

  return (
    <div className="mt-4 border-t border-charcoal/10 pt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border border-charcoal/15 bg-white">
          <option value="all">All ({entries.length})</option>
          {ENTRY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label} ({entries.filter(e => e.status === s.value).length})</option>)}
        </select>
        <button onClick={downloadCsv} disabled={!entries.length} className="px-3 py-1.5 bg-charcoal text-white text-xs font-semibold rounded-lg cursor-pointer border-none disabled:opacity-40">Download CSV (for shipping)</button>
        {hasPersonal && <button onClick={purge} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-100">Erase personal details</button>}
      </div>
      {shown.length === 0 && <p className="text-sm text-charcoal-light py-4 text-center">No entries.</p>}
      {shown.map(e => (
        <div key={e.id} className="rounded-lg border border-charcoal/10 p-3 flex flex-col md:flex-row gap-3">
          {e.screenshot_url ? (
            <a href={e.screenshot_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img src={e.screenshot_url} alt="Screenshot" className="w-24 h-24 object-cover rounded border border-charcoal/10" />
            </a>
          ) : promotion.entry_screenshot && (
            <div className="w-24 h-24 shrink-0 rounded bg-charcoal/5 text-[0.65rem] text-charcoal-light flex items-center justify-center text-center p-1">{e.purged_at ? 'erased' : 'no image'}</div>
          )}
          <div className="flex-1 min-w-0 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-charcoal">{e.name}</span>
              {e.name_ko && <span className="text-xs text-charcoal-light">({e.name_ko})</span>}
              <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${entryStatus(e.status).badge}`}>{entryStatus(e.status).label}</span>
              {isDuesCurrent(e.dues_year_paid) && <span className="text-[0.6rem] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase">Full</span>}
            </div>
            <p className="text-xs text-charcoal-light">{e.email}{e.graduation_year ? ` · Class of ${e.graduation_year}` : ''} · {new Date(e.created_at).toLocaleString('ko-KR')}</p>
            {e.purged_at ? (
              <p className="text-xs text-charcoal-light mt-1">Personal details erased {new Date(e.purged_at).toLocaleDateString('ko-KR')}</p>
            ) : (promotion.entry_address || e.address) && (
              <p className="text-xs text-charcoal mt-1">{[e.recipient_name, e.phone, e.address].filter(Boolean).join(' · ') || '—'}</p>
            )}
            {e.note && <p className="text-xs text-charcoal mt-1 italic">“{e.note}”</p>}
            <input defaultValue={e.admin_note || ''} onBlur={ev => { if ((ev.target.value || '') !== (e.admin_note || '')) update(e, { adminNote: ev.target.value }) }}
              placeholder="Admin note (only admins see this)" className="mt-2 w-full px-2 py-1 text-xs rounded border border-charcoal/15 bg-white" />
          </div>
          <select value={e.status} onChange={ev => update(e, { status: ev.target.value })} className="self-start px-2 py-1.5 text-xs font-semibold rounded-lg border border-charcoal/15 bg-white">
            {ENTRY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
