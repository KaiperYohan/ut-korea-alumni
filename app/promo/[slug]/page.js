'use client'

import { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../components/LanguageProvider'
import { ImageLightbox } from '../../components/EventImage'
import { linkify } from '@/lib/linkify'
import { entryStatus, pick } from '@/lib/promotions'

const T = {
  ko: {
    notFound: '찾을 수 없는 페이지입니다.', back: '홈으로',
    preview: '관리자 미리보기 — 아직 공개되지 않았거나 꺼져 있는 프로모션입니다.',
    period: '기간', ended: '종료된 이벤트입니다.',
    join: '참여하기', loginFirst: '참여하려면 로그인해 주세요.', login: '로그인', signup: '회원가입',
    visitorNo: '이 이벤트는 동문 회원 대상입니다.',
    yourEntry: '내 참여 내역', status: '상태', submittedAt: '접수일',
    screenshot: '인증 화면 캡처', screenshotHint: '이미지 파일 (JPG, PNG, HEIC · 최대 8MB)', keepScreenshot: '새 파일을 고르지 않으면 이전 이미지가 유지됩니다.',
    recipient: '받는 분', phone: '연락처', address: '배송 주소', note: '남기실 말 (선택)',
    consent: '이벤트 진행(참여 확인 및 경품 발송)을 위해 위 정보를 수집·이용하는 데 동의합니다. 이벤트가 끝나면 파기합니다.',
    submit: '제출하기', update: '수정하기', submitting: '제출 중…', withdraw: '참여 취소',
    withdrawConfirm: '참여를 취소할까요? 올린 이미지와 정보가 삭제됩니다.',
    thanks: '접수되었습니다. 확인 후 안내해 드리겠습니다.', reviewed: '검토가 끝난 참여는 수정할 수 없습니다.',
    error: '문제가 생겼습니다. 다시 시도해 주세요.',
  },
  en: {
    notFound: 'This page could not be found.', back: 'Home',
    preview: 'Admin preview — this promotion has not started yet or is switched off.',
    period: 'Runs', ended: 'This promotion has ended.',
    join: 'Take part', loginFirst: 'Please log in to take part.', login: 'Log in', signup: 'Sign up',
    visitorNo: 'This promotion is for alumni members.',
    yourEntry: 'Your entry', status: 'Status', submittedAt: 'Submitted',
    screenshot: 'Screenshot', screenshotHint: 'Image file (JPG, PNG, HEIC · up to 8MB)', keepScreenshot: 'Leave empty to keep the image you sent before.',
    recipient: 'Recipient', phone: 'Phone', address: 'Delivery address', note: 'Message (optional)',
    consent: 'I agree to the use of this information to run this promotion (checking my entry and sending the gift). It is deleted when the promotion ends.',
    submit: 'Submit', update: 'Update', submitting: 'Submitting…', withdraw: 'Withdraw',
    withdrawConfirm: 'Withdraw your entry? The image and details you sent will be deleted.',
    thanks: 'Received — we will be in touch after checking it.', reviewed: 'Entries that have been reviewed can no longer be changed.',
    error: 'Something went wrong. Please try again.',
  },
}

const fmtDate = (iso, ko) => {
  const [y, m, d] = iso.split('-').map(Number)
  return ko ? `${y}.${m}.${d}` : new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function PromotionPage({ params }) {
  const { slug } = use(params)
  const { locale } = useLanguage()
  const ko = locale === 'ko'
  const t = T[ko ? 'ko' : 'en']
  const [data, setData] = useState(null)
  const [missing, setMissing] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const reload = useCallback(async () => {
    const res = await fetch(`/api/promotions/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) { setMissing(true); return }
    setData(await res.json())
  }, [slug])

  useEffect(() => { reload() }, [reload])

  if (missing) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-5 text-center">
        <p className="text-charcoal-light mb-4">{t.notFound}</p>
        <Link href="/" className="btn-primary no-underline">{t.back}</Link>
      </div>
    )
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">…</div>

  const p = data.promotion
  const title = pick(p, 'title', locale)
  const body = pick(p, 'body', locale)
  const buttonLabel = pick(p, 'button_label', locale)
  const external = p.button_url && /^https?:\/\//.test(p.button_url)

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-2xl mx-auto">
        {data.preview && (
          <p className="mb-4 text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800">{t.preview}</p>
        )}
        <div className="card overflow-hidden">
          {p.image_url && (
            <button type="button" onClick={() => setLightbox(0)} className="block w-full bg-charcoal border-none p-0 cursor-zoom-in">
              <img src={p.image_url} alt={title} className="w-full max-h-[70vh] object-contain mx-auto" />
            </button>
          )}
          <div className="p-6 md:p-8">
            <p className="text-xs font-semibold text-burnt-orange uppercase tracking-wider mb-2">
              {t.period} · {fmtDate(p.starts_on, ko)} – {fmtDate(p.ends_on, ko)}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal mb-4">{title}</h1>
            {body && <div className="text-charcoal leading-relaxed whitespace-pre-wrap">{linkify(body)}</div>}
            {p.button_url && buttonLabel && (
              <a href={p.button_url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
                className="btn-primary inline-block mt-6 no-underline">{buttonLabel}</a>
            )}
          </div>
        </div>

        {p.entry_form && <EntrySection data={data} t={t} ko={ko} locale={locale} slug={slug} onChange={reload} />}
      </div>
      {p.image_url && (
        <ImageLightbox images={[p.image_url]} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} closeLabel={ko ? '닫기' : 'Close'} />
      )}
    </div>
  )
}

function EntrySection({ data, t, ko, locale, slug, onChange }) {
  const p = data.promotion
  const entry = data.entry
  const [form, setForm] = useState({ recipient_name: '', phone: '', address: '', note: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (entry) setForm({ recipient_name: entry.recipient_name || '', phone: entry.phone || '', address: entry.address || '', note: entry.note || '' })
  }, [entry])
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-charcoal/15 bg-warm-white text-charcoal focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange text-sm'
  const note = pick(p, 'entry_note', locale)
  const wrap = children => (
    <div className="card p-6 md:p-8 mt-6">
      <h2 className="font-display text-xl font-bold text-charcoal mb-3">{entry ? t.yourEntry : t.join}</h2>
      {children}
    </div>
  )

  const statusLine = entry && (
    <p className="text-sm mb-4">
      {t.status}: <span className={`text-xs font-bold px-2 py-0.5 rounded ${entryStatus(entry.status).badge}`}>{ko ? entryStatus(entry.status).labelKo : entryStatus(entry.status).label}</span>
      <span className="text-charcoal-light"> · {t.submittedAt} {new Date(entry.created_at).toLocaleDateString(ko ? 'ko-KR' : 'en-US')}</span>
    </p>
  )

  if (!data.loggedIn) {
    const back = encodeURIComponent(`/promo/${slug}`)
    return wrap(<>
      {note && <p className="text-sm text-charcoal-light whitespace-pre-wrap mb-4">{note}</p>}
      <p className="text-sm text-charcoal mb-4">{data.ended ? t.ended : t.loginFirst}</p>
      {!data.ended && (
        <div className="flex gap-2">
          <Link href={`/login?callbackUrl=${back}`} className="btn-primary no-underline">{t.login}</Link>
          <Link href="/signup" className="btn-secondary no-underline">{t.signup}</Link>
        </div>
      )}
    </>)
  }
  if (data.isVisitor) return wrap(<p className="text-sm text-charcoal-light">{t.visitorNo}</p>)
  if (entry && entry.status !== 'submitted') return wrap(<>{statusLine}<p className="text-sm text-charcoal-light">{t.reviewed}</p></>)
  if (!data.live) return wrap(<>{statusLine}<p className="text-sm text-charcoal-light">{t.ended}</p></>)

  const submit = async e => {
    e.preventDefault()
    setMessage(null)
    if (!consent) { setMessage({ error: true, text: t.consent }); return }
    setBusy(true)
    const fd = new FormData()
    for (const [k, v] of Object.entries(form)) fd.append(k, v)
    fd.append('consent', 'true')
    if (file) fd.append('screenshot', file)
    try {
      const res = await fetch(`/api/promotions/${encodeURIComponent(slug)}/entry`, { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMessage({ error: true, text: d.error || t.error }); return }
      setFile(null); setConsent(false)
      setMessage({ text: t.thanks })
      await onChange()
    } catch {
      setMessage({ error: true, text: t.error })
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    if (!confirm(t.withdrawConfirm)) return
    setBusy(true)
    const res = await fetch(`/api/promotions/${encodeURIComponent(slug)}/entry`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) { setMessage({ error: true, text: t.error }); return }
    setForm({ recipient_name: '', phone: '', address: '', note: '' })
    setMessage(null)
    await onChange()
  }

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const shownImage = preview || entry?.screenshot_url

  return wrap(
    <form onSubmit={submit} className="space-y-4">
      {statusLine}
      {note && <p className="text-sm text-charcoal-light whitespace-pre-wrap">{note}</p>}
      {p.entry_screenshot && (
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">{t.screenshot} *</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-charcoal file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-burnt-orange/10 file:text-burnt-orange file:font-semibold file:cursor-pointer" />
          <p className="text-xs text-charcoal-light mt-1">{t.screenshotHint}{entry?.screenshot_url ? ` ${t.keepScreenshot}` : ''}</p>
          {shownImage && <img src={shownImage} alt="" className="mt-2 max-h-56 rounded-lg border border-charcoal/10" />}
        </div>
      )}
      {p.entry_address && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t.recipient} *</label>
              <input value={form.recipient_name} onChange={set('recipient_name')} required maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t.phone} *</label>
              <input type="tel" value={form.phone} onChange={set('phone')} required maxLength={30} className={inputClass} placeholder="010-0000-0000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">{t.address} *</label>
            <textarea value={form.address} onChange={set('address')} required maxLength={500} rows={2} className={inputClass + ' resize-none'} />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1.5">{t.note}</label>
        <textarea value={form.note} onChange={set('note')} maxLength={1000} rows={2} className={inputClass + ' resize-none'} />
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4" />
        <span className="text-sm text-charcoal">{t.consent} <span className="text-red-500">*</span></span>
      </label>
      {message && (
        <p className={`text-sm rounded-lg px-3 py-2 ${message.error ? 'text-red-700 bg-red-50 border border-red-200' : 'text-green-800 bg-green-50 border border-green-200'}`}>{message.text}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">{busy ? t.submitting : entry ? t.update : t.submit}</button>
        {entry && (
          <button type="button" onClick={withdraw} disabled={busy} className="btn-secondary disabled:opacity-60">{t.withdraw}</button>
        )}
      </div>
    </form>
  )
}
