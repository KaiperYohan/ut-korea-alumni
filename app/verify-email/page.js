'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useT } from '../components/LanguageProvider'

function VerifyEmailContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState('')
  const verifiedRef = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('no-token')
      return
    }
    if (verifiedRef.current) return
    verifiedRef.current = true

    fetch(`/api/verify-email?token=${token}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus(data.alreadyVerified ? 'already' : 'success')
        } else if (data.error?.includes('expired')) {
          setStatus('expired')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [token])

  const handleResend = async (e) => {
    e.preventDefault()
    if (!resendEmail) return
    setResendStatus('sending')
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      if (res.ok) {
        setResendStatus('sent')
      } else {
        setResendStatus('error')
      }
    } catch {
      setResendStatus('error')
    }
  }

  const icons = {
    success: (
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
      </div>
    ),
    error: (
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
      </div>
    ),
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-charcoal/15 bg-warm-white text-charcoal focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange transition-all text-sm"

  return (
    <div className="card p-10">
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 border-4 border-burnt-orange/20 border-t-burnt-orange rounded-full animate-spin mx-auto mb-5"></div>
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">{t('verify.verifying')}</h2>
        </>
      )}

      {status === 'success' && (
        <>
          {icons.success}
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">{t('verify.successTitle')}</h2>
          <p className="text-charcoal-light mb-6">{t('verify.successMessage')}</p>
          <Link href="/login" className="btn-primary no-underline">
            {t('auth.loginBtn')}
          </Link>
        </>
      )}

      {status === 'already' && (
        <>
          {icons.success}
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">{t('verify.alreadyTitle')}</h2>
          <p className="text-charcoal-light mb-6">{t('verify.alreadyMessage')}</p>
          <Link href="/login" className="btn-primary no-underline">
            {t('auth.loginBtn')}
          </Link>
        </>
      )}

      {(status === 'error' || status === 'expired') && (
        <>
          {icons.error}
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">
            {status === 'expired' ? t('verify.expiredTitle') : t('verify.errorTitle')}
          </h2>
          <p className="text-charcoal-light mb-6">
            {status === 'expired' ? t('verify.expiredMessage') : t('verify.errorMessage')}
          </p>
        </>
      )}

      {status === 'no-token' && (
        <>
          {icons.error}
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">{t('verify.errorTitle')}</h2>
          <p className="text-charcoal-light mb-6">{t('verify.noToken')}</p>
        </>
      )}

      {(status === 'error' || status === 'expired' || status === 'no-token') && (
        <div className="mt-6 pt-6 border-t border-charcoal/10">
          <p className="text-sm text-charcoal-light mb-3">{t('verify.resendPrompt')}</p>
          <form onSubmit={handleResend} className="space-y-3">
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder={t('auth.email')}
              required
              className={inputClass}
            />
            <button type="submit" disabled={resendStatus === 'sending'} className="btn-secondary w-full !py-2.5 cursor-pointer">
              {resendStatus === 'sending' ? t('common.loading') : t('verify.resendBtn')}
            </button>
          </form>
          {resendStatus === 'sent' && (
            <p className="text-green-600 text-sm mt-3">{t('verify.resendSuccess')}</p>
          )}
          {resendStatus === 'error' && (
            <p className="text-red-600 text-sm mt-3">{t('common.error')}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-24 pb-16">
      <div className="w-full max-w-md text-center">
        <Suspense fallback={
          <div className="card p-10">
            <div className="w-16 h-16 border-4 border-burnt-orange/20 border-t-burnt-orange rounded-full animate-spin mx-auto mb-5"></div>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  )
}
