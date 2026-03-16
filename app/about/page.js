'use client'

import { useT, useLanguage } from '../components/LanguageProvider'

export default function AboutPage() {
  const t = useT()
  const { locale } = useLanguage()

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-burnt-orange flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 100 70" className="w-10 h-7 fill-white">
              <path d="M50 28C50 28 46 18 38 12C34 9 28 7 22 7C17 7 12 8 8 11C5 13 2 16 1 19C0.5 20.5 0.5 22 1.5 23C2.5 24 4 23.5 5.5 23C8 22 11 21.5 14 22C17 23 19 25 21 27C24 30 27 34 30 37C33 40 37 43 41 45C44 46.5 47 47.5 50 47.5C53 47.5 56 46.5 59 45C63 43 67 40 70 37C73 34 76 30 79 27C81 25 83 23 86 22C89 21.5 92 22 94.5 23C96 23.5 97.5 24 98.5 23C99.5 22 99.5 20.5 99 19C98 16 95 13 92 11C88 8 83 7 78 7C72 7 66 9 62 12C54 18 50 28 50 28Z"/>
              <path d="M50 47.5C45 47.5 42 50 40 53C38 56 37 60 38 63C39 65.5 41 67.5 44 69C46 69.8 48 70 50 70C52 70 54 69.8 56 69C59 67.5 61 65.5 62 63C63 60 62 56 60 53C58 50 55 47.5 50 47.5ZM50 65C47.5 65 46 63 46.5 61C47 59.5 48 58 50 58C52 58 53 59.5 53.5 61C54 63 52.5 65 50 65Z"/>
            </svg>
          </div>
          <h1 className="section-heading text-center">{t('about.title')}</h1>
          <p className="section-subheading mx-auto text-center">{t('about.subtitle')}</p>
        </div>

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
