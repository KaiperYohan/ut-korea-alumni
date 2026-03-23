'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useT, useLanguage } from '../components/LanguageProvider'

const COMMITTEES = [
  { key: 'board', en: 'Board of Directors', ko: '이사회',
    descEn: null, descKo: null,
    roles: [
      { role: 'president', en: 'President', ko: '회장' },
      { role: 'vice_president', en: 'Vice President', ko: '부회장' },
      { role: 'general_secretary', en: 'General Secretary', ko: '총무' },
      { role: 'treasurer', en: 'Treasurer', ko: '재무' },
    ]},
  { key: 'executive', en: 'Executive Committee', ko: '집행위원회',
    descEn: null, descKo: null,
    roles: [
      { role: 'chair', en: 'Chair', ko: '위원장' },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장' },
      { role: 'general_secretary', en: 'General Secretary', ko: '총무' },
      { role: 'historian', en: 'Historian', ko: '서기' },
    ]},
  { key: 'membership', en: 'Membership Development Committee', ko: '회원개발위원회',
    descEn: 'Focuses on increasing alumni engagement and membership, developing programs and benefits to attract and retain members.',
    descKo: '동문 참여 및 회원 확대에 주력하며, 회원 유치와 유지를 위한 프로그램과 혜택을 개발합니다.',
    roles: [
      { role: 'chair', en: 'Chair (Vice President)', ko: '위원장 (부회장)' },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장' },
      { role: 'member', en: 'Committee Member', ko: '위원' },
    ]},
  { key: 'social', en: 'Social Affairs Committee', ko: '소셜위원회',
    descEn: 'Oversees all social activities and community events.',
    descKo: '모든 사교 활동과 커뮤니티 행사를 총괄합니다.',
    roles: [
      { role: 'chair', en: 'Chair (Vice President)', ko: '위원장 (부회장)' },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장' },
      { role: 'member', en: 'Committee Member', ko: '위원' },
    ]},
  { key: 'nominating', en: 'Nominating Committee', ko: '인사위원회',
    descEn: 'Identifies and recruits candidates for board positions, ensuring a diverse and skilled leadership team.',
    descKo: '이사회 후보자를 발굴하고 모집하여 다양하고 유능한 리더십 팀을 구성합니다.',
    roles: [
      { role: 'chair', en: 'Chair', ko: '위원장' },
      { role: 'member', en: 'Committee Member', ko: '위원' },
    ]},
  { key: 'finance', en: 'Finance and Planning Committee', ko: '재정기획위원회',
    descEn: 'Responsible for overseeing the association\'s financial health, managing budgets, investments, and financial planning.',
    descKo: '동문회의 재정 건전성을 감독하고 예산, 투자 및 재정 계획을 관리합니다.',
    roles: [
      { role: 'chair', en: 'Chair (Treasurer)', ko: '위원장 (재무)' },
      { role: 'vice_chair', en: 'Vice Chair', ko: '부위원장' },
      { role: 'member', en: 'Committee Member', ko: '위원' },
    ]},
]

