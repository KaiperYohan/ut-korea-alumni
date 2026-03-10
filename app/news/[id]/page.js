'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useT, useLanguage } from '../../components/LanguageProvider'

export default function NewsDetailPage({ params }) {
  const { id } = use(params)
  const t = useT()
  const { locale } = useLanguage()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/news/${id}`)
      .then(r => r.json())
      .then(data => { setArticle(data.article); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">{t('common.loading')}</div>
  }

  if (!article) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">Article not found</div>
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return locale === 'ko'
      ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/news" className="inline-flex items-center gap-1.5 text-sm text-charcoal-light hover:text-burnt-orange transition-colors mb-6 no-underline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          {t('common.back')}
        </Link>

        <article className="card p-8 md:p-10">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-4 text-sm text-charcoal-light">
            <span>{formatDate(article.created_at)}</span>
            {article.author_name && (
              <>
                <span className="text-charcoal/20">·</span>
                <span>{t('news.by')} {article.author_name}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal leading-tight mb-2">
            {locale === 'ko' && article.title_ko ? article.title_ko : article.title}
          </h1>
          {locale === 'ko' && article.title_ko && (
            <p className="text-lg text-charcoal-light mb-6">{article.title}</p>
          )}
          {locale === 'en' && article.title_ko && (
            <p className="text-lg text-charcoal-light mb-6">{article.title_ko}</p>
          )}

          <div className="w-16 h-0.5 bg-burnt-orange rounded-full mb-8" />

          {/* Content */}
          <div className="text-charcoal leading-relaxed whitespace-pre-wrap text-base">
            {locale === 'ko' && article.content_ko ? article.content_ko : article.content}
          </div>
        </article>
      </div>
    </div>
  )
}
