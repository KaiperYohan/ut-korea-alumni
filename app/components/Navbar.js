'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage, useT } from './LanguageProvider'

function DropdownMenu({ label, items, isActive, textColor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 border-none cursor-pointer bg-transparent ${
          isActive
            ? 'bg-burnt-orange/10 text-burnt-orange'
            : `${textColor} hover:bg-burnt-orange/5 hover:text-burnt-orange`
        }`}
      >
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-charcoal/10 py-1 min-w-[160px] z-50">
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-charcoal hover:bg-burnt-orange/5 hover:text-burnt-orange transition-colors no-underline"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const { locale, toggleLanguage } = useLanguage()
  const { data: session } = useSession()
  const t = useT()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setMobileExpanded(null)
  }, [pathname])

  const isHome = pathname === '/'
  const navBg = scrolled || !isHome
    ? 'bg-white/95 backdrop-blur-md shadow-sm'
    : 'bg-transparent'
  const textColor = scrolled || !isHome ? 'text-charcoal' : 'text-white'
  const logoColor = scrolled || !isHome ? 'text-burnt-orange' : 'text-white'

  const membershipLevel = session?.user?.membershipLevel
  const canWrite = ['executive', 'full'].includes(membershipLevel) || session?.user?.isAdmin

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // Build nav structure with dropdowns
  const navItems = [
    { href: '/events', label: t('nav.events') },
    {
      label: t('nav.news'),
      isActive: isActive('/news') || isActive('/submit') || isActive('/my-posts'),
      children: [
        { href: '/news', label: t('nav.news') },
        ...(canWrite ? [
          { href: '/submit', label: t('nav.submit') },
          { href: '/my-posts', label: t('nav.myPosts') },
        ] : []),
      ],
    },
    {
      label: t('nav.members'),
      auth: true,
      isActive: isActive('/members') || isActive('/dues'),
      children: [
        { href: '/members', label: t('nav.members') },
        { href: '/dues', label: t('nav.dues') },
      ],
    },
    {
      label: t('nav.about'),
      isActive: isActive('/about'),
      children: [
        { href: '/about#organization', label: t('nav.organization') },
        { href: '/about#past-presidents', label: t('nav.pastPresidents') },
        { href: '/about#contact', label: t('nav.contact') },
      ],
    },
    ...(session?.user?.isAdmin ? [{ href: '/admin', label: t('nav.admin') }] : []),
  ].filter(item => !item.auth || session)

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className={`flex items-center gap-2.5 ${logoColor} transition-colors no-underline`}>
            <img
              src={scrolled || !isHome ? '/utkorea logo.png' : '/utkorea logo white.png'}
              alt="UT Korea Alumni"
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight">UT Austin</span>
              <span className="text-[0.65rem] tracking-[0.15em] uppercase opacity-80 font-body">Korea Alumni</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item, i) =>
              item.children ? (
                <DropdownMenu
                  key={i}
                  label={item.label}
                  items={item.children}
                  isActive={item.isActive}
                  textColor={textColor}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                    isActive(item.href)
                      ? 'bg-burnt-orange/10 text-burnt-orange'
                      : `${textColor} hover:bg-burnt-orange/5 hover:text-burnt-orange`
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
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
            {navItems.map((item, i) =>
              item.children ? (
                <div key={i}>
                  <button
                    onClick={() => setMobileExpanded(mobileExpanded === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium text-charcoal hover:bg-cream-light bg-transparent border-none cursor-pointer"
                  >
                    <span className={item.isActive ? 'text-burnt-orange' : ''}>{item.label}</span>
                    <svg className={`w-4 h-4 transition-transform ${mobileExpanded === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileExpanded === i && (
                    <div className="ml-4 space-y-0.5">
                      {item.children.map(child => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-4 py-2 rounded-lg text-sm no-underline ${
                            isActive(child.href)
                              ? 'bg-burnt-orange/10 text-burnt-orange'
                              : 'text-charcoal-light hover:bg-cream-light'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium no-underline ${
                    isActive(item.href)
                      ? 'bg-burnt-orange/10 text-burnt-orange'
                      : 'text-charcoal hover:bg-cream-light'
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
            <hr className="border-charcoal/10 my-3" />
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
