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

  const categoryLabel = (cat) => {
    const labels = { news: t('news.categories.news'), members_news: t('news.categories.membersNews'), pr: t('news.categories.pr') }
    return labels[cat] || cat
  }

  const subcategoryLabel = (sub) => {
    if (!sub) return ''
    const key = sub.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    return t(`news.subcategories.${key}`) || sub
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
          {/* Category badges */}
          {article.category && article.category !== 'news' && (
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                article.category === 'members_news' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {categoryLabel(article.category)}
              </span>
              {article.subcategory && (
                <span className="text-xs font-bold bg-charcoal/10 text-charcoal-light px-2 py-0.5 rounded uppercase">
                  {subcategoryLabel(article.subcategory)}
                </span>
              )}
            </div>
          )}

          {/* Pending/rejected status for author */}
          {article.approval_status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm mb-4">
              {t('news.approval.pendingMessage')}
            </div>
          )}
          {article.approval_status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-sm mb-4">
              {t('news.approval.rejectedMessage')}
            </div>
          )}

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

          {/* External link for news articles */}
          {article.external_url && (
            <a
              href={article.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 text-burnt-orange font-medium text-sm hover:underline"
            >
              {t('news.readOriginal')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          )}
        </article>
      </div>
    </div>
  )
}
