'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useT, useLanguage } from '../components/LanguageProvider'

const CATEGORIES = ['news', 'members_news', 'pr']
const SUBCATEGORIES = ['marriage', 'birth', 'death', 'promotion', 'job_change', 'seeking_employment', 'birthday']

export default function NewsPage() {
  const t = useT()
  const { locale } = useLanguage()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('news')
  const [activeSubcategory, setActiveSubcategory] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ category: activeCategory })
    if (activeSubcategory) params.set('subcategory', activeSubcategory)
    fetch(`/api/news?${params}`)
      .then(r => r.json())
      .then(data => { setArticles(data.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeCategory, activeSubcategory])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return locale === 'ko'
      ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const categoryLabel = (cat) => {
    const labels = {
      news: t('news.categories.news'),
      members_news: t('news.categories.membersNews'),
      pr: t('news.categories.pr'),
    }
    return labels[cat] || cat
  }

  const subcategoryLabel = (sub) => {
    const key = sub.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    return t(`news.subcategories.${key}`) || sub
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="badge mb-3 inline-block">{t('nav.news')}</span>
          <h1 className="section-heading">{t('news.title')}</h1>
          <p className="section-subheading">{t('news.subtitle')}</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 mb-6 border-b border-charcoal/10 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setActiveSubcategory('') }}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer bg-transparent border-t-0 border-x-0 ${
                activeCategory === cat
                  ? 'border-burnt-orange text-burnt-orange'
                  : 'border-transparent text-charcoal-light hover:text-charcoal'
              }`}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Subcategory filter for Members News */}
        {activeCategory === 'members_news' && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveSubcategory('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                !activeSubcategory
                  ? 'bg-burnt-orange text-white border-burnt-orange'
                  : 'bg-white text-charcoal-light border-charcoal/15 hover:border-burnt-orange hover:text-burnt-orange'
              }`}
            >
              {t('members.allYears').replace(/years?|연도/gi, '').trim() || 'All'}
            </button>
            {SUBCATEGORIES.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                  activeSubcategory === sub
                    ? 'bg-burnt-orange text-white border-burnt-orange'
                    : 'bg-white text-charcoal-light border-charcoal/15 hover:border-burnt-orange hover:text-burnt-orange'
                }`}
              >
                {subcategoryLabel(sub)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-charcoal-light">{t('common.loading')}</div>
        ) : articles.length === 0 ? (
          <div className="card p-12 text-center text-charcoal-light">{t('news.noNews')}</div>
        ) : (
          <div className="space-y-6">
            {articles.map(article => {
              const hasExternal = !!article.external_url
              const CardTag = hasExternal ? 'a' : Link
              const cardProps = hasExternal
                ? { href: article.external_url, target: '_blank', rel: 'noopener noreferrer' }
                : { href: `/news/${article.id}` }

              return (
                <CardTag key={article.id} {...cardProps} className="card overflow-hidden flex flex-col md:flex-row no-underline group">
                  {/* Placeholder image area */}
                  <div className="shrink-0 w-full md:w-56 h-40 md:h-auto bg-gradient-to-br from-cream to-cream-light relative overflow-hidden">
                    <div className="absolute inset-0 diagonal-accent" />
                  </div>
                  <div className="flex-1 p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {article.category && article.category !== 'news' && (
                        <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${
                          article.category === 'members_news' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {categoryLabel(article.category)}
                        </span>
                      )}
                      {article.subcategory && (
                        <span className="text-[0.6rem] font-bold bg-charcoal/10 text-charcoal-light px-1.5 py-0.5 rounded uppercase">
                          {subcategoryLabel(article.subcategory)}
                        </span>
                      )}
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
                      {hasExternal ? t('news.readOriginal') : t('news.readMore')}
                      {hasExternal ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      )}
                    </span>
                  </div>
                </CardTag>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
