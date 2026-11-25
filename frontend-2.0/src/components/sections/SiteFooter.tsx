'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DEFAULT_CMS_DATA, FOOTER_DEFAULTS, type SiteCmsData } from '@/lib/cms-schema'
import './footer.css'

export interface SiteFooterProps {
  siteData?: SiteCmsData['site']
}

interface FooterLinkItem {
  label: string
  handle?: string
  href: string
  videoSrc?: string
  posterSrc?: string
}

function FooterHoverPreview({
  videoSrc,
  posterSrc,
  label,
  handle,
  active,
}: {
  videoSrc: string
  posterSrc?: string
  label: string
  handle?: string
  active: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (active) {
      vid.currentTime = 0
      const p = vid.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } else {
      vid.pause()
    }
  }, [active])

  return (
    <span className={`footer-preview ${active ? 'is-active' : ''}`} aria-hidden="true">
      <span className="footer-preview-head">
        <span className="footer-preview-platform">{label}</span>
        {handle ? <span className="footer-preview-handle">{handle}</span> : null}
      </span>
      <span className="footer-preview-frame">
        <video
          ref={videoRef}
          className="footer-preview-video"
          src={videoSrc}
          poster={posterSrc}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
        />
      </span>
    </span>
  )
}

export default function SiteFooter({ siteData = DEFAULT_CMS_DATA.site }: SiteFooterProps) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null)

  const footerLinks: FooterLinkItem[] = [
    {
      label: 'LinkedIn',
      handle: 'in/kamna-bhardwaj',
      href: siteData.social.linkedin,
      videoSrc: '/assets/portfolio/intro-v2.mp4',
      posterSrc: '/assets/portfolio/intro-v2.webp',
    },
    {
      label: 'Instagram',
      handle: '@kamnabhardwaj',
      href: siteData.social.instagram,
      videoSrc: '/assets/portfolio/kamna-hero.mp4',
      posterSrc: '/assets/portfolio/hero.webp',
    },
    {
      label: 'YouTube',
      handle: '@kamnabhardwaj',
      href: siteData.social.youtube,
      videoSrc: '/assets/portfolio/hero.mp4',
      posterSrc: '/assets/portfolio/hero.webp',
    },
    {
      label: 'Medium',
      handle: '@kamnabhardwaj',
      href: siteData.social.medium,
      videoSrc: '/assets/portfolio/hero-selected.mp4',
      posterSrc: '/assets/portfolio/hero-selected.webp',
    },
    {
      label: 'X',
      handle: '@kamnabhardwaj',
      href: siteData.social.x,
      videoSrc: '/assets/portfolio/intro-v2.mp4',
      posterSrc: '/assets/portfolio/intro-v2.webp',
    },
    {
      label: 'Topmate',
      handle: 'topmate.io/kamna',
      href: siteData.social.topmate,
      videoSrc: '/assets/portfolio/kamna-hero.mp4',
      posterSrc: '/assets/portfolio/hero.webp',
    },
    { label: 'Email', href: `mailto:${siteData.email}` },
    { label: 'Blog', href: '/blog' },
    { label: 'CMS', href: '/cms' },
  ]

  return (
    <footer className="site-footer">
      <div className="wrap">
        <nav className="footer-links" aria-label="Footer links">
          {footerLinks.map((link) => {
            const isHovered = hoveredLabel === link.label
            const isInternal = link.href.startsWith('/')

            return (
              <div
                key={link.label}
                className="footer-link-wrap"
                onMouseEnter={() => link.videoSrc && setHoveredLabel(link.label)}
                onMouseLeave={() => setHoveredLabel((prev) => (prev === link.label ? null : prev))}
                onFocus={() => link.videoSrc && setHoveredLabel(link.label)}
                onBlur={() => setHoveredLabel((prev) => (prev === link.label ? null : prev))}
              >
                {link.videoSrc ? (
                  <FooterHoverPreview
                    videoSrc={link.videoSrc}
                    posterSrc={link.posterSrc}
                    label={link.label}
                    handle={link.handle}
                    active={isHovered}
                  />
                ) : null}

                {isInternal ? (
                  <Link className="footer-link" href={link.href}>
                    {link.label}
                  </Link>
                ) : (
                  <a
                    className="footer-link"
                    href={link.href}
                    {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  >
                    {link.label}
                  </a>
                )}
              </div>
            )
          })}
        </nav>

        <div className="footer-meta">
          <p className="footer-location">{siteData.location || FOOTER_DEFAULTS.location}</p>
          <p className="footer-legal">
            <span>
              {siteData.copyright}{' '}
              <a className="footer-name" href="#top">
                {siteData.name}
              </a>
              . {FOOTER_DEFAULTS.rights}
            </span>
            <span className="footer-credit">{FOOTER_DEFAULTS.credit}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
