'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useT, useLanguage } from './components/LanguageProvider'

export default function Home() {
  const t = useT()
  const { locale } = useLanguage()
  const { data: session } = useSession()
  const [stats, setStats] = useState({ stat_members: '150+', stat_events: '50+', stat_years: '15+' })
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [latestNews, setLatestNews] = useState([])
  const heroImages = ['/grand reunion.jpg', '/home2.jpg', '/home3.jpeg', '/home4.jpg', '/home 5.jpg']
  const [heroIdx, setHeroIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % heroImages.length), 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.settings) {
        setStats(prev => ({
          stat_members: d.settings.stat_members || prev.stat_members,
          stat_events: d.settings.stat_events || prev.stat_events,
          stat_years: d.settings.stat_years || prev.stat_years,
        }))
      }
    }).catch(() => {})
    fetch('/api/events').then(r => r.json()).then(d => {
      const now = new Date()
      const upcoming = (d.events || []).filter(e => new Date(e.event_date) >= now).sort((a, b) => new Date(a.event_date) - new Date(b.event_date)).slice(0, 3)
      setUpcomingEvents(upcoming)
    }).catch(() => {})
    fetch('/api/news?category=all').then(r => r.json()).then(d => {
      setLatestNews((d.articles || []).slice(0, 3))
    }).catch(() => {})
  }, [])

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden hero-texture">
        {/* Background — rotating images */}
        <div className="absolute inset-0">
          {heroImages.map((src, i) => (
            <img key={src} src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: i === heroIdx ? 1 : 0 }} />
          ))}
          <div className="absolute inset-0 bg-charcoal/70" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-charcoal/40" />

        {/* Hero arrows */}
        <button onClick={() => { setHeroIdx(i => (i - 1 + heroImages.length) % heroImages.length) }} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all cursor-pointer" aria-label="Previous image">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button onClick={() => { setHeroIdx(i => (i + 1) % heroImages.length) }} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all cursor-pointer" aria-label="Next image">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>

        {/* Geometric accent shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-burnt-orange/8 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold/6 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />

        {/* Diagonal stripe decoration */}
        <div className="absolute top-0 right-0 w-2 h-40 bg-burnt-orange/60 transform rotate-12 translate-x-20 translate-y-20" />
        <div className="absolute top-0 right-0 w-2 h-28 bg-gold/40 transform rotate-12 translate-x-28 translate-y-16" />

        <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 mb-8 opacity-0 animate-fade-in-up">
            <img src="/favicon.png" alt="UT Longhorn" className="w-5 h-5 object-contain" />
            <span className="text-white/90 text-sm font-medium tracking-wide">{t('hero.badge')}</span>
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight opacity-0 animate-fade-in-up animate-delay-100">
            {t('hero.title')}
          </h1>

          {/* Burnt orange accent line */}
          <div className="w-20 h-1 bg-burnt-orange mx-auto mb-8 rounded-full opacity-0 animate-fade-in-up animate-delay-200" />

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed font-body opacity-0 animate-fade-in-up animate-delay-200">
            {t('hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-300">
            <Link href={session ? "/news" : "/signup"} className="btn-primary text-base !py-3.5 !px-8 no-underline">
              {session ? t('news.viewAll') : t('hero.joinBtn')}
            </Link>
            <Link href="/events" className="btn-secondary !border-white/30 !text-white hover:!bg-white/10 hover:!text-white text-base !py-3.5 !px-8 no-underline">
              {t('hero.eventsBtn')}
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="relative -mt-16 z-20 max-w-5xl mx-auto px-5">
        <div className="bg-white rounded-2xl shadow-xl border border-charcoal/5 p-8 md:p-10">
          <div className="grid grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-burnt-orange mb-1">{stats.stat_members}</div>
              <div className="text-sm text-charcoal-light font-medium">{t('stats.members')}</div>
            </div>
            <div className="text-center border-x border-charcoal/10">
              <div className="font-display text-3xl md:text-4xl font-bold text-burnt-orange mb-1">{stats.stat_events}</div>
              <div className="text-sm text-charcoal-light font-medium">{t('stats.events')}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-burnt-orange mb-1">{stats.stat_years}</div>
              <div className="text-sm text-charcoal-light font-medium">{t('stats.years')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events Preview */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="badge mb-3 inline-block">{t('nav.events')}</span>
            <h2 className="section-heading">{t('events.title')}</h2>
            <p className="section-subheading">{t('events.subtitle')}</p>
          </div>
          <Link href="/events" className="text-burnt-orange font-semibold text-sm hover:text-burnt-dark transition-colors no-underline flex items-center gap-1.5 shrink-0">
            {t('events.viewAll')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="card p-12 text-center text-charcoal-light">{t('events.noEvents')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEvents.map(event => {
              const d = new Date(event.event_date)
              const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Seoul' }).toUpperCase()
              const day = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Seoul' })
              return (
                <Link key={event.id} href={`/events/${event.id}`} className="card overflow-hidden group cursor-pointer no-underline">
                  <div className="h-1.5 bg-gradient-to-r from-burnt-orange to-gold" />
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-14 text-center">
                        <div className="text-xs font-bold text-burnt-orange tracking-wider uppercase">{month}</div>
                        <div className="font-display text-2xl font-bold text-charcoal">{day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg font-semibold text-charcoal mt-0.5 group-hover:text-burnt-orange transition-colors">{event.title}</h3>
                        {event.title_ko && <p className="text-sm text-charcoal-light mt-0.5">{event.title_ko}</p>}
                        {(event.location || event.location_ko) && (
                          <div className="flex items-center gap-1.5 mt-3 text-xs text-charcoal-light">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            {event.location_ko || event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-charcoal/10 to-transparent" />
      </div>

      {/* Latest News Preview */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="badge mb-3 inline-block">{t('nav.news')}</span>
            <h2 className="section-heading">{t('news.title')}</h2>
            <p className="section-subheading">{t('news.subtitle')}</p>
          </div>
          <Link href="/news" className="text-burnt-orange font-semibold text-sm hover:text-burnt-dark transition-colors no-underline flex items-center gap-1.5 shrink-0">
            {t('news.viewAll')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {latestNews.length === 0 ? (
          <div className="card p-12 text-center text-charcoal-light">{t('news.noNews')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestNews.map(article => {
              const dateStr = new Date(article.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })
              const title = locale === 'ko' ? (article.title_ko || article.title) : (article.title || article.title_ko)
              const subtitle = locale === 'ko' ? (article.title_ko && article.title) : (article.title && article.title_ko)
              const content = locale === 'ko' ? (article.content_ko || article.content) : (article.content || article.content_ko)
              return (
                <Link key={article.id} href={`/news/${article.id}`} className="card overflow-hidden group cursor-pointer no-underline">
                  <div className="h-44 bg-gradient-to-br from-cream to-cream-light relative overflow-hidden">
                    <div className="absolute inset-0 diagonal-accent" />
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[0.65rem] font-semibold bg-white/90 text-charcoal-light px-2.5 py-1 rounded-full">{dateStr}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-base font-semibold text-charcoal group-hover:text-burnt-orange transition-colors leading-snug">{title}</h3>
                    {subtitle && <p className="text-sm text-charcoal-light mt-0.5 mb-2">{subtitle}</p>}
                    {content && <p className="text-sm text-charcoal-light/80 leading-relaxed line-clamp-2">{content}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-burnt-orange to-burnt-dark py-20 md:py-24">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-burnt-deep/30 rounded-full blur-[80px] -translate-x-1/4 translate-y-1/4" />

          <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
            <img src="/favicon.png" alt="UT Longhorn" className="w-12 h-12 object-contain mx-auto mb-6 opacity-20" />
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              {t('hero.joinBtn')}
            </h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <Link href={session ? "/events" : "/signup"} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-burnt-orange font-semibold rounded-lg hover:bg-cream transition-all duration-200 hover:-translate-y-0.5 shadow-lg no-underline">
              {session ? t('hero.eventsBtn') : t('hero.joinBtn')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
