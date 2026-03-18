'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useT, useLanguage } from '../../components/LanguageProvider'

export default function NewsDetailPage({ params }) {
  const { id } = use(params)
  const t = useT()
  const { locale } = useLanguage()
  const { data: session } = useSession()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const fetchComments = () => {
    fetch(`/api/news/${id}/comments`)
      .then(r => r.json())
      .then(data => setComments(data.comments || []))
      .catch(() => {})
  }

  useEffect(() => {
    fetch(`/api/news/${id}`)
      .then(r => r.json())
      .then(data => { setArticle(data.article); setLoading(false) })
      .catch(() => setLoading(false))
    fetchComments()
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
    const labels = { utaka_news: t('news.categories.utakaNews'), members_news: t('news.categories.membersNews'), sxsk: t('news.categories.sxsk'), pr: t('news.categories.pr') }
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
          {article.category && (
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                article.category === 'utaka_news' ? 'bg-orange-100 text-orange-800' :
                article.category === 'members_news' ? 'bg-blue-100 text-blue-800' :
                article.category === 'sxsk' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
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
          {(article.external_url || article.external_url_ko) && (
            <a
              href={locale === 'ko' && article.external_url_ko ? article.external_url_ko : article.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 text-burnt-orange font-medium text-sm hover:underline"
            >
              {t('news.readOriginal')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          )}
        </article>

        {/* Comments Section */}
        <div className="mt-8">
          <h3 className="font-display text-lg font-semibold text-charcoal mb-4">
            {t('news.comments.title')} ({comments.length})
          </h3>

          {/* Comment Form */}
          {session ? (
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!newComment.trim()) return
              setSubmittingComment(true)
              const res = await fetch(`/api/news/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment }),
              })
              if (res.ok) {
                setNewComment('')
                fetchComments()
              }
              setSubmittingComment(false)
            }} className="card p-4 mb-6">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={3}
                placeholder={t('news.comments.placeholder')}
                className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="btn-primary text-sm"
                >
                  {submittingComment ? t('common.loading') : t('news.comments.submit')}
                </button>
              </div>
            </form>
          ) : (
            <div className="card p-4 mb-6 text-center text-sm text-charcoal-light">
              <Link href="/login" className="text-burnt-orange font-semibold no-underline hover:underline">{t('nav.login')}</Link>
              {' '}{t('news.comments.loginRequired')}
            </div>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-sm text-charcoal-light text-center py-6">{t('news.comments.noComments')}</div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {comment.profile_image_url ? (
                        <img src={comment.profile_image_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-burnt-orange/20 text-burnt-orange text-xs font-bold flex items-center justify-center">
                          {(comment.name || '?')[0]}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-charcoal">
                        {locale === 'ko' && comment.name_ko ? comment.name_ko : comment.name}
                      </span>
                      <span className="text-xs text-charcoal-light">
                        {new Date(comment.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                      </span>
                    </div>
                    {session && (String(comment.member_id) === session.user.id || session.user.isAdmin) && (
                      <button
                        onClick={async () => {
                          if (!confirm(t('news.comments.deleteConfirm'))) return
                          await fetch(`/api/news/${id}/comments?commentId=${comment.id}`, { method: 'DELETE' })
                          fetchComments()
                        }}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none"
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
