'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '../components/LanguageProvider'

export default function SignupPage() {
  const t = useT()
  const router = useRouter()
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    name: '', nameKo: '', graduationYear: '', major: '',
    location: '', company: '', title: '', birthday: '', bio: '',
    privacyConsent: false, marketingConsent: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password || !form.name) {
      setError(t('auth.errors.required'))
      return
    }
    if (!form.privacyConsent) {
      setError(t('auth.errors.privacyRequired'))
      return
    }
    if (form.password !== form.confirmPassword) {
      setError(t('auth.errors.mismatch'))
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('common.error'))
      } else {
        setSuccess(true)
      }
    } catch {
      setError(t('common.error'))
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 pt-24 pb-16">
        <div className="w-full max-w-md text-center">
          <div className="card p-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-charcoal mb-3">{t('verify.checkEmail')}</h2>
            <p className="text-charcoal-light mb-3">{t('verify.checkEmailMessage')}</p>
            <p className="text-charcoal-light text-sm mb-6">{t('auth.pendingApproval')}</p>
            <Link href="/login" className="btn-primary no-underline">
              {t('auth.loginBtn')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-charcoal/15 bg-warm-white text-charcoal focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange transition-all text-sm"

  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-24 pb-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <svg viewBox="0 0 40 28" className="w-12 h-8 fill-burnt-orange mx-auto mb-4">
            <path d="M20 12C20 12 16 4 8 2C6 1.5 3 1.5 1 3C0.5 3.3 0 4 0.5 4.5C1 5 2 4.8 3 4.5C5 3.8 7 4 8 5C10 7 12 10 14 12C15 13 17 15 20 15C23 15 25 13 26 12C28 10 30 7 32 5C33 4 35 3.8 37 4.5C38 4.8 39 5 39.5 4.5C40 4 39.5 3.3 39 3C37 1.5 34 1.5 32 2C24 4 20 12 20 12Z"/>
            <path d="M20 15C17 15 15 17 14 19C13 21 13 24 15 26C16 27 18 28 20 28C22 28 24 27 25 26C27 24 27 21 26 19C25 17 23 15 20 15ZM20 25C18.5 25 17.5 23.5 18 22C18.3 21 19 20 20 20C21 20 21.7 21 22 22C22.5 23.5 21.5 25 20 25Z"/>
          </svg>
          <h1 className="font-display text-3xl font-bold text-charcoal">{t('auth.signupTitle')}</h1>
          <p className="text-charcoal-light mt-2">{t('auth.signupSubtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Required fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.name')} *</label>
              <input type="text" value={form.name} onChange={update('name')} required className={inputClass} placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.nameKo')}</label>
              <input type="text" value={form.nameKo} onChange={update('nameKo')} className={inputClass} placeholder="홍길동" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.email')} *</label>
            <input type="email" value={form.email} onChange={update('email')} required className={inputClass} placeholder="longhorn@utexas.edu" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.password')} *</label>
              <input type="password" value={form.password} onChange={update('password')} required minLength={8} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.confirmPassword')} *</label>
              <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required className={inputClass} />
            </div>
          </div>

          {/* Profile fields */}
          <hr className="border-charcoal/10" />
          <p className="text-xs text-charcoal-light uppercase tracking-wider font-semibold">Profile Information</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.gradYear')}</label>
              <input type="number" value={form.graduationYear} onChange={update('graduationYear')} className={inputClass} placeholder="2020" min="1950" max="2030" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.major')}</label>
              <input type="text" value={form.major} onChange={update('major')} className={inputClass} placeholder="Computer Science" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.location')}</label>
              <input type="text" value={form.location} onChange={update('location')} className={inputClass} placeholder="Seoul, Korea" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.company')}</label>
              <input type="text" value={form.company} onChange={update('company')} className={inputClass} placeholder="Samsung" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.jobTitle')}</label>
              <input type="text" value={form.title} onChange={update('title')} className={inputClass} placeholder="Software Engineer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.birthday')}</label>
              <input type="text" value={form.birthday} onChange={update('birthday')} className={inputClass} placeholder={t('auth.birthdayPlaceholder')} maxLength={6} pattern="[0-9]{6}" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.bio')}</label>
            <textarea value={form.bio} onChange={update('bio')} rows={3} className={inputClass + ' resize-none'} placeholder="Tell us a bit about yourself..." />
          </div>

          {/* Consent */}
          <hr className="border-charcoal/10" />
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacyConsent}
                onChange={(e) => setForm(prev => ({ ...prev, privacyConsent: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-charcoal/30 text-burnt-orange focus:ring-burnt-orange/30"
              />
              <span className="text-sm text-charcoal">
                {t('auth.consent.privacy')} <span className="text-red-500">*</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(e) => setForm(prev => ({ ...prev, marketingConsent: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-charcoal/30 text-burnt-orange focus:ring-burnt-orange/30"
              />
              <span className="text-sm text-charcoal-light">
                {t('auth.consent.marketing')}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : t('auth.signupBtn')}
          </button>

          <p className="text-center text-sm text-charcoal-light">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-burnt-orange font-medium hover:text-burnt-dark no-underline">
              {t('nav.login')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
