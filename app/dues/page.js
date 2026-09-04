'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useT, useLanguage } from '../components/LanguageProvider'
import { currentDuesYear, duesYearLabel, duesDeadline, paidThrough } from '@/lib/dues'

export default function DuesPage() {
  const t = useT()
  const { locale } = useLanguage()
  const { data: session } = useSession()

  // Derived from the session, which recomputes benefits on every read, so this
  // reflects a lapse without the member signing out.
  const duesYear = currentDuesYear()
  const isExecutive = session?.user?.membershipLevel === 'executive'
  const duesYearPaid = session?.user?.duesYearPaid ?? null
  const benefitsActive = Boolean(session?.user?.hasFullBenefits)

  const statusCard = !session ? null : isExecutive ? {
    tone: 'border-purple-200 bg-purple-50/40',
    title: t('dues.statusExecTitle'),
    body: t('dues.statusExecBody'),
    rows: [[t('dues.statusYearLabel'), duesYearLabel(duesYear)]],
  } : benefitsActive ? {
    tone: 'border-green-200 bg-green-50/40',
    title: t('dues.statusCurrentTitle'),
    body: t('dues.statusCurrentBody'),
    rows: [[t('dues.statusThroughLabel'), paidThrough(duesYearPaid)]],
  } : {
    tone: 'border-amber-300 bg-amber-50/50',
    title: t('dues.statusOutstandingTitle'),
    body: t('dues.statusOutstandingBody'),
    rows: [
      [t('dues.statusYearLabel'), duesYearLabel(duesYear)],
      [t('dues.statusDeadlineLabel'), duesDeadline(duesYear)],
    ],
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="section-heading">{t('dues.title')}</h1>
          <p className="section-subheading">{t('dues.subtitle')}</p>
        </div>

        {statusCard && (
          <div className={`card p-6 mb-6 border ${statusCard.tone}`}>
            <h2 className="font-display text-lg font-semibold text-charcoal mb-2">{statusCard.title}</h2>
            <p className="text-sm text-charcoal-light leading-relaxed">{statusCard.body}</p>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
              {statusCard.rows.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[0.65rem] uppercase tracking-wide text-charcoal-light font-medium">{label}</p>
                  <p className="text-sm font-semibold text-charcoal">{value}</p>
                </div>
              ))}
            </div>
            {!benefitsActive && !isExecutive && (
              <p className="text-xs text-charcoal-light mt-4">{t('dues.statusRecordedNote')}</p>
            )}
          </div>
        )}

        {/* Full Member Benefits */}
        <div className="card p-6 md:p-8 mb-6">
          <h2 className="font-display text-xl font-semibold text-charcoal mb-4">{t('dues.benefitsTitle')}</h2>
          <ul className="space-y-3">
            {['benefit1', 'benefit2', 'benefit3', 'benefit4'].map(key => (
              <li key={key} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-burnt-orange shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-charcoal text-sm">{t(`dues.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Payment Info */}
        <div className="card p-6 md:p-8 mb-6 border-burnt-orange/30 bg-burnt-orange/[0.02]">
          <h2 className="font-display text-xl font-semibold text-charcoal mb-4">{t('dues.paymentTitle')}</h2>

          <div className="space-y-4">
            {/* Amount */}
            <div className="flex items-center gap-3 p-4 bg-burnt-orange/5 rounded-xl">
              <svg className="w-6 h-6 text-burnt-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-charcoal-light font-medium uppercase tracking-wide">{t('dues.amount')}</p>
                <p className="text-lg font-display font-bold text-charcoal">{t('dues.amountValue')}</p>
              </div>
            </div>

            {/* Bank Details */}
            <div className="p-4 bg-cream-light/50 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-burnt-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div>
                  <p className="text-xs text-charcoal-light font-medium uppercase tracking-wide">{t('dues.bank')}</p>
                  <p className="text-sm font-semibold text-charcoal">{t('dues.bankName')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-burnt-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <div>
                  <p className="text-xs text-charcoal-light font-medium uppercase tracking-wide">{t('dues.accountNumber')}</p>
                  <p className="text-sm font-semibold text-charcoal font-mono tracking-wider">1001-8306-7179</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-burnt-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <p className="text-xs text-charcoal-light font-medium uppercase tracking-wide">{t('dues.accountHolder')}</p>
                  <p className="text-sm font-semibold text-charcoal">{locale === 'ko' ? '장우진 (모임통장)' : 'Jang Woojin (Association Account)'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="card p-5 bg-amber-50/50 border-amber-200/60">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800">{t('dues.note')}</p>
          </div>
        </div>

        {!session && (
          <div className="text-center mt-8">
            <Link href="/signup" className="btn-primary no-underline">{t('dues.joinBtn')}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
