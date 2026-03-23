'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useT, useLanguage } from '../components/LanguageProvider'

export default function EventsPage() {
  const t = useT()
  const { locale } = useLanguage()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => { setEvents(data.events || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // event_date is stored as text "YYYY-MM-DDTHH:mm" in KST — append +09:00 to parse as KST
  const toKSTDate = (dateStr) => new Date((dateStr || '').slice(0, 16) + ':00+09:00')

  const now = new Date()
  const upcoming = events.filter(e => toKSTDate(e.event_date) >= now).sort((a, b) => toKSTDate(a.event_date) - toKSTDate(b.event_date))
  const past = events.filter(e => toKSTDate(e.event_date) < now)

  const formatTime = (dateStr) => {
    const d = toKSTDate(dateStr)
    const time = d.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })
    return `${time} KST`
  }

  const getMonth = (dateStr) => toKSTDate(dateStr).toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Seoul' }).toUpperCase()
  const getDay = (dateStr) => toKSTDate(dateStr).toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Seoul' })

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <span className="badge mb-3 inline-block">{t('nav.events')}</span>
          <h1 className="section-heading">{t('events.title')}</h1>
          <p className="section-subheading">{t('events.subtitle')}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-charcoal-light">{t('common.loading')}</div>
        ) : (
          <>
            {/* Upcoming Events */}
            {upcoming.length === 0 ? (
              <div className="card p-12 text-center text-charcoal-light">{t('events.noEvents')}</div>
            ) : (
              <div className="space-y-5 mb-16">
                {upcoming.map(event => (
                  <Link key={event.id} href={`/events/${event.id}`} className="card overflow-hidden flex flex-col md:flex-row no-underline group">
                    {/* Image or Date block */}
                    {(() => { try { const p = JSON.parse(event.image_url); return Array.isArray(p) ? p[0] : event.image_url } catch { return event.image_url } })() ? (
                      <div className="shrink-0 w-full md:w-48 h-40 md:h-auto relative">
                        <img src={(() => { try { const p = JSON.parse(event.image_url); return Array.isArray(p) ? p[0] || '' : event.image_url } catch { return event.image_url } })()} alt={event.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-burnt-orange text-white text-xs font-bold px-2 py-1 rounded">
                          {getMonth(event.event_date)} {getDay(event.event_date)}
                        </div>
                      </div>
                    ) : (
                      <div className="shrink-0 w-full md:w-28 bg-gradient-to-br from-burnt-orange to-burnt-dark p-5 md:p-6 flex md:flex-col items-center md:items-center justify-center gap-2 text-white">
                        <div className="text-xs font-bold tracking-wider uppercase opacity-80">{getMonth(event.event_date)}</div>
                        <div className="font-display text-3xl md:text-4xl font-bold">{getDay(event.event_date)}</div>
                      </div>
                    )}
                    <div className="flex-1 p-5 md:p-6">
                      <h3 className="font-display text-xl font-semibold text-charcoal group-hover:text-burnt-orange transition-colors">
                        {locale === 'ko' && event.title_ko ? event.title_ko : event.title}
                      </h3>
                      {locale === 'ko' && event.title_ko && (
                        <p className="text-sm text-charcoal-light mt-0.5">{event.title}</p>
                      )}
                      {locale === 'en' && event.title_ko && (
                        <p className="text-sm text-charcoal-light mt-0.5">{event.title_ko}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-charcoal-light">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          {event.time_tba ? 'TBA' : formatTime(event.event_date)}
                        </span>
                        {(event.location || event.location_ko || event.location_tba) && (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                            {event.location_tba ? 'TBA' : (locale === 'ko' && event.location_ko ? event.location_ko : event.location)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          {event.attendee_count || 0} {t('events.attendees')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Past Events */}
            {past.length > 0 && (() => {
              const pastByYear = {}
              past.forEach(event => {
                const year = toKSTDate(event.event_date).getFullYear()
                if (!pastByYear[year]) pastByYear[year] = []
                pastByYear[year].push(event)
              })
              const years = Object.keys(pastByYear).sort((a, b) => b - a)
              return (
                <>
                  <h2 className="font-display text-xl font-semibold text-charcoal mb-6">{t('events.pastEvents')}</h2>
                  {years.map(year => (
                    <div key={year} className="mb-10">
                      <h3 className="font-display text-lg font-semibold text-charcoal-light mb-4">{year}</h3>
                      <div className="space-y-3">
                        {pastByYear[year].map(event => (
                          <Link key={event.id} href={`/events/${event.id}`} className="card p-5 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity no-underline">
                            <div className="shrink-0 text-center w-12">
                              <div className="text-[0.6rem] font-bold text-charcoal-light tracking-wider uppercase">{getMonth(event.event_date)}</div>
                              <div className="font-display text-lg font-bold text-charcoal">{getDay(event.event_date)}</div>
                            </div>
                            <div>
                              <h3 className="font-display text-base font-semibold text-charcoal">
                                {locale === 'ko' && event.title_ko ? event.title_ko : event.title}
                              </h3>
                              <p className="text-xs text-charcoal-light mt-0.5">{event.attendee_count || 0} {t('events.attendees')}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
