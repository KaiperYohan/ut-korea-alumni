'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { getMessages } from '@/lib/i18n'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('ko')
  const [messages, setMessages] = useState(getMessages('ko'))

  useEffect(() => {
    const saved = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1]
    if (saved && (saved === 'ko' || saved === 'en')) {
      setLocale(saved)
      setMessages(getMessages(saved))
    }
  }, [])

  const toggleLanguage = () => {
    const next = locale === 'ko' ? 'en' : 'ko'
    setLocale(next)
    setMessages(getMessages(next))
    document.cookie = `locale=${next};path=/;max-age=31536000`
  }

  return (
    <LanguageContext.Provider value={{ locale, messages, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

export function useT() {
  const { messages } = useLanguage()
  return (key) => {
    const keys = key.split('.')
    let value = messages
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }
    return value
  }
}
