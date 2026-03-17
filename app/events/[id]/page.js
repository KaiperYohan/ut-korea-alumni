'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useT, useLanguage } from '../../components/LanguageProvider'

export default function EventDetailPage({ params }) {
  const { id } = use(params)
  const t = useT()
  const { locale } = useLanguage()
  const { data: session } = useSession()
  const [event, setEvent] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [myRsvp, setMyRsvp] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchEvent = async () => {
    const res = await fetch(`/api/events/${id}`)
    const data = await res.json()
    setEvent(data.event)
    setRsvps(data.rsvps || [])
    if (session?.user?.id) {
      const mine = (data.rsvps || []).find(r => String(r.member_id) === session.user.id)
      setMyRsvp(mine?.status || null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchEvent() }, [id, session])

  const handleRsvp = async (status) => {
    if (!session) return
    if (myRsvp === status) {
      // Cancel RSVP
      await fetch(`/api/events/${id}/rsvp`, { method: 'DELETE' })
      setMyRsvp(null)
    } else {
      await fetch(`/api/events/${id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setMyRsvp(status)
    }
    fetchEvent()
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">{t('common.loading')}</div>
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">Event not found</div>
  }

  const eventDate = new Date(event.event_date)
  const isPast = eventDate < new Date()

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-charcoal-light hover:text-burnt-orange transition-colors mb-6 no-underline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          {t('common.back')}
        </Link>

        <div className="card overflow-hidden">
          {/* Event image */}
          {event.image_url && (
            <img src={event.image_url} alt={event.title} className="w-full h-64 md:h-80 object-cover" />
          )}

          {/* Date header */}
          <div className="bg-gradient-to-r from-burnt-orange to-burnt-dark p-6 md:p-8 text-white">
            <div className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-1">
              {eventDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' })}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {locale === 'ko' && event.title_ko ? event.title_ko : event.title}
            </h1>
            {locale === 'ko' && event.title_ko && (
              <p className="text-white/70 mt-1">{event.title}</p>
            )}
          </div>

          <div className="p-6 md:p-8">
            {/* Meta info */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm text-charcoal-light">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-burnt-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {event.time_tba ? 'TBA' : `${eventDate.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })} KST`}
              </div>
              {(event.location || event.location_ko || event.location_tba) && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-burnt-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                  {event.location_tba ? 'TBA' : (locale === 'ko' && event.location_ko ? event.location_ko : event.location)}
                </div>
              )}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-burnt-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                {rsvps.filter(r => r.status === 'attending').length} {t('events.attendees')}
              </div>
            </div>

            {/* Description */}
            {(event.description || event.description_ko) && (
              <div className="prose prose-charcoal max-w-none mb-8">
                <p className="text-charcoal leading-relaxed whitespace-pre-wrap">
                  {locale === 'ko' && event.description_ko ? event.description_ko : event.description}
                </p>
              </div>
            )}

            {/* External link */}
            {event.external_url && (
              <div className="mb-8">
                <a href={event.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-burnt-orange hover:text-burnt-dark font-semibold text-sm no-underline transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  {locale === 'ko' ? '관련 링크 보기' : 'View Link'}
                </a>
              </div>
            )}

            {/* RSVP buttons */}
            {!isPast && session && (
              <div className="flex gap-3 mb-8">
                <button
                  onClick={() => handleRsvp('attending')}
                  className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer border-none ${
                    myRsvp === 'attending'
                      ? 'bg-green-600 text-white'
                      : 'bg-charcoal/5 text-charcoal hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  {myRsvp === 'attending' ? '✓ ' : ''}{t('events.attending')}
                </button>
                <button
                  onClick={() => handleRsvp('maybe')}
                  className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer border-none ${
                    myRsvp === 'maybe'
                      ? 'bg-amber-500 text-white'
                      : 'bg-charcoal/5 text-charcoal hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  Maybe
                </button>
              </div>
            )}

            {/* Attendees list */}
            {rsvps.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-semibold text-charcoal mb-4">{t('events.attendees')}</h3>
                <div className="flex flex-wrap gap-2">
                  {rsvps.filter(r => r.status === 'attending').map(r => (
                    <span key={r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream-light rounded-full text-sm text-charcoal">
                      <span className="w-5 h-5 rounded-full bg-burnt-orange/20 text-burnt-orange text-[0.6rem] font-bold flex items-center justify-center">
                        {r.name[0]}
                      </span>
                      {r.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
