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

  // Event form state
  const [eventForm, setEventForm] = useState({ title: '', titleKo: '', description: '', descriptionKo: '', eventDate: '', location: '', locationKo: '', maxAttendees: '' })
  const [editingEvent, setEditingEvent] = useState(null)

  // News form state
  const [newsForm, setNewsForm] = useState({ title: '', titleKo: '', content: '', contentKo: '', published: false, category: 'news', externalUrl: '' })
  const [editingNews, setEditingNews] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !session?.user?.isAdmin) router.push('/')
  }, [status, session, router])

  const fetchAll = async () => {
    setLoading(true)
    const [membersRes, eventsRes, newsRes, subsRes] = await Promise.all([
      fetch('/api/admin/members'),
      fetch('/api/events'),
      fetch('/api/admin/news'),
      fetch('/api/admin/submissions'),
    ])
    const [membersData, eventsData, newsData, subsData] = await Promise.all([
      membersRes.json(),
      eventsRes.json(),
      newsRes.json(),
      subsRes.json(),
    ])
    setMembers(membersData.members || [])
    setEvents(eventsData.events || [])
    setArticles(newsData.articles || [])
    setSubmissions(subsData.submissions || [])
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

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    const url = editingEvent ? `/api/events/${editingEvent}` : '/api/events'
    const method = editingEvent ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventForm) })
    setEventForm({ title: '', titleKo: '', description: '', descriptionKo: '', eventDate: '', location: '', locationKo: '', maxAttendees: '' })
    setEditingEvent(null)
    fetchAll()
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event.id)
    setEventForm({
      title: event.title, titleKo: event.title_ko || '', description: event.description || '', descriptionKo: event.description_ko || '',
      eventDate: event.event_date?.slice(0, 16) || '', location: event.location || '', locationKo: event.location_ko || '', maxAttendees: event.max_attendees || '',
    })
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
    setNewsForm({ title: '', titleKo: '', content: '', contentKo: '', published: false, category: 'news', externalUrl: '' })
    setEditingNews(null)
    fetchAll()
  }

  const handleEditNews = (article) => {
    setEditingNews(article.id)
    setNewsForm({
      title: article.title, titleKo: article.title_ko || '', content: article.content, contentKo: article.content_ko || '',
      published: article.published, category: article.category || 'news', externalUrl: article.external_url || '',
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

  const handleDeleteNews = async (id) => {
    if (!confirm('Delete this article?')) return
    await fetch(`/api/news/${id}`, { method: 'DELETE' })
    fetchAll()
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
    { id: 'news', label: 'News' },
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
                        sub.category === 'members_news' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {sub.category === 'members_news' ? 'Members News' : 'PR'}
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
              <h3 className="font-display text-lg font-semibold text-charcoal">{editingEvent ? 'Edit Event' : 'Create Event'}</h3>
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
                  <label className="block text-xs font-medium text-charcoal mb-1">Date & Time *</label>
                  <input type="datetime-local" value={eventForm.eventDate} onChange={e => setEventForm(p => ({ ...p, eventDate: e.target.value }))} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Max Attendees</label>
                  <input type="number" value={eventForm.maxAttendees} onChange={e => setEventForm(p => ({ ...p, maxAttendees: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Location (EN)</label>
                  <input type="text" value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Location (KO)</label>
                  <input type="text" value={eventForm.locationKo} onChange={e => setEventForm(p => ({ ...p, locationKo: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Description (EN)</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} rows={3} className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Description (KO)</label>
                <textarea value={eventForm.descriptionKo} onChange={e => setEventForm(p => ({ ...p, descriptionKo: e.target.value }))} rows={3} className={inputClass + ' resize-none'} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary text-sm">{editingEvent ? 'Update' : 'Create'} Event</button>
                {editingEvent && (
                  <button type="button" onClick={() => { setEditingEvent(null); setEventForm({ title: '', titleKo: '', description: '', descriptionKo: '', eventDate: '', location: '', locationKo: '', maxAttendees: '' }) }} className="btn-secondary text-sm">Cancel</button>
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
            {/* News form */}
            <form onSubmit={handleNewsSubmit} className="card p-6 mb-8 space-y-4">
              <h3 className="font-display text-lg font-semibold text-charcoal">{editingNews ? 'Edit Article' : 'Create News Article'}</h3>
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
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">External URL (sxsk.news link)</label>
                <input type="url" value={newsForm.externalUrl} onChange={e => setNewsForm(p => ({ ...p, externalUrl: e.target.value }))} placeholder="https://sxsk.news/..." className={inputClass} />
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
                  <button type="button" onClick={() => { setEditingNews(null); setNewsForm({ title: '', titleKo: '', content: '', contentKo: '', published: false, category: 'news', externalUrl: '' }) }} className="btn-secondary text-sm">Cancel</button>
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
                      {article.category && article.category !== 'news' && (
                        <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase ${
                          article.category === 'members_news' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>{article.category === 'members_news' ? 'Members News' : 'PR'}</span>
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
      </div>
    </div>
  )
}
