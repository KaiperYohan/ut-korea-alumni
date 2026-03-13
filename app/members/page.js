'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useT } from '../components/LanguageProvider'

function MemberCard({ member, t }) {
  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const levelStyles = {
    executive: { avatar: 'from-amber-500 to-yellow-400', badge: 'bg-amber-100 text-amber-800 border-amber-200', label: t('membership.executive') },
    full: { avatar: 'from-burnt-orange to-gold', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: t('membership.full') },
    general: { avatar: 'from-charcoal-light to-charcoal/60', badge: 'bg-gray-100 text-gray-600 border-gray-200', label: t('membership.general') },
  }
  const level = levelStyles[member.membership_level] || levelStyles.general

  return (
    <div className="card p-6 flex items-start gap-4">
      {/* Avatar */}
      <div className={`shrink-0 w-14 h-14 rounded-full bg-gradient-to-br ${level.avatar} flex items-center justify-center text-white font-display font-bold text-lg overflow-hidden`}>
        {member.profile_image_url ? (
          <img src={member.profile_image_url} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-charcoal truncate">
            {member.name}
            {member.name_ko && <span className="text-charcoal-light font-body font-normal ml-1.5 text-sm">({member.name_ko})</span>}
          </h3>
          <span className={`shrink-0 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border ${level.badge}`}>
            {level.label}
          </span>
        </div>
        {member.graduation_year && (
          <p className="text-xs text-burnt-orange font-semibold mt-0.5">Class of {member.graduation_year}</p>
        )}
        {member.major && (
          <p className="text-sm text-charcoal-light mt-1 truncate">{member.major}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-charcoal-light">
          {member.company && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              {member.company}{member.title ? ` · ${member.title}` : ''}
            </span>
          )}
          {member.location && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
              {member.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MembersPage() {
  const t = useT()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const fetchMembers = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (yearFilter) params.set('year', yearFilter)
      const res = await fetch(`/api/members?${params}`)
      const data = await res.json()
      setMembers(data.members || [])
      setLoading(false)
    }
    const debounce = setTimeout(fetchMembers, 300)
    return () => clearTimeout(debounce)
  }, [status, search, yearFilter])

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">{t('common.loading')}</div>
  }

  // Check membership level — only executive, full, and admin can access
  const membershipLevel = session?.user?.membershipLevel
  const isAdmin = session?.user?.isAdmin
  if (!isAdmin && !['executive', 'full'].includes(membershipLevel)) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card p-12">
            <h1 className="font-display text-2xl font-bold text-charcoal mb-3">{t('members.title')}</h1>
            <p className="text-charcoal-light">{t('members.noAccess')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Generate year options from members
  const years = [...new Set(members.map(m => m.graduation_year).filter(Boolean))].sort((a, b) => b - a)

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="badge mb-3 inline-block">{t('nav.members')}</span>
          <h1 className="section-heading">{t('members.title')}</h1>
          <p className="section-subheading">{t('members.subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('members.search')}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange"
            />
          </div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange min-w-[160px]"
          >
            <option value="">{t('members.allYears')}</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Member grid */}
        {loading ? (
          <div className="text-center py-16 text-charcoal-light">{t('common.loading')}</div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-charcoal-light">{t('members.noMembers')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => <MemberCard key={m.id} member={m} t={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
