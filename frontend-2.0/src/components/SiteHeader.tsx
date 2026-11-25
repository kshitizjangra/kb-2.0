'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import ThemeToggle from '@/components/ThemeToggle'

const HEADER_NAV = [
  { label: 'ABOUT ME', href: '#about' },
  { label: 'SERVICES', href: '#services' },
  { label: 'WORK', href: '#work' },
  { label: 'FREE PDF', href: '#download' },
  { label: 'REVIEWS', href: '#testimonials' },
  { label: 'BLOG', href: '/blog' },
] as const

export interface SiteHeaderProps {
  siteData?: SiteCmsData['site']
}

export default function SiteHeader({ siteData = DEFAULT_CMS_DATA.site }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    function onResize() {
      if (window.innerWidth > 760) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  const nameParts = siteData.name.trim().split(/\s+/)
  const firstWord = nameParts[0] || 'KAMNA'
  const restWords = nameParts.slice(1).join(' ') || 'BHARDWAJ'

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}>
      <Link href="/" className="brand-lockup" aria-label={`${siteData.name}, home`}>
        <Image
          src={siteData.headerAvatar || '/kamna.jpg'}
          alt={siteData.name}
          width={42}
          height={42}
          priority
        />
        <span className="brand-name">
          {firstWord}
          <br />
          {restWords}
        </span>
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {HEADER_NAV.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <a className="header-contact" href="#contact">
          CONTACT ME
        </a>
        <ThemeToggle />
        <button
          type="button"
          className={`header-toggle ${menuOpen ? 'is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="header-toggle-bar" aria-hidden="true" />
          <span className="header-toggle-bar" aria-hidden="true" />
        </button>
      </div>

      <div
        id="mobile-nav-drawer"
        className={`mobile-drawer ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-drawer-inner">
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {HEADER_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="#contact"
              className="mobile-nav-contact"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
            >
              CONTACT ME
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
