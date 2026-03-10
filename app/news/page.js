'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useT, useLanguage } from '../components/LanguageProvider'

export default function NewsPage() {
  const t = useT()
  const { locale } = useLanguage()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(data => { setArticles(data.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return locale === 'ko'
      ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <span className="badge mb-3 inline-block">{t('nav.news')}</span>
          <h1 className="section-heading">{t('news.title')}</h1>
          <p className="section-subheading">{t('news.subtitle')}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-charcoal-light">{t('common.loading')}</div>
        ) : articles.length === 0 ? (
          <div className="card p-12 text-center text-charcoal-light">{t('news.noNews')}</div>
        ) : (
          <div className="space-y-6">
            {articles.map(article => (
              <Link key={article.id} href={`/news/${article.id}`} className="card overflow-hidden flex flex-col md:flex-row no-underline group">
                {/* Placeholder image area */}
                <div className="shrink-0 w-full md:w-56 h-40 md:h-auto bg-gradient-to-br from-cream to-cream-light relative overflow-hidden">
                  <div className="absolute inset-0 diagonal-accent" />
                </div>
                <div className="flex-1 p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-charcoal-light">{formatDate(article.created_at)}</span>
                    {article.author_name && (
                      <>
                        <span className="text-charcoal/20">·</span>
                        <span className="text-xs text-charcoal-light">{t('news.by')} {article.author_name}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-semibold text-charcoal group-hover:text-burnt-orange transition-colors leading-snug">
                    {locale === 'ko' && article.title_ko ? article.title_ko : article.title}
                  </h2>
                  {locale === 'ko' && article.title_ko && (
                    <p className="text-sm text-charcoal-light mt-0.5">{article.title}</p>
                  )}
                  <p className="text-sm text-charcoal-light mt-2 line-clamp-2 leading-relaxed">
                    {(locale === 'ko' && article.content_ko ? article.content_ko : article.content)?.slice(0, 200)}...
                  </p>
                  <span className="inline-flex items-center gap-1 text-burnt-orange text-sm font-medium mt-3">
                    {t('news.readMore')}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
