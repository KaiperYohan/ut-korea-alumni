'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from './LanguageProvider'
import usePromotions, { promoHref } from './usePromotions'
import { kstToday, pick } from '@/lib/promotions'

// Home-page pop-up for running promotions, one at a time. "오늘 하루 보지 않기"
// hides a promotion until tomorrow (KST); closing it hides it for this visit.
const hideKey = id => `promoHide:${id}`
const closedKey = id => `promoClosed:${id}`

function hiddenNow(id) {
  try {
    if (localStorage.getItem(hideKey(id)) === kstToday()) return true
    if (sessionStorage.getItem(closedKey(id))) return true
  } catch {}
  return false
}

export default function PromoPopup() {
  const pathname = usePathname()
  const { locale } = useLanguage()
  const promotions = usePromotions()
  const [queue, setQueue] = useState([])

  useEffect(() => {
    setQueue(promotions.filter(p => p.show_popup && !hiddenNow(p.id)))
  }, [promotions])

  const promo = pathname === '/' ? queue[0] : null

  useEffect(() => {
    if (!promo) return
    const onKey = e => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!promo) return null
  const ko = locale === 'ko'
  const next = () => setQueue(q => q.slice(1))
  function close() {
    try { sessionStorage.setItem(closedKey(promo.id), '1') } catch {}
    next()
  }
  const hideToday = () => {
    try { localStorage.setItem(hideKey(promo.id), kstToday()) } catch {}
    next()
  }

  const title = pick(promo, 'title', locale)
  const body = pick(promo, 'body', locale)
  const href = promoHref(promo)
  const external = /^https?:\/\//.test(href)
  const label = pick(promo, 'button_label', locale) || (ko ? '자세히 보기' : 'Learn more')

  return (
    <div className="fixed inset-0 z-[55] bg-black/50 flex items-center justify-center p-4" onClick={close} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {promo.image_url && (
          <Link href={href} target={external ? '_blank' : undefined} onClick={close} className="block bg-charcoal shrink min-h-0">
            <img src={promo.image_url} alt={title} className="w-full max-h-[55vh] object-contain" />
          </Link>
        )}
        <div className="p-5 overflow-y-auto">
          {title && <h2 className="font-display text-lg font-bold text-charcoal mb-1.5">{title}</h2>}
          {body && <p className="text-sm text-charcoal-light leading-relaxed line-clamp-4 whitespace-pre-line">{body}</p>}
          <Link href={href} target={external ? '_blank' : undefined} onClick={close}
            className="btn-primary w-full !py-2.5 mt-4 no-underline text-center block">{label}</Link>
        </div>
        <div className="flex border-t border-charcoal/10 text-sm shrink-0">
          <button onClick={hideToday} className="flex-1 py-3 bg-transparent border-none cursor-pointer text-charcoal-light hover:bg-charcoal/5">
            {ko ? '오늘 하루 보지 않기' : "Don't show today"}
          </button>
          <button onClick={close} className="flex-1 py-3 bg-transparent border-none border-l border-charcoal/10 cursor-pointer text-charcoal font-semibold hover:bg-charcoal/5" style={{ borderLeft: '1px solid rgba(0,0,0,0.08)' }}>
            {ko ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
