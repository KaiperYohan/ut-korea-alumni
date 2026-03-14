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

          {/* Social Links */}
          {(member.linkedin || member.instagram || member.tiktok || member.youtube || member.twitter) && (
            <div className="mt-8 pt-6 border-t border-charcoal/10">
              <h3 className="text-sm font-semibold text-charcoal mb-3">{t('profile.socialLinks')}</h3>
              <div className="flex flex-wrap gap-3">
                {member.linkedin && (
                  <a href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream/50 text-sm text-charcoal hover:text-[#0A66C2] no-underline transition-colors">
                    <svg className="w-4 h-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                )}
                {member.instagram && (
                  <a href={member.instagram.startsWith('http') ? member.instagram : `https://instagram.com/${member.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream/50 text-sm text-charcoal hover:text-[#E4405F] no-underline transition-colors">
                    <svg className="w-4 h-4 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                    Instagram
                  </a>
                )}
                {member.tiktok && (
                  <a href={member.tiktok.startsWith('http') ? member.tiktok : `https://tiktok.com/${member.tiktok.startsWith('@') ? '' : '@'}${member.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream/50 text-sm text-charcoal hover:text-charcoal-light no-underline transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                    TikTok
                  </a>
                )}
                {member.youtube && (
                  <a href={member.youtube.startsWith('http') ? member.youtube : `https://${member.youtube}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream/50 text-sm text-charcoal hover:text-[#FF0000] no-underline transition-colors">
                    <svg className="w-4 h-4 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    YouTube
                  </a>
                )}
                {member.twitter && (
                  <a href={member.twitter.startsWith('http') ? member.twitter : `https://x.com/${member.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream/50 text-sm text-charcoal hover:text-charcoal-light no-underline transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Interests */}
          {member.interests && (
            <div className="mt-6 pt-6 border-t border-charcoal/10">
              <h3 className="text-sm font-semibold text-charcoal mb-3">{t('profile.interests')}</h3>
              <div className="flex flex-wrap gap-2">
                {member.interests.split(',').filter(Boolean).map(interest => (
                  <span key={interest} className="px-3 py-1 rounded-full text-xs font-medium bg-burnt-orange/10 text-burnt-orange border border-burnt-orange/20">
                    {t(`interests.${interest}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {member.bio && (
            <div className="mt-6 pt-6 border-t border-charcoal/10">
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
