'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from './LanguageProvider'

export default function NoticeBanner() {
  const { locale } = useLanguage()
  const [notice, setNotice] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
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

  if (!notice || dismissed) return null

  const text = (locale === 'ko' && notice.ko ? notice.ko : notice.en) || ''
  if (!text.trim()) return null

  return (
    <div className="bg-burnt-orange text-white text-center text-sm py-1.5 px-10 relative">
      <span>{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-transparent border-none cursor-pointer text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}
