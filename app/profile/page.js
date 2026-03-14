'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useT } from '../components/LanguageProvider'
import { getProfileCompletion, getMissingFields } from '@/lib/profileCompletion'

const INTEREST_OPTIONS = [
  'business', 'finance', 'technology', 'art', 'realEstate', 'startup',
  'law', 'medicine', 'education', 'media', 'sports', 'music',
  'food', 'travel', 'volunteer', 'networking'
]

export default function ProfilePage() {
  const t = useT()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [profileImage, setProfileImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', nameKo: '', graduationYear: '', major: '',
    location: '', company: '', title: '', birthday: '', phone: '', bio: '',
    linkedin: '', instagram: '', tiktok: '', youtube: '', twitter: '', interests: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmNewPassword: ''
  })

  const fetchedRef = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && !fetchedRef.current) {
      fetchedRef.current = true
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          setForm({
            name: data.name || '',
            nameKo: data.nameKo || '',
            graduationYear: data.graduationYear || '',
            major: data.major || '',
            location: data.location || '',
            company: data.company || '',
            title: data.title || '',
            birthday: data.birthday || '',
            phone: data.phone || '',
            bio: data.bio || '',
            linkedin: data.linkedin || '',
            instagram: data.instagram || '',
            tiktok: data.tiktok || '',
            youtube: data.youtube || '',
            twitter: data.twitter || '',
            interests: data.interests || '',
          })
          setProfileImage(data.profileImageUrl || null)
          setLoading(false)
        })
        .catch(() => {
          setError(t('common.error'))
          setLoading(false)
        })
    }
  }, [status, router])

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('profile.errors.updateFailed'))
      } else {
        setProfileImage(data.url)
      }
    } catch {
      setError(t('profile.errors.updateFailed'))
    }
    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageRemove = async () => {
    setUploadingImage(true)
    try {
      await fetch('/api/profile/image', { method: 'DELETE' })
      setProfileImage(null)
    } catch {
      setError(t('profile.errors.updateFailed'))
    }
    setUploadingImage(false)
  }

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const updatePassword = (field) => (e) => setPasswordForm(prev => ({ ...prev, [field]: e.target.value }))

  const toggleInterest = (interest) => {
    setForm(prev => {
      const current = prev.interests ? prev.interests.split(',') : []
      const updated = current.includes(interest)
        ? current.filter(i => i !== interest)
        : [...current, interest]
      return { ...prev, interests: updated.filter(Boolean).join(',') }
    })
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!form.name.trim()) {
      setError(t('auth.errors.required'))
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || t('profile.errors.updateFailed'))
      } else {
        setMessage(t('profile.profileUpdated'))
      }
    } catch {
      setError(t('profile.errors.updateFailed'))
    }
    setSaving(false)
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('profile.errors.newPasswordShort'))
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError(t('profile.errors.passwordMismatch'))
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 403) {
          setPasswordError(t('profile.errors.currentPasswordWrong'))
        } else {
          setPasswordError(data.error || t('profile.errors.updateFailed'))
        }
      } else {
        setPasswordMessage(t('profile.passwordUpdated'))
        setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      }
    } catch {
      setPasswordError(t('profile.errors.updateFailed'))
    }
    setSavingPassword(false)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="text-charcoal-light">{t('common.loading')}</div>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-charcoal/15 bg-warm-white text-charcoal focus:outline-none focus:ring-2 focus:ring-burnt-orange/30 focus:border-burnt-orange transition-all text-sm"
  const selectedInterests = form.interests ? form.interests.split(',') : []

  // Profile completion
  const completionData = {
    ...form,
    profileImageUrl: profileImage,
    nameKo: form.nameKo,
    graduationYear: form.graduationYear,
    graduation_year: form.graduationYear,
    profile_image_url: profileImage,
  }
  const completion = getProfileCompletion(completionData)
  const missing = getMissingFields(completionData)

  const missingLabels = {
    profilePhoto: t('profile.profilePhoto'),
    nameKo: t('auth.nameKo'),
    graduationYear: t('auth.gradYear'),
    major: t('auth.major'),
    location: t('auth.location'),
    company: t('auth.company'),
    title: t('auth.jobTitle'),
    phone: t('memberDetail.phone'),
    bio: t('auth.bio'),
    socialLinks: t('profile.socialLinks'),
    interests: t('profile.interests'),
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-charcoal">{t('profile.title')}</h1>
          <p className="text-charcoal-light mt-2">{t('profile.subtitle')}</p>
          <p className="text-sm text-charcoal-light mt-1">{session?.user?.email}</p>
        </div>

        {/* Profile Completion */}
        {completion < 100 && (
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-charcoal">{t('profile.completion')}</h3>
              <span className={`text-sm font-bold ${completion >= 70 ? 'text-green-600' : completion >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{completion}%</span>
            </div>
            <div className="w-full h-2.5 bg-charcoal/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${completion >= 70 ? 'bg-green-500' : completion >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                style={{ width: `${completion}%` }}
              />
            </div>
            {missing.length > 0 && (
              <p className="text-xs text-charcoal-light mt-2.5">
                {t('profile.completionHint')}: {missing.map(k => missingLabels[k]).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Profile Photo */}
        <div className="card p-8 mb-8">
          <h2 className="font-display text-xl font-bold text-charcoal mb-6">{t('profile.profilePhoto')}</h2>
          <div className="flex items-center gap-6">
            <div className="shrink-0 w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-burnt-orange to-gold flex items-center justify-center">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-display font-bold text-2xl">
                  {form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-60"
              >
                {uploadingImage ? t('common.loading') : t('profile.uploadPhoto')}
              </button>
              {profileImage && (
                <button
                  type="button"
                  onClick={handleImageRemove}
                  disabled={uploadingImage}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-60"
                >
                  {t('profile.removePhoto')}
                </button>
              )}
              <p className="text-xs text-charcoal-light">{t('profile.photoHint')}</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleProfileSubmit} className="card p-8 mb-8">
          <h2 className="font-display text-xl font-bold text-charcoal mb-6">{t('profile.profileInfo')}</h2>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-5">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm mb-5">
              {message}
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.name')} *</label>
                <input type="text" value={form.name} onChange={update('name')} required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.nameKo')}</label>
                <input type="text" value={form.nameKo} onChange={update('nameKo')} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.gradYear')}</label>
                <input type="number" value={form.graduationYear} onChange={update('graduationYear')} className={inputClass} min="1950" max="2030" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.major')}</label>
                <input type="text" value={form.major} onChange={update('major')} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.location')}</label>
                <input type="text" value={form.location} onChange={update('location')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.company')}</label>
                <input type="text" value={form.company} onChange={update('company')} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.jobTitle')}</label>
                <input type="text" value={form.title} onChange={update('title')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.birthday')}</label>
                <input type="text" value={form.birthday} onChange={update('birthday')} className={inputClass} placeholder={t('auth.birthdayPlaceholder')} maxLength={6} pattern="[0-9]{6}" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('memberDetail.phone')}</label>
              <input type="tel" value={form.phone} onChange={update('phone')} className={inputClass} placeholder={t('memberDetail.phonePlaceholder')} />
            </div>

            {/* Social Links */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-charcoal mb-3">{t('profile.socialLinks')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#0A66C2] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  <input type="text" value={form.linkedin} onChange={update('linkedin')} className={inputClass} placeholder="linkedin.com/in/username" />
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#E4405F] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                  <input type="text" value={form.instagram} onChange={update('instagram')} className={inputClass} placeholder="@username" />
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-charcoal shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                  <input type="text" value={form.tiktok} onChange={update('tiktok')} className={inputClass} placeholder="@username" />
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#FF0000] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  <input type="text" value={form.youtube} onChange={update('youtube')} className={inputClass} placeholder="youtube.com/@channel" />
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-charcoal shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  <input type="text" value={form.twitter} onChange={update('twitter')} className={inputClass} placeholder="@username" />
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-charcoal mb-1.5">{t('profile.interests')}</h3>
              <p className="text-xs text-charcoal-light mb-3">{t('profile.interestsHint')}</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                      selectedInterests.includes(interest)
                        ? 'bg-burnt-orange text-white border-burnt-orange'
                        : 'bg-white text-charcoal-light border-charcoal/15 hover:border-burnt-orange hover:text-burnt-orange'
                    }`}
                  >
                    {t(`interests.${interest}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('auth.bio')}</label>
              <textarea value={form.bio} onChange={update('bio')} rows={3} className={inputClass + ' resize-none'} />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary !py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t('common.loading') : t('profile.updateProfile')}
            </button>
          </div>
        </form>

        {/* Password Form */}
        <form onSubmit={handlePasswordSubmit} className="card p-8">
          <h2 className="font-display text-xl font-bold text-charcoal mb-6">{t('profile.changePassword')}</h2>

          {passwordError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-5">
              {passwordError}
            </div>
          )}
          {passwordMessage && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm mb-5">
              {passwordMessage}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">{t('profile.currentPassword')}</label>
              <input type="password" value={passwordForm.currentPassword} onChange={updatePassword('currentPassword')} required className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('profile.newPassword')}</label>
                <input type="password" value={passwordForm.newPassword} onChange={updatePassword('newPassword')} required minLength={8} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">{t('profile.confirmNewPassword')}</label>
                <input type="password" value={passwordForm.confirmNewPassword} onChange={updatePassword('confirmNewPassword')} required className={inputClass} />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="btn-primary !py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingPassword ? t('common.loading') : t('profile.updatePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
