'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useT } from '../components/LanguageProvider'

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
    location: '', company: '', title: '', birthday: '', bio: ''
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
            bio: data.bio || '',
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

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-charcoal">{t('profile.title')}</h1>
          <p className="text-charcoal-light mt-2">{t('profile.subtitle')}</p>
          <p className="text-sm text-charcoal-light mt-1">{session?.user?.email}</p>
        </div>

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