export default function AboutPage() {
  const t = useT()
  const { locale } = useLanguage()
  const [positions, setPositions] = useState([])
  const [greeting, setGreeting] = useState({ en: '', ko: '' })

  useEffect(() => {
    fetch('/api/org').then(r => r.json()).then(d => setPositions(d.positions || []))
    fetch('/api/settings').then(r => r.json()).then(d => {
      const s = d.settings || {}
      setGreeting({ en: s.greeting_president || '', ko: s.greeting_president_ko || '' })
    }).catch(() => {})
  }, [])

  const getMembers = (committeeKey, role) =>
    positions.filter(p => p.committee === committeeKey && p.role === role && p.member_id)

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <img src="/utkorea logo.png" alt="UT Korea Alumni" className="w-16 h-16 object-contain mx-auto mb-6" />
          <h1 className="section-heading text-center">{t('about.title')}</h1>
          <p className="section-subheading mx-auto text-center">{t('about.subtitle')}</p>
        </div>

        {/* Greetings */}
        {(greeting.en || greeting.ko) && (() => {
          const president = positions.find(p => p.committee === 'board' && p.role === 'president' && p.member_id)
          return (
            <div id="greetings" className="card p-8 md:p-10 mb-8 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-charcoal mb-6">
                {locale === 'ko' ? '인사말' : 'Greetings'}
              </h2>
              <div className="space-y-6">
                <h3 className="font-display text-lg font-semibold text-burnt-orange">
                  {locale === 'ko' ? '회장 인사말' : "President's Greeting"}
                </h3>
                {president && (
                  <Link href={`/members/${president.member_id}`} className="flex items-center gap-4 no-underline group">
                    {president.profile_image_url ? (
                      <img src={president.profile_image_url} alt={president.name} className="w-20 h-20 rounded-full object-cover ring-2 ring-burnt-orange/30 group-hover:ring-burnt-orange transition-all" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-burnt-orange to-burnt-dark flex items-center justify-center text-white font-display text-2xl font-bold ring-2 ring-burnt-orange/30">
                        {president.name?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <div className="font-display text-lg font-semibold text-charcoal group-hover:text-burnt-orange transition-colors">
                        {locale === 'ko' && president.name_ko ? president.name_ko : president.name}
                      </div>
                      <div className="text-sm text-charcoal-light">
                        {locale === 'ko' ? '회장' : 'President'}
                        {president.company && ` · ${president.company}`}
                      </div>
                    </div>
                  </Link>
                )}
                <p className="text-charcoal leading-relaxed whitespace-pre-wrap">
                  {locale === 'ko' ? (greeting.ko || greeting.en) : (greeting.en || greeting.ko)}
                </p>
              </div>
            </div>
          )
        })()}

        <div id="organization" className="card p-8 md:p-10 scroll-mt-24">
          {locale === 'ko' ? (
            <div className="space-y-6 text-charcoal leading-relaxed">
              <p>
                텍사스 대학교 오스틴 한국 동문회는 한국에 거주하는 UT Austin 졸업생들을 연결하는 커뮤니티입니다.
                졸업 후에도 Longhorn 정신을 이어가며, 동문 간의 네트워킹, 멘토링, 그리고 다양한 사회활동을 통해
                서로의 성장을 돕고 있습니다.
              </p>
              <h3 className="font-display text-xl font-semibold text-charcoal">우리의 미션</h3>
              <ul className="list-disc list-inside space-y-2 text-charcoal-light">
                <li>한국 내 UT Austin 동문 간의 유대감 강화</li>
                <li>전문 분야 간 네트워킹 및 커리어 성장 지원</li>
                <li>한국에서 유학을 준비하는 학생들에 대한 멘토링</li>
                <li>UT Austin의 글로벌 커뮤니티 확대에 기여</li>
              </ul>
              <h3 className="font-display text-xl font-semibold text-charcoal">활동</h3>
              <p className="text-charcoal-light">
                정기 모임, 네트워킹 디너, 커리어 세미나, 신입생 환영회, 홈커밍 행사 등
                다양한 프로그램을 운영하고 있습니다. 또한 UT Austin을 준비하는 한국 학생들을 위한
                멘토링 프로그램도 진행합니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-charcoal leading-relaxed">
              <p>
                The UT Austin Korea Alumni Association is a community connecting University of Texas at Austin
                graduates living in Korea. We carry the Longhorn spirit forward after graduation, supporting
                each other&apos;s growth through networking, mentoring, and various community activities.
              </p>
              <h3 className="font-display text-xl font-semibold text-charcoal">Our Mission</h3>
              <ul className="list-disc list-inside space-y-2 text-charcoal-light">
                <li>Strengthen bonds between UT Austin alumni in Korea</li>
                <li>Support professional networking and career growth across industries</li>
                <li>Mentor Korean students preparing to study at UT Austin</li>
                <li>Contribute to UT Austin&apos;s expanding global community</li>
              </ul>
              <h3 className="font-display text-xl font-semibold text-charcoal">Activities</h3>
              <p className="text-charcoal-light">
                We organize regular meetups, networking dinners, career seminars, new student welcome events,
                and homecoming celebrations. We also run mentoring programs for Korean students
                preparing to attend UT Austin.
              </p>
            </div>
          )}

          {/* Organization Chart */}
          {positions.length > 0 && (
            <div className="mt-10 pt-8 border-t border-charcoal/10">
              <h3 className="font-display text-xl font-semibold text-charcoal mb-6">
                {locale === 'ko' ? '조직도' : 'Organization Chart'}
              </h3>
              <div className="space-y-6">
                {COMMITTEES.map(committee => {
                  const hasAny = committee.roles.some(r => getMembers(committee.key, r.role).length > 0)
                  if (!hasAny) return null
                  return (
                    <div key={committee.key} className="border border-charcoal/10 rounded-xl p-5">
                      <h4 className="font-display text-base font-semibold text-burnt-orange mb-1">
                        {locale === 'ko' ? committee.ko : committee.en}
                      </h4>
                      {(locale === 'ko' ? committee.descKo : committee.descEn) && (
                        <p className="text-xs text-charcoal-light mb-3">
                          {locale === 'ko' ? committee.descKo : committee.descEn}
                        </p>
                      )}
                      <div className="space-y-2">
                        {committee.roles.map(roleInfo => {
                          const roleMembers = getMembers(committee.key, roleInfo.role)
                          if (roleMembers.length === 0) return null
                          return (
                            <div key={roleInfo.role} className="flex flex-wrap gap-x-6 gap-y-1">
                              <span className="text-xs font-semibold text-charcoal min-w-[140px]">
                                {locale === 'ko' ? roleInfo.ko : roleInfo.en}
                              </span>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {roleMembers.map(m => (
                                  <Link key={m.id} href={`/members/${m.member_id}`} className="text-sm text-charcoal-light hover:text-burnt-orange transition-colors no-underline">
                                    {locale === 'ko' && m.name_ko ? m.name_ko : m.name}
                                    {m.graduation_year ? ` '${String(m.graduation_year).slice(-2)}` : ''}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Past Presidents section */}
        <div id="past-presidents" className="card p-8 md:p-10 mt-8 scroll-mt-24">
          <h2 className="font-display text-2xl font-semibold text-charcoal mb-6">
            {locale === 'ko' ? '역대 회장' : 'Past Presidents'}
          </h2>
          <div className="text-charcoal-light text-sm">
            {locale === 'ko' ? '준비 중입니다.' : 'Coming soon.'}
          </div>
        </div>

        {/* Contact section */}
        <div id="contact" className="card p-8 md:p-10 mt-8 scroll-mt-24">
          <h2 className="font-display text-2xl font-semibold text-charcoal mb-6">
            {locale === 'ko' ? '연락처' : 'Contact'}
          </h2>
          <div className="space-y-4 text-charcoal-light">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-burnt-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <a href="mailto:utaustinkorea@gmail.com" className="text-burnt-orange hover:underline">
                utaustinkorea@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-burnt-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              <a href="https://www.utexas.edu" target="_blank" rel="noopener noreferrer" className="text-burnt-orange hover:underline">
                www.utexas.edu
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
