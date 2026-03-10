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
      setError(t('auth.errors.invalid'))
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
          <svg viewBox="0 0 40 28" className="w-12 h-8 fill-burnt-orange mx-auto mb-4">
            <path d="M20 12C20 12 16 4 8 2C6 1.5 3 1.5 1 3C0.5 3.3 0 4 0.5 4.5C1 5 2 4.8 3 4.5C5 3.8 7 4 8 5C10 7 12 10 14 12C15 13 17 15 20 15C23 15 25 13 26 12C28 10 30 7 32 5C33 4 35 3.8 37 4.5C38 4.8 39 5 39.5 4.5C40 4 39.5 3.3 39 3C37 1.5 34 1.5 32 2C24 4 20 12 20 12Z"/>
            <path d="M20 15C17 15 15 17 14 19C13 21 13 24 15 26C16 27 18 28 20 28C22 28 24 27 25 26C27 24 27 21 26 19C25 17 23 15 20 15ZM20 25C18.5 25 17.5 23.5 18 22C18.3 21 19 20 20 20C21 20 21.7 21 22 22C22.5 23.5 21.5 25 20 25Z"/>
          </svg>
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
            <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.password')}</label>
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
