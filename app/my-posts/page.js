'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT, useLanguage } from '../components/LanguageProvider'

export default function MyPostsPage() {
  const t = useT()
  const { locale } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && !fetchedRef.current) {
      fetchedRef.current = true
      fetch('/api/my-posts')
        .then(r => r.json())
        .then(data => { setPosts(data.posts || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [status])

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/news/${id}`, { method: 'DELETE' })
    setPosts(posts.filter(p => p.id !== id))
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return locale === 'ko'
      ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const categoryLabel = (cat) => {
    const labels = { members_news: t('news.categories.membersNews'), pr: t('news.categories.pr') }
    return labels[cat] || cat
  }

  const statusBadge = (approvalStatus) => {
    if (approvalStatus === 'pending') {
      return <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase">{t('news.approval.pending')}</span>
    }
    if (approvalStatus === 'approved') {
      return <span className="text-[0.6rem] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase">{t('news.approval.approved')}</span>
    }
    if (approvalStatus === 'rejected') {
      return <span className="text-[0.6rem] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded uppercase">{t('news.approval.rejected')}</span>
    }
    return null
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">{t('common.loading')}</div>
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-heading">{t('news.myPosts.title')}</h1>
            <p className="section-subheading">{t('news.myPosts.subtitle')}</p>
          </div>
          <Link href="/submit" className="btn-primary text-sm no-underline">{t('news.submit.title')}</Link>
        </div>

        {posts.length === 0 ? (
          <div className="card p-12 text-center text-charcoal-light">{t('news.myPosts.noPosts')}</div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-charcoal text-sm">
                      {locale === 'ko' && post.title_ko ? post.title_ko : post.title}
                    </h4>
                    <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${
                      post.category === 'members_news' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {categoryLabel(post.category)}
                    </span>
                    {statusBadge(post.approval_status)}
                  </div>
                  <p className="text-xs text-charcoal-light mt-0.5">{formatDate(post.created_at)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/news/${post.id}`} className="px-3 py-1.5 bg-burnt-orange/10 text-burnt-orange text-xs font-semibold rounded-lg no-underline hover:bg-burnt-orange/20">
                    {t('common.edit')}
                  </Link>
                  <button onClick={() => handleDelete(post.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-200">
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
