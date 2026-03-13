'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage, useT } from './LanguageProvider'

export default function Navbar() {
  const pathname = usePathname()
  const { locale, toggleLanguage } = useLanguage()
  const { data: session } = useSession()
  const t = useT()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isHome = pathname === '/'
  const navBg = scrolled || !isHome
    ? 'bg-white/95 backdrop-blur-md shadow-sm'
    : 'bg-transparent'
  const textColor = scrolled || !isHome ? 'text-charcoal' : 'text-white'
  const logoColor = scrolled || !isHome ? 'text-burnt-orange' : 'text-white'

  const membershipLevel = session?.user?.membershipLevel
  const canWrite = ['executive', 'full'].includes(membershipLevel) || session?.user?.isAdmin

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/events', label: t('nav.events') },
    { href: '/news', label: t('nav.news') },
    { href: '/members', label: t('nav.members'), auth: true },
    { href: '/about', label: t('nav.about') },
    ...(canWrite ? [{ href: '/submit', label: t('nav.submit') }] : []),
    ...(session?.user?.isAdmin ? [{ href: '/admin', label: t('nav.admin') }] : []),
  ].filter(link => !link.auth || session)

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className={`flex items-center gap-2.5 ${logoColor} transition-colors no-underline`}>
            {/* Longhorn silhouette */}
            <svg viewBox="0 0 40 28" className="w-10 h-7 fill-current">
              <path d="M20 12C20 12 16 4 8 2C6 1.5 3 1.5 1 3C0.5 3.3 0 4 0.5 4.5C1 5 2 4.8 3 4.5C5 3.8 7 4 8 5C10 7 12 10 14 12C15 13 17 15 20 15C23 15 25 13 26 12C28 10 30 7 32 5C33 4 35 3.8 37 4.5C38 4.8 39 5 39.5 4.5C40 4 39.5 3.3 39 3C37 1.5 34 1.5 32 2C24 4 20 12 20 12Z"/>
              <path d="M20 15C17 15 15 17 14 19C13 21 13 24 15 26C16 27 18 28 20 28C22 28 24 27 25 26C27 24 27 21 26 19C25 17 23 15 20 15ZM20 25C18.5 25 17.5 23.5 18 22C18.3 21 19 20 20 20C21 20 21.7 21 22 22C22.5 23.5 21.5 25 20 25Z"/>
            </svg>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight">UT Austin</span>
              <span className="text-[0.65rem] tracking-[0.15em] uppercase opacity-80 font-body">Korea Alumni</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                  isActive(link.href)
                    ? 'bg-burnt-orange/10 text-burnt-orange'
                    : `${textColor} hover:bg-burnt-orange/5 hover:text-burnt-orange`
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: language toggle + auth */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                scrolled || !isHome
                  ? 'border-charcoal/20 text-charcoal hover:border-burnt-orange hover:text-burnt-orange'
                  : 'border-white/40 text-white hover:border-white hover:bg-white/10'
              }`}
            >
              {locale === 'ko' ? 'EN' : '한국어'}
            </button>
            {session ? (
              <div className="flex items-center gap-1">
                {canWrite && (
                  <Link
                    href="/my-posts"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                      isActive('/my-posts')
                        ? 'bg-burnt-orange/10 text-burnt-orange'
                        : `${textColor} hover:bg-burnt-orange/5 hover:text-burnt-orange`
                    }`}
                  >
                    {t('nav.myPosts')}
                  </Link>
                )}
                <Link
                  href="/profile"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                    isActive('/profile')
                      ? 'bg-burnt-orange/10 text-burnt-orange'
                      : `${textColor} hover:bg-burnt-orange/5 hover:text-burnt-orange`
                  }`}
                >
                  {t('nav.profile')}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border-none bg-transparent ${textColor} hover:text-burnt-orange`}
                >
                  {t('nav.signout')}
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm !py-2 !px-5 no-underline">
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg ${textColor} cursor-pointer bg-transparent border-none`}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-charcoal/10 shadow-lg">
          <div className="px-5 py-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium no-underline ${
                  isActive(link.href)
                    ? 'bg-burnt-orange/10 text-burnt-orange'
                    : 'text-charcoal hover:bg-cream-light'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-charcoal/10 my-3" />
            {session && canWrite && (
              <Link
                href="/my-posts"
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium no-underline ${
                  isActive('/my-posts')
                    ? 'bg-burnt-orange/10 text-burnt-orange'
                    : 'text-charcoal hover:bg-cream-light'
                }`}
              >
                {t('nav.myPosts')}
              </Link>
            )}
            {session && (
              <Link
                href="/profile"
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium no-underline ${
                  isActive('/profile')
                    ? 'bg-burnt-orange/10 text-burnt-orange'
                    : 'text-charcoal hover:bg-cream-light'
                }`}
              >
                {t('nav.profile')}
              </Link>
            )}
            <div className="flex items-center gap-3 px-4">
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-charcoal/20 text-charcoal bg-transparent cursor-pointer"
              >
                {locale === 'ko' ? 'EN' : '한국어'}
              </button>
              {session ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="btn-secondary text-sm !py-2 flex-1 text-center cursor-pointer"
                >
                  {t('nav.signout')}
                </button>
              ) : (
                <Link href="/login" className="btn-primary text-sm !py-2 flex-1 text-center no-underline">
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
