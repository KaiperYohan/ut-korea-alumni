'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from './LanguageProvider'
import usePromotions, { promoHref } from './usePromotions'
import { pick } from '@/lib/promotions'

// The orange bar under the navigation: the notice text from Settings, and the top
// bar of any running promotion (which links to the promotion). Each can be closed
// for the rest of the visit.
export default function NoticeBanner() {
  const { locale } = useLanguage()
  const promotions = usePromotions()
  const [notice, setNotice] = useState(null)
  const [dismissed, setDismissed] = useState(() => new Set())

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          const en = (d.settings.notice || '').trim()
          const ko = (d.settings.notice_ko || '').trim()
          if (en || ko) setNotice({ en, ko })
        }
      })
      .catch(() => {})
  }, [])

  const bars = []
  for (const p of promotions) {
    if (!p.show_banner) continue
    const text = pick(p, 'banner_text', locale)
    if (text) bars.push({ key: `promo-${p.id}`, text, href: promoHref(p) })
  }
  const noticeText = notice ? ((locale === 'ko' && notice.ko ? notice.ko : notice.en) || '').trim() : ''
  if (noticeText) bars.push({ key: 'notice', text: noticeText })

  const shown = bars.filter(b => !dismissed.has(b.key))
  if (!shown.length) return null

  return shown.map(bar => {
    const external = bar.href && /^https?:\/\//.test(bar.href)
    return (
      <div key={bar.key} className="bg-burnt-orange text-white text-center text-sm py-1.5 px-10 relative border-b border-white/15 last:border-b-0">
        {bar.href ? (
          <Link href={bar.href} target={external ? '_blank' : undefined} className="text-white no-underline hover:underline">
            {bar.text} <span aria-hidden="true">›</span>
          </Link>
        ) : (
          <span>{bar.text}</span>
        )}
        <button
          onClick={() => setDismissed(prev => new Set(prev).add(bar.key))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-transparent border-none cursor-pointer text-lg leading-none"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    )
  })
}
