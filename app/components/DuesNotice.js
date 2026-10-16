'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from './LanguageProvider'
import { duesYearLabel, duesDeadline, paidThrough } from '@/lib/dues'

// The site version of the end-of-year dues notice (the emailed one is in
// lib/email). Shown to a signed-in member from Oct 1 to Dec 31 when they still
// owe the open year: a renewal reminder for full members, a benefits invitation
// for general members. /api/dues/me decides which, using the same rule as the
// email. Dismissing it hides it for two weeks, so the December reminders still
// surface it again.
const SNOOZE_MS = 14 * 24 * 3600e3

const fmt = (iso, ko) => {
  const [y, m, d] = iso.split('-').map(Number)
  return ko ? `${y}년 ${m}월 ${d}일` : new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function DuesNotice() {
  const { status } = useSession()
  const pathname = usePathname()
  const { locale } = useLanguage()
  const [info, setInfo] = useState(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetch('/api/dues/me').then(r => (r.ok ? r.json() : null)).then(d => {
      if (cancelled || !d?.noticeVersion) return
      setInfo(d)
      let snoozedAt = 0
      try { snoozedAt = Number(localStorage.getItem(`duesNotice:${d.duesYear}:${d.noticeVersion}`)) || 0 } catch {}
      setHidden(Date.now() - snoozedAt < SNOOZE_MS)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [status])

  if (!info || hidden || pathname?.startsWith('/dues') || pathname?.startsWith('/admin')) return null

  const ko = locale === 'ko'
  const renewal = info.noticeVersion === 'renewal'
  const amount = ko ? `${Number(info.expectedAmount).toLocaleString('ko-KR')}원` : `${Number(info.expectedAmount).toLocaleString('en-US')} KRW`
  const label = duesYearLabel(info.duesYear)
  const deadline = fmt(duesDeadline(info.duesYear), ko)
  const through = fmt(paidThrough(info.duesYear), ko)

  const title = renewal
    ? (ko ? `${label} 정회원 회비 갱신 안내` : `Renew your full membership for ${label}`)
    : (ko ? '정회원 혜택을 누려보세요' : 'Become a full member')
  const body = renewal
    ? (ko ? `정회원 혜택은 ${deadline}까지입니다. 회비 ${amount}을 납부하시면 ${through}까지 이어집니다.`
          : `Your benefits run until ${deadline}. Pay ${amount} to keep them through ${through}.`)
    : (ko ? `연회비 ${amount}으로 동문 디렉토리, 행사 우선 등록·할인, 멘토링·리크루팅 우선 참여를 ${through}까지 이용하실 수 있습니다.`
          : `For ${amount} a year: the alumni directory, priority and discounts for events, and mentoring and recruiting programs, through ${through}.`)

  const snooze = () => {
    try { localStorage.setItem(`duesNotice:${info.duesYear}:${info.noticeVersion}`, String(Date.now())) } catch {}
    setHidden(true)
  }

  return (
    <div role="dialog" aria-label={title}
      className="fixed z-40 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm bg-white border border-burnt-orange/25 rounded-2xl shadow-xl p-5">
      <button onClick={snooze} aria-label={ko ? '닫기' : 'Dismiss'}
        className="absolute top-3 right-3 text-charcoal-light hover:text-charcoal bg-transparent border-none cursor-pointer text-lg leading-none">&times;</button>
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-burnt-orange mb-1">{renewal ? (ko ? '회비 갱신' : 'Renewal') : (ko ? '정회원' : 'Full membership')}</p>
      <h3 className="font-display text-base font-semibold text-charcoal pr-6">{title}</h3>
      <p className="text-sm text-charcoal-light mt-1.5 leading-relaxed">{body}</p>
      <p className="text-xs text-charcoal-light/80 mt-2">
        {ko ? '매년 10월 1일 예약이체를 등록해 두시면 갱신을 놓치지 않습니다.' : 'Tip: schedule a transfer every October 1 so you never miss a renewal.'}
      </p>
      <div className="flex gap-2 mt-4">
        <Link href="/dues" onClick={snooze} className="btn-primary !py-2 !px-4 text-sm no-underline">
          {renewal ? (ko ? '납부 안내 보기' : 'How to renew') : (ko ? '가입 안내 보기' : 'How to join')}
        </Link>
        <button onClick={snooze} className="px-4 py-2 text-sm text-charcoal-light bg-transparent border-none cursor-pointer hover:text-charcoal">
          {ko ? '나중에' : 'Later'}
        </button>
      </div>
    </div>
  )
}
