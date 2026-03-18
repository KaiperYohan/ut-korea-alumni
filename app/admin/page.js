'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useT } from '../components/LanguageProvider'

export default function AdminPage() {
  const t = useT()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [articles, setArticles] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [orgPositions, setOrgPositions] = useState([])
  const [orgSaving, setOrgSaving] = useState(false)
  const [siteSettings, setSiteSettings] = useState({ stat_members: '150+', stat_events: '50+', stat_years: '15+' })
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Event form state
  const [eventForm, setEventForm] = useState({ title: '', titleKo: '', description: '', descriptionKo: '', eventDate: '', location: '', locationKo: '', maxAttendees: '', externalUrl: '', imageUrl: '', timeTba: false, locationTba: false })
  const [editingEvent, setEditingEvent] = useState(null)
  const [uploadingEventImage, setUploadingEventImage] = useState(false)

  const [translatingEvent, setTranslatingEvent] = useState(false)
  const [translatingNews, setTranslatingNews] = useState(false)

  // News form state
  const [newsForm, setNewsForm] = useState({ title: '', titleKo: '', content: '', contentKo: '', published: false, category: 'utaka_news', externalUrl: '' })
  const [editingNews, setEditingNews] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !session?.user?.isAdmin) router.push('/')
  }, [status, session, router])

  const fetchAll = async () => {
    setLoading(true)
    const [membersRes, eventsRes, newsRes, subsRes, orgRes, settingsRes] = await Promise.all([
      fetch('/api/admin/members'),
      fetch('/api/events'),
      fetch('/api/admin/news'),
      fetch('/api/admin/submissions'),
      fetch('/api/admin/org'),
      fetch('/api/admin/settings'),
    ])
    const [membersData, eventsData, newsData, subsData, orgData, settingsData] = await Promise.all([
      membersRes.json(),
      eventsRes.json(),
      newsRes.json(),
      subsRes.json(),
      orgRes.json(),
      settingsRes.json(),
    ])
    setMembers(membersData.members || [])
    setEvents(eventsData.events || [])
    setArticles(newsData.articles || [])
    setSubmissions(subsData.submissions || [])
    setOrgPositions(orgData.positions || [])
    if (settingsData.settings) {
      setSiteSettings(prev => ({ ...prev, ...settingsData.settings }))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) fetchAll()
  }, [status, session])

  const handleMemberAction = async (id, action, level) => {
    if (action === 'delete' && !confirm('Delete this member?')) return
    await fetch('/api/admin/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, level }),
    })
    fetchAll()
  }

  const translateText = async (text, from, to) => {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.translated
  }

  const handleTranslateEvent = async (direction) => {
    setTranslatingEvent(true)
    try {
      if (direction === 'en-to-ko') {
        const [titleKo, descriptionKo, locationKo] = await Promise.all([
          eventForm.title ? translateText(eventForm.title, 'en', 'ko') : Promise.resolve(''),
          eventForm.description ? translateText(eventForm.description, 'en', 'ko') : Promise.resolve(''),
          eventForm.location ? translateText(eventForm.location, 'en', 'ko') : Promise.resolve(''),
        ])
        setEventForm(p => ({ ...p, titleKo: titleKo || p.titleKo, descriptionKo: descriptionKo || p.descriptionKo, locationKo: locationKo || p.locationKo }))
      } else {
        const [title, description, location] = await Promise.all([
          eventForm.titleKo ? translateText(eventForm.titleKo, 'ko', 'en') : Promise.resolve(''),
          eventForm.descriptionKo ? translateText(eventForm.descriptionKo, 'ko', 'en') : Promise.resolve(''),
          eventForm.locationKo ? translateText(eventForm.locationKo, 'ko', 'en') : Promise.resolve(''),
        ])
        setEventForm(p => ({ ...p, title: title || p.title, description: description || p.description, location: location || p.location }))
      }
    } catch { }
    setTranslatingEvent(false)
  }

  const handleTranslateNews = async (direction) => {
    setTranslatingNews(true)
    try {
      if (direction === 'en-to-ko') {
        const [titleKo, contentKo] = await Promise.all([
          newsForm.title ? translateText(newsForm.title, 'en', 'ko') : Promise.resolve(''),
          newsForm.content ? translateText(newsForm.content, 'en', 'ko') : Promise.resolve(''),
        ])
        setNewsForm(p => ({ ...p, titleKo: titleKo || p.titleKo, contentKo: contentKo || p.contentKo }))
      } else {
        const [title, content] = await Promise.all([
          newsForm.titleKo ? translateText(newsForm.titleKo, 'ko', 'en') : Promise.resolve(''),
          newsForm.contentKo ? translateText(newsForm.contentKo, 'ko', 'en') : Promise.resolve(''),
        ])
        setNewsForm(p => ({ ...p, title: title || p.title, content: content || p.content }))
      }
    } catch { }
    setTranslatingNews(false)
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    const url = editingEvent ? `/api/events/${editingEvent}` : '/api/events'
    const method = editingEvent ? 'PUT' : 'POST'
    const payload = { ...eventForm, eventDate: eventForm.eventDate ? eventForm.eventDate + ':00+09:00' : '' }
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Failed to save event')
      return
    }
    setEventForm({ title: '', titleKo: '', description: '', descriptionKo: '', eventDate: '', location: '', locationKo: '', maxAttendees: '', externalUrl: '', imageUrl: '', timeTba: false, locationTba: false })
    setEditingEvent(null)
    fetchAll()
  }

  const toKSTLocal = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
    return kst.toISOString().slice(0, 16)
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event.id)
    setEventForm({
      title: event.title, titleKo: event.title_ko || '', description: event.description || '', descriptionKo: event.description_ko || '',
      eventDate: toKSTLocal(event.event_date), location: event.location || '', locationKo: event.location_ko || '', maxAttendees: event.max_attendees || '',
      externalUrl: event.external_url || '', imageUrl: event.image_url || '',
      timeTba: event.time_tba || false, locationTba: event.location_tba || false,
    })
  }

  const handleEventImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingEventImage(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/events/image', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setEventForm(p => ({ ...p, imageUrl: data.url }))
      }
    } catch {}
    setUploadingEventImage(false)
  }

  const handleDeleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const handleNewsSubmit = async (e) => {
    e.preventDefault()
    const url = editingNews ? `/api/news/${editingNews}` : '/api/news'
    const method = editingNews ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newsForm) })
    setNewsForm({ title: '', titleKo: '', content: '', contentKo: '', published: false, category: 'utaka_news', externalUrl: '' })
    setEditingNews(null)
    fetchAll()
  }

  const handleEditNews = (article) => {
    setEditingNews(article.id)
    setNewsForm({
      title: article.title, titleKo: article.title_ko || '', content: article.content, contentKo: article.content_ko || '',
      published: article.published, category: article.category || 'utaka_news', externalUrl: article.external_url || '',
    })
  }

  const handleSubmissionAction = async (id, action) => {
    await fetch(`/api/admin/submissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    fetchAll()
  }

  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)

  const handleScrape = async () => {
    setScraping(true)
    setScrapeResult(null)
    try {
      const res = await fetch('/api/admin/scrape-news', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setScrapeResult(`Imported ${data.imported} articles, skipped ${data.skipped} duplicates.`)
        fetchAll()
      } else {
        setScrapeResult(`Error: ${data.error}`)
      }
    } catch {
      setScrapeResult('Failed to sync.')
    }
    setScraping(false)
  }

  const handleClearAndResync = async () => {
    if (!confirm('This will delete all scraped SXSK articles and re-import them. Continue?')) return
    setScraping(true)
    setScrapeResult(null)
    try {
      const delRes = await fetch('/api/admin/scrape-news', { method: 'DELETE' })
      const delData = await delRes.json()
      if (!delRes.ok) { setScrapeResult(`Error clearing: ${delData.error}`); setScraping(false); return }

      const res = await fetch('/api/admin/scrape-news', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setScrapeResult(`Cleared ${delData.deleted} old articles. Re-imported ${data.imported} articles.`)
        fetchAll()
      } else {
        setScrapeResult(`Cleared ${delData.deleted} but import failed: ${data.error}`)
      }
    } catch {
      setScrapeResult('Failed to clear & re-sync.')
    }
    setScraping(false)
  }

  const handleDeleteNews = async (id) => {
    if (!confirm('Delete this article?')) return
    await fetch(`/api/news/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  // Organization committee definitions
  const committees = [
    { key: 'executive', name: 'Executive Committee', nameKo: '집행위원회', slots: [
      { role: 'chair', label: 'Chair', count: 1 },
      { role: 'vice_chair', label: 'Vice Chair', count: 2 },
      { role: 'general_secretary', label: 'General Secretary', count: 1 },
      { role: 'historian', label: 'Historian', count: 1 },
    ]},
    { key: 'membership', name: 'Membership Development Committee', nameKo: '회원개발위원회', slots: [
      { role: 'chair', label: 'Chair', count: 1 },
      { role: 'vice_chair', label: 'Vice Chair', count: 5 },
      { role: 'member', label: 'Committee Member', count: 6 },
    ]},
    { key: 'social', name: 'Social Affairs Committee', nameKo: '사회활동위원회', slots: [
      { role: 'chair', label: 'Chair', count: 1 },
      { role: 'vice_chair', label: 'Vice Chair', count: 3 },
      { role: 'member', label: 'Committee Member', count: 5 },
    ]},
    { key: 'nominating', name: 'Nominating Committee', nameKo: '인사위원회', slots: [
      { role: 'chair', label: 'Chair', count: 1 },
      { role: 'member', label: 'Committee Member', count: 2 },
    ]},
    { key: 'finance', name: 'Finance and Planning Committee', nameKo: '재정기획위원회', slots: [
      { role: 'chair', label: 'Chair (Treasurer)', count: 1 },
      { role: 'vice_chair', label: 'Vice Chair', count: 2 },
      { role: 'member', label: 'Committee Member', count: 7 },
    ]},
  ]

  // Build org state from fetched positions
  const getOrgMember = (committee, role, index) => {
    const matches = orgPositions.filter(p => p.committee === committee && p.role === role)
    return matches[index]?.member_id?.toString() || ''
  }

  const handleOrgSave = async (formData) => {
    setOrgSaving(true)
    const positions = []
    let sortOrder = 0
    for (const committee of committees) {
      for (const slot of committee.slots) {
        for (let i = 0; i < slot.count; i++) {
          const memberId = formData.get(`${committee.key}_${slot.role}_${i}`)
          positions.push({
            committee: committee.key,
            role: slot.role,
            member_id: memberId || null,
            sort_order: sortOrder++,
          })
        }
      }
    }
    await fetch('/api/admin/org', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions }),
    })
    await fetchAll()
    setOrgSaving(false)
  }

  const handleSettingsSave = async () => {
    setSettingsSaving(true)
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: siteSettings }),
    })
    setSettingsSaving(false)
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-charcoal-light">Loading...</div>
  }

  if (!session?.user?.isAdmin) return null

  const pendingCount = members.filter(m => !m.is_approved).length
  const executiveCount = members.filter(m => m.membership_level === 'executive').length
  const fullCount = members.filter(m => m.membership_level === 'full').length
  const generalCount = members.filter(m => !m.membership_level || m.membership_level === 'general').length
  const inputClass = "w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange"

  const pendingSubmissions = submissions.length

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'members', label: `Members ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
    { id: 'submissions', label: `Submissions ${pendingSubmissions > 0 ? `(${pendingSubmissions})` : ''}` },
    { id: 'events', label: 'Events' },
    { id: 'news', label: 'News/SXSK' },
    { id: 'org', label: 'Organization' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 px-5 md:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="section-heading mb-6">Admin Panel</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-charcoal/10 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer bg-transparent border-t-0 border-x-0 ${
                activeTab === tab.id
                  ? 'border-burnt-orange text-burnt-orange'
                  : 'border-transparent text-charcoal-light hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="card p-6 text-center">
              <div className="font-display text-3xl font-bold text-burnt-orange">{members.length}</div>
              <div className="text-sm text-charcoal-light mt-1">Total Members</div>
            </div>
            <div className="card p-6 text-center">
              <div className="font-display text-3xl font-bold text-amber-600">{pendingCount}</div>
              <div className="text-sm text-charcoal-light mt-1">Pending Approval</div>
            </div>
            <div className="card p-6 text-center">
              <div className="font-display text-3xl font-bold text-burnt-orange">{events.length}</div>
              <div className="text-sm text-charcoal-light mt-1">Total Events</div>
            </div>
            <div className="card p-6 text-center">
              <div className="font-display text-3xl font-bold text-burnt-orange">{articles.length}</div>
              <div className="text-sm text-charcoal-light mt-1">News Articles</div>
            </div>
            {pendingSubmissions > 0 && (
              <div className="card p-6 text-center border-amber-300 bg-amber-50/30">
                <div className="font-display text-3xl font-bold text-amber-600">{pendingSubmissions}</div>
                <div className="text-sm text-charcoal-light mt-1">Pending Submissions</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-5 mt-5">
            <div className="card p-5 text-center">
              <div className="font-display text-2xl font-bold text-purple-700">{executiveCount}</div>
              <div className="text-sm text-charcoal-light mt-1">Executive</div>
            </div>
            <div className="card p-5 text-center">
              <div className="font-display text-2xl font-bold text-blue-700">{fullCount}</div>
              <div className="text-sm text-charcoal-light mt-1">Full</div>
            </div>
            <div className="card p-5 text-center">
              <div className="font-display text-2xl font-bold text-charcoal-light">{generalCount}</div>
              <div className="text-sm text-charcoal-light mt-1">General</div>
            </div>
          </div>
          </>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${!member.is_approved ? 'border-amber-300 bg-amber-50/30' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-charcoal text-sm">{member.name}</span>
                    {member.name_ko && <span className="text-xs text-charcoal-light">({member.name_ko})</span>}
                    {member.is_admin && <span className="text-[0.6rem] font-bold bg-burnt-orange text-white px-1.5 py-0.5 rounded uppercase">Admin</span>}
                    {!member.is_approved && <span className="text-[0.6rem] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase">Pending</span>}
                    <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${
                      member.membership_level === 'executive' ? 'bg-purple-100 text-purple-800' :
                      member.membership_level === 'full' ? 'bg-blue-100 text-blue-800' :
                      'bg-charcoal/10 text-charcoal-light'
                    }`}>
                      {member.membership_level || 'general'}
                    </span>
                  </div>
                  <div className="text-xs text-charcoal-light mt-0.5">
                    {member.email} · {member.graduation_year ? `Class of ${member.graduation_year}` : 'No year'} · {member.major || 'No major'}
                    {member.company && ` · ${member.company}`}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <select
                    value={member.membership_level || 'general'}
                    onChange={(e) => handleMemberAction(member.id, 'set_level', e.target.value)}
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-charcoal/15 bg-white text-charcoal cursor-pointer focus:outline-none focus:ring-2 focus:ring-burnt-orange/30"
                  >
                    <option value="general">General</option>
                    <option value="full">Full</option>
                    <option value="executive">Executive</option>
                  </select>
                  {!member.is_approved ? (
                    <button onClick={() => handleMemberAction(member.id, 'approve')} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-green-700">Approve</button>
                  ) : (
                    <button onClick={() => handleMemberAction(member.id, 'unapprove')} className="px-3 py-1.5 bg-charcoal/10 text-charcoal text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-charcoal/20">Unapprove</button>
                  )}
                  {!member.is_admin ? (
                    <button onClick={() => handleMemberAction(member.id, 'make_admin')} className="px-3 py-1.5 bg-burnt-orange/10 text-burnt-orange text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-burnt-orange/20">Make Admin</button>
                  ) : (
                    <button onClick={() => handleMemberAction(member.id, 'remove_admin')} className="px-3 py-1.5 bg-charcoal/10 text-charcoal text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-charcoal/20">Remove Admin</button>
                  )}
                  <button onClick={() => handleMemberAction(member.id, 'delete')} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-200">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-charcoal-light text-sm py-8 text-center">No pending submissions.</p>
            ) : submissions.map(sub => (
              <div key={sub.id} className="card p-4 border-amber-200 bg-amber-50/20">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-charcoal text-sm">{sub.title}</h4>
                      <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${
                        sub.category === 'utaka_news' ? 'bg-orange-100 text-orange-800' :
                        sub.category === 'members_news' ? 'bg-blue-100 text-blue-800' :
                        sub.category === 'sxsk' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {sub.category === 'utaka_news' ? 'UTAKA News' :
                         sub.category === 'members_news' ? 'Members News' :
                         sub.category === 'sxsk' ? 'SXSK' : 'PR'}
                      </span>
                      {sub.subcategory && (
                        <span className="text-[0.6rem] font-bold bg-charcoal/10 text-charcoal-light px-1.5 py-0.5 rounded uppercase">
                          {sub.subcategory.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-light">
                      {t('news.by')} {sub.author_name || 'Unknown'} ({sub.author_email}) · {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-charcoal mt-2 line-clamp-3">{sub.content?.slice(0, 300)}{sub.content?.length > 300 ? '...' : ''}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleSubmissionAction(sub.id, 'approve')} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-green-700">Approve</button>
                    <button onClick={() => handleSubmissionAction(sub.id, 'reject')} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-200">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div>
            {/* Event form */}
            <form onSubmit={handleEventSubmit} className="card p-6 mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-charcoal">{editingEvent ? 'Edit Event' : 'Create Event'}</h3>
                <div className="flex gap-2">
                  <button type="button" disabled={translatingEvent || (!eventForm.title && !eventForm.description)} onClick={() => handleTranslateEvent('en-to-ko')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg cursor-pointer border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    {translatingEvent ? '...' : 'EN → KO'}
                  </button>
                  <button type="button" disabled={translatingEvent || (!eventForm.titleKo && !eventForm.descriptionKo)} onClick={() => handleTranslateEvent('ko-to-en')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg cursor-pointer border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    {translatingEvent ? '...' : 'KO → EN'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Title (EN) *</label>
                  <input type="text" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Title (KO)</label>
                  <input type="text" value={eventForm.titleKo} onChange={e => setEventForm(p => ({ ...p, titleKo: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Date & Time (KST) *</label>
                  <input type="datetime-local" step="1800" value={eventForm.eventDate} onChange={e => setEventForm(p => ({ ...p, eventDate: e.target.value }))} required className={inputClass} />
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={eventForm.timeTba} onChange={e => setEventForm(p => ({ ...p, timeTba: e.target.checked }))} className="rounded" />
                    <span className="text-xs text-charcoal-light">Time TBA (show date only)</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Max Attendees</label>
                  <input type="number" value={eventForm.maxAttendees} onChange={e => setEventForm(p => ({ ...p, maxAttendees: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Location (EN)</label>
                  <input type="text" value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} className={inputClass} disabled={eventForm.locationTba} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Location (KO)</label>
                  <input type="text" value={eventForm.locationKo} onChange={e => setEventForm(p => ({ ...p, locationKo: e.target.value }))} className={inputClass} disabled={eventForm.locationTba} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer -mt-2">
                <input type="checkbox" checked={eventForm.locationTba} onChange={e => setEventForm(p => ({ ...p, locationTba: e.target.checked }))} className="rounded" />
                <span className="text-xs text-charcoal-light">Location TBA</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Description (EN)</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} rows={3} className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Description (KO)</label>
                <textarea value={eventForm.descriptionKo} onChange={e => setEventForm(p => ({ ...p, descriptionKo: e.target.value }))} rows={3} className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Link (Optional)</label>
                <input type="url" value={eventForm.externalUrl} onChange={e => setEventForm(p => ({ ...p, externalUrl: e.target.value }))} className={inputClass} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Event Image</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={handleEventImageUpload} disabled={uploadingEventImage} className="text-sm text-charcoal-light file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-burnt-orange/10 file:text-burnt-orange hover:file:bg-burnt-orange/20 file:cursor-pointer" />
                  {uploadingEventImage && <span className="text-xs text-charcoal-light">Uploading...</span>}
                </div>
                {eventForm.imageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={eventForm.imageUrl} alt="Preview" className="w-20 h-14 object-cover rounded" />
                    <button type="button" onClick={() => setEventForm(p => ({ ...p, imageUrl: '' }))} className="text-xs text-red-600 hover:text-red-700 cursor-pointer bg-transparent border-none">Remove</button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary text-sm">{editingEvent ? 'Update' : 'Create'} Event</button>
                {editingEvent && (
                  <button type="button" onClick={() => { setEditingEvent(null); setEventForm({ title: '', titleKo: '', description: '', descriptionKo: '', eventDate: '', location: '', locationKo: '', maxAttendees: '', externalUrl: '', imageUrl: '', timeTba: false, locationTba: false }) }} className="btn-secondary text-sm">Cancel</button>
                )}
              </div>
            </form>

            {/* Events list */}
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-charcoal text-sm">{event.title}</h4>
                    {event.title_ko && <p className="text-xs text-charcoal-light">{event.title_ko}</p>}
                    <p className="text-xs text-charcoal-light mt-0.5">
                      {new Date(event.event_date).toLocaleDateString()} · {event.location || 'No location'} · {event.attendee_count || 0} RSVPs
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEditEvent(event)} className="px-3 py-1.5 bg-burnt-orange/10 text-burnt-orange text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-burnt-orange/20">Edit</button>
                    <button onClick={() => handleDeleteEvent(event.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-200">Delete</button>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="text-charcoal-light text-sm py-8 text-center">No events yet.</p>}
            </div>
          </div>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <div>
            {/* Sync from SXSK */}
            <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-charcoal text-sm">Sync from SXSK.news</h4>
                <p className="text-xs text-charcoal-light mt-0.5">Import articles from the sxsk.news RSS feed (English + Korean)</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleScrape}
                  disabled={scraping}
                  className="px-4 py-2 bg-burnt-orange text-white text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-burnt-orange/90 disabled:opacity-50 whitespace-nowrap"
                >
                  {scraping ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleClearAndResync}
                  disabled={scraping}
                  className="px-4 py-2 bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-200 disabled:opacity-50 whitespace-nowrap"
                >
                  {scraping ? 'Working...' : 'Clear & Re-sync'}
                </button>
              </div>
            </div>
            {scrapeResult && (
              <div className={`mb-6 px-4 py-2 rounded-lg text-sm ${scrapeResult.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {scrapeResult}
              </div>
            )}

            {/* News form */}
            <form onSubmit={handleNewsSubmit} className="card p-6 mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-charcoal">{editingNews ? 'Edit Article' : 'Create News Article'}</h3>
                <div className="flex gap-2">
                  <button type="button" disabled={translatingNews || (!newsForm.title && !newsForm.content)} onClick={() => handleTranslateNews('en-to-ko')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg cursor-pointer border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    {translatingNews ? '...' : 'EN → KO'}
                  </button>
                  <button type="button" disabled={translatingNews || (!newsForm.titleKo && !newsForm.contentKo)} onClick={() => handleTranslateNews('ko-to-en')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg cursor-pointer border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    {translatingNews ? '...' : 'KO → EN'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Title (EN) *</label>
                  <input type="text" value={newsForm.title} onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Title (KO)</label>
                  <input type="text" value={newsForm.titleKo} onChange={e => setNewsForm(p => ({ ...p, titleKo: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Category</label>
                  <select value={newsForm.category} onChange={e => setNewsForm(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                    <option value="utaka_news">UTAKA News</option>
                    <option value="sxsk">SXSK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">External URL</label>
                  <input type="url" value={newsForm.externalUrl} onChange={e => setNewsForm(p => ({ ...p, externalUrl: e.target.value }))} placeholder="https://..." className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Content (EN) *</label>
                <textarea value={newsForm.content} onChange={e => setNewsForm(p => ({ ...p, content: e.target.value }))} rows={6} required className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Content (KO)</label>
                <textarea value={newsForm.contentKo} onChange={e => setNewsForm(p => ({ ...p, contentKo: e.target.value }))} rows={6} className={inputClass + ' resize-none'} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newsForm.published} onChange={e => setNewsForm(p => ({ ...p, published: e.target.checked }))} className="w-4 h-4 accent-burnt-orange" />
                <span className="text-sm text-charcoal">Publish immediately</span>
              </label>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary text-sm">{editingNews ? 'Update' : 'Create'} Article</button>
                {editingNews && (
                  <button type="button" onClick={() => { setEditingNews(null); setNewsForm({ title: '', titleKo: '', content: '', contentKo: '', published: false, category: 'utaka_news', externalUrl: '' }) }} className="btn-secondary text-sm">Cancel</button>
                )}
              </div>
            </form>

            {/* Articles list */}
            <div className="space-y-3">
              {articles.map(article => (
                <div key={article.id} className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${!article.published ? 'opacity-60' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-charcoal text-sm">{article.title}</h4>
                      {!article.published && <span className="text-[0.6rem] font-bold bg-charcoal/10 text-charcoal px-1.5 py-0.5 rounded uppercase">Draft</span>}
                      {article.category && (
                        <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${
                          article.category === 'utaka_news' ? 'bg-orange-100 text-orange-800' :
                          article.category === 'members_news' ? 'bg-blue-100 text-blue-800' :
                          article.category === 'sxsk' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>{
                          article.category === 'utaka_news' ? 'UTAKA News' :
                          article.category === 'members_news' ? 'Members News' :
                          article.category === 'sxsk' ? 'SXSK' : 'PR'
                        }</span>
                      )}
                      {article.approval_status === 'pending' && <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase">Pending</span>}
                      {article.approval_status === 'rejected' && <span className="text-[0.6rem] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded uppercase">Rejected</span>}
                    </div>
                    {article.title_ko && <p className="text-xs text-charcoal-light">{article.title_ko}</p>}
                    <p className="text-xs text-charcoal-light mt-0.5">
                      {new Date(article.created_at).toLocaleDateString()} · {article.author_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEditNews(article)} className="px-3 py-1.5 bg-burnt-orange/10 text-burnt-orange text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-burnt-orange/20">Edit</button>
                    <button onClick={() => handleDeleteNews(article.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg cursor-pointer border-none hover:bg-red-200">Delete</button>
                  </div>
                </div>
              ))}
              {articles.length === 0 && <p className="text-charcoal-light text-sm py-8 text-center">No articles yet.</p>}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold text-charcoal mb-6">Site Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-base font-semibold text-charcoal mb-3">Homepage Stats</h3>
                <p className="text-sm text-charcoal-light mb-4">These numbers are displayed on the front page stats section.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Members</label>
                    <input
                      type="text"
                      value={siteSettings.stat_members}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, stat_members: e.target.value }))}
                      className={inputClass}
                      placeholder="150+"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Events Held</label>
                    <input
                      type="text"
                      value={siteSettings.stat_events}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, stat_events: e.target.value }))}
                      className={inputClass}
                      placeholder="50+"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Years Active</label>
                    <input
                      type="text"
                      value={siteSettings.stat_years}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, stat_years: e.target.value }))}
                      className={inputClass}
                      placeholder="15+"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSettingsSave}
                disabled={settingsSaving}
                className="btn-primary !py-2.5 !px-6 cursor-pointer"
              >
                {settingsSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Organization Tab */}
        {activeTab === 'org' && (
          <div className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold text-charcoal mb-6">Organization Chart</h2>
            <p className="text-sm text-charcoal-light mb-6">Assign members to committee positions. Only approved members are shown.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleOrgSave(new FormData(e.target)) }}>
              <div className="space-y-8">
                {committees.map(committee => (
                  <div key={committee.key} className="border border-charcoal/10 rounded-xl p-5">
                    <h3 className="font-display text-lg font-semibold text-charcoal mb-1">{committee.name}</h3>
                    <p className="text-xs text-charcoal-light mb-4">{committee.nameKo}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {committee.slots.flatMap(slot =>
                        Array.from({ length: slot.count }, (_, i) => (
                          <div key={`${slot.role}_${i}`}>
                            <label className="block text-xs font-medium text-charcoal-light mb-1">
                              {slot.label}{slot.count > 1 ? ` ${i + 1}` : ''}
                            </label>
                            <select
                              name={`${committee.key}_${slot.role}_${i}`}
                              defaultValue={getOrgMember(committee.key, slot.role, i)}
                              className={inputClass}
                            >
                              <option value="">— Empty —</option>
                              {members.filter(m => m.is_approved).map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.name_ko ? ` (${m.name_ko})` : ''} — {m.graduation_year || '?'}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={orgSaving}
                  className="btn-primary !py-2.5 !px-6 cursor-pointer"
                >
                  {orgSaving ? 'Saving...' : 'Save Organization Chart'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
