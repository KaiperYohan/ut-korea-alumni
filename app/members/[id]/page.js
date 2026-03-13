'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '../../components/LanguageProvider'

export default function MemberDetailPage() {
  const t = useT()
  const { locale } = useLanguage()
  const router = useRouter()
  const { id } = useParams()
  const { data: session, status } = useSession()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && !fetchedRef.current) {
      fetchedRef.current = true
      fetch(`/api/members/${id}`)
        .then(res => {
          if (!res.ok) throw new Error(res.status === 403 ? 'forbidden' : 'not_found')
          return res.json()
        })
        .then(data => {
          setMember(data.member)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message === 'forbidden' ? t('members.noAccess') : t('common.error'))
          setLoading(false)
        })
    }
  }, [status, router, id])

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center pt-24 text-charcoal-light">{t('common.loading')}</div>
  }

  if (error || !member) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card p-12">
            <p className="text-charcoal-light">{error || t('common.error')}</p>
            <Link href="/members" className="btn-primary inline-block mt-6 !py-2.5 no-underline">
              {t('common.back')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const levelStyles = {
    executive: { avatar: 'from-amber-500 to-yellow-400', badge: 'bg-amber-100 text-amber-800 border-amber-200', label: t('membership.executive') },
    full: { avatar: 'from-burnt-orange to-gold', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: t('membership.full') },
    general: { avatar: 'from-charcoal-light to-charcoal/60', badge: 'bg-gray-100 text-gray-600 border-gray-200', label: t('membership.general') },
  }
  const level = levelStyles[member.membership_level] || levelStyles.general

  const displayName = locale === 'ko' && member.name_ko ? member.name_ko : member.name
  const altName = locale === 'ko' && member.name_ko ? member.name : member.name_ko

  return (
    <div className="min-h-screen pt-24 pb-16 px-5">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link href="/members" className="inline-flex items-center gap-1.5 text-sm text-charcoal-light hover:text-burnt-orange no-underline mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          {t('members.title')}
        </Link>

        <div className="card p-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            <div className={`shrink-0 w-28 h-28 rounded-full bg-gradient-to-br ${level.avatar} flex items-center justify-center text-white font-display font-bold text-3xl overflow-hidden`}>
              {member.profile_image_url ? (
                <img src={member.profile_image_url} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="font-display text-2xl font-bold text-charcoal">{displayName}</h1>
                <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded border ${level.badge}`}>
                  {level.label}
                </span>
              </div>
              {altName && (
                <p className="text-charcoal-light text-sm">{altName}</p>
              )}
              {member.graduation_year && (
                <p className="text-burnt-orange font-semibold text-sm mt-1">
                  {locale === 'ko' ? `${member.graduation_year}년 ${t('members.class')}` : `${t('members.class')} ${member.graduation_year}`}
                </p>
              )}
              {member.major && (
                <p className="text-charcoal-light text-sm mt-0.5">{member.major}</p>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="space-y-4">
            {(member.company || member.title) && (
              <InfoRow
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
                label={t('members.company')}
                value={[member.title, member.company].filter(Boolean).join(' @ ')}
              />
            )}

            {member.location && (
              <InfoRow
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
                label={t('members.location')}
                value={member.location}
              />
            )}

            {member.email && (
              <InfoRow
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
                label={t('auth.email')}
                value={member.email}
                href={`mailto:${member.email}`}
              />
            )}

            {member.phone && (
              <InfoRow
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>}
                label={t('memberDetail.phone')}
                value={member.phone}
                href={`tel:${member.phone}`}
              />
            )}
          </div>

          {/* Bio */}
          {member.bio && (
            <div className="mt-8 pt-6 border-t border-charcoal/10">
              <h3 className="text-sm font-semibold text-charcoal mb-2">{t('auth.bio')}</h3>
              <p className="text-charcoal-light text-sm leading-relaxed whitespace-pre-line">{member.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, href }) {
  const content = (
    <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-cream/50">
      <span className="text-charcoal-light shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.65rem] uppercase tracking-wider text-charcoal-light font-semibold">{label}</p>
        <p className={`text-sm text-charcoal font-medium truncate ${href ? 'hover:text-burnt-orange' : ''}`}>{value}</p>
      </div>
    </div>
  )

  if (href) {
    return <a href={href} className="block no-underline">{content}</a>
  }
  return content
}
