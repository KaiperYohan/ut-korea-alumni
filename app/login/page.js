'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '../components/LanguageProvider'

export default function LoginPage() {
  const t = useT()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      if (result.error.includes('EMAIL_NOT_VERIFIED')) {
        setError(t('auth.errors.emailNotVerified'))
      } else {
        setError(t('auth.errors.invalid'))
      }
    } else {
      router.push('/members')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-24 pb-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/favicon.png" alt="UTAKA" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-charcoal">{t('auth.loginTitle')}</h1>
          <p className="text-charcoal-light mt-2">{t('auth.loginSubtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-charcoal/15 bg-warm-white text-charcoal focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange transition-all text-sm"
              placeholder="longhorn@utexas.edu"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-charcoal">{t('auth.password')}</label>
              <Link href="/forgot-password" className="text-xs text-burnt-orange hover:text-burnt-dark no-underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-charcoal/15 bg-warm-white text-charcoal focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : t('auth.loginBtn')}
          </button>

          <p className="text-center text-sm text-charcoal-light">
            {t('auth.noAccount')}{' '}
            <Link href="/signup" className="text-burnt-orange font-medium hover:text-burnt-dark no-underline">
              {t('nav.signup')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
