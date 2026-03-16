'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '../components/LanguageProvider'

const SUBCATEGORIES = ['marriage', 'birth', 'death', 'promotion', 'job_change', 'seeking_employment', 'hiring', 'other']

export default function SubmitPage() {
  const t = useT()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [form, setForm] = useState({
    category: 'members_news',
    subcategory: '',
    title: '',
    titleKo: '',
    content: '',
    contentKo: '',
    externalUrl: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">{t('common.loading')}</div>
  }

  if (!session) {
    router.push('/login')
    return null
  }

  const membershipLevel = session.user.membershipLevel
  const canWrite = ['executive', 'full'].includes(membershipLevel) || session.user.isAdmin

  if (!canWrite) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card p-12">
            <h1 className="font-display text-2xl font-bold text-charcoal mb-3">{t('news.submit.title')}</h1>
            <p className="text-charcoal-light">{t('permissions.noWriteAccess')}</p>
          </div>
        </div>
      </div>
    )
  }

  const subcategoryLabel = (sub) => {
    const key = sub.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    return t(`news.subcategories.${key}`) || sub
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    if (!form.title || !form.content) {
      setError(t('auth.errors.required'))
      setSubmitting(false)
      return
    }

    if (form.category === 'members_news' && !form.subcategory) {
      setError(t('news.submit.selectSubcategory'))
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('common.error'))
        setSubmitting(false)
        return
      }
      setSuccess(true)
    } catch {
      setError(t('common.error'))
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card p-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-charcoal mb-2">{t('news.submit.successMessage')}</h2>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/my-posts" className="btn-primary text-sm no-underline">{t('news.myPosts.title')}</Link>
              <Link href="/news" className="btn-secondary text-sm no-underline">{t('nav.news')}</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange"

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <span className="badge mb-3 inline-block">{t('news.submit.title')}</span>
          <h1 className="section-heading">{t('news.submit.title')}</h1>
          <p className="section-subheading">{t('news.submit.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">{t('news.submit.selectCategory')} *</label>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: '' }))}
              className={inputClass}
            >
              <option value="members_news">{t('news.categories.membersNews')}</option>
              <option value="pr">{t('news.categories.pr')}</option>
            </select>
          </div>

          {/* Subcategory (Members News only) */}
          {form.category === 'members_news' && (
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">{t('news.submit.selectSubcategory')} *</label>
              <select
                value={form.subcategory}
                onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                className={inputClass}
              >
                <option value="">-- {t('news.submit.selectSubcategory')} --</option>
                {SUBCATEGORIES.map(sub => (
                  <option key={sub} value={sub}>{subcategoryLabel(sub)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Title (EN) *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Title (KO)</label>
              <input type="text" value={form.titleKo} onChange={e => setForm(p => ({ ...p, titleKo: e.target.value }))} className={inputClass} />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">Content (EN) *</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={6} className={inputClass + ' resize-none'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">Content (KO)</label>
            <textarea value={form.contentKo} onChange={e => setForm(p => ({ ...p, contentKo: e.target.value }))} rows={6} className={inputClass + ' resize-none'} />
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">{t('news.submit.link')}</label>
            <input type="url" value={form.externalUrl} onChange={e => setForm(p => ({ ...p, externalUrl: e.target.value }))} className={inputClass} placeholder="https://..." />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary text-sm">
            {submitting ? t('common.loading') : t('news.submit.submitBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}
