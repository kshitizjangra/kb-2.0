'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowUpRight } from 'lucide-react'
import { Tape } from '@/components/collage/Decor'
import {
  API_BASE,
  LINKEDIN_PROFILE_URL,
  linkedinEmbedUrl,
  linkedinPostUrl,
  mapLinkedinUrns,
  type LinkedInPostItem,
} from '@/lib/kamna-data'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './linkedin-showcase.css'

gsap.registerPlugin(ScrollTrigger)

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface LinkedInShowcaseProps {
  data?: SiteCmsData['linkedin']
  siteData?: SiteCmsData['site']
}

function toLinkedInItems(posts: SiteCmsData['linkedin']['posts']): LinkedInPostItem[] {
  return posts.map((post, i) => ({
    id: post.urn,
    urn: post.urn,
    index: String(i + 1).padStart(2, '0'),
    title: post.title,
    summary: post.summary,
    url: linkedinPostUrl(post.urn),
    embedUrl: linkedinEmbedUrl(post.urn),
  }))
}

export default function LinkedInShowcase({
  data = DEFAULT_CMS_DATA.linkedin,
  siteData = DEFAULT_CMS_DATA.site,
}: LinkedInShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const initialPosts = toLinkedInItems(data.posts)
  const [posts, setPosts] = useState<LinkedInPostItem[]>(initialPosts)
  const [activeId, setActiveId] = useState<string>(initialPosts[0]?.id ?? '')
  const [loadedEmbeds, setLoadedEmbeds] = useState<Record<string, boolean>>({})
  const previewId = useId()
  const profileUrl = siteData.social.linkedin || LINKEDIN_PROFILE_URL

  useGSAP(
    () => {
      const el = sectionRef.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.fromTo(
        '.li-row',
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.055,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: '.li-list',
            start: 'top 85%',
            once: true,
          },
        }
      )
    },
    { scope: sectionRef }
  )

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_BASE}/api/social/linkedin`, {
      credentials: 'omit',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const urns: string[] = (payload?.posts ?? [])
          .map((item: { urn?: string }) => item.urn)
          .filter((urn: unknown): urn is string => typeof urn === 'string' && urn.length > 0)
        if (urns.length === 0) return
        const mapped = mapLinkedinUrns(urns)
        setPosts(mapped)
        setActiveId((prev) =>
          mapped.some((post) => post.id === prev) ? prev : mapped[0].id
        )
      })
      .catch(() => {
        /* Keep static LINKEDIN_POSTS fallback when backend is unavailable */
      })

    return () => controller.abort()
  }, [])

  const activePost = posts.find((post) => post.id === activeId) ?? posts[0]
  const activeIndex = posts.findIndex((post) => post.id === activePost.id)
  const isEmbedLoaded = Boolean(loadedEmbeds[activePost.embedUrl])

  return (
    <section
      ref={sectionRef}
      id="linkedin"
      className="linkedin-showcase section"
      aria-labelledby="linkedin-heading"
    >
      <div className="wrap li-grid">
        <div className="li-left">
          <div className="li-eyebrow-row">
            <span className="eyebrow li-eyebrow">{data.eyebrow}</span>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline li-profile-link"
            >
              View profile
              <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>

          <h2 id="linkedin-heading" className="li-heading">
            {data.heading.includes('personal branding') ? (
              <>
                {data.heading.split('personal branding')[0]}
                <span className="serif-italic li-heading-accent">personal branding</span>
                {data.heading.split('personal branding')[1]}
              </>
            ) : (
              data.heading
            )}
          </h2>

          <p className="small-caps li-hint">
            Hover, focus or select an entry to inspect the post
          </p>

          <ul className="li-list" aria-label="Featured LinkedIn posts">
            {posts.map((post) => {
              const isActive = post.id === activePost.id
              return (
                <li
                  key={post.id}
                  className={`li-row${isActive ? ' is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="li-row-btn"
                    aria-pressed={isActive}
                    aria-controls={previewId}
                    onMouseEnter={() => setActiveId(post.id)}
                    onFocus={() => setActiveId(post.id)}
                    onClick={() => setActiveId(post.id)}
                  >
                    {isActive && !reduce ? (
                      <motion.span
                        layoutId="li-row-marker"
                        className="li-row-marker"
                        transition={{ duration: 0.22, ease: EASE }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="li-row-marker" aria-hidden="true" />
                    )}
                    <span className="li-row-index serif" aria-hidden="true">
                      {post.index}
                    </span>
                    <span className="li-row-copy">
                      <span className="li-row-title">{post.title}</span>
                      <span className="li-row-excerpt">{post.summary}</span>
                    </span>
                  </button>

                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="li-row-ext"
                    aria-label={`Open "${post.title}" on LinkedIn`}
                  >
                    <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="li-right">
          <div
            id={previewId}
            className="li-panel"
            aria-label={`LinkedIn post preview: ${activePost.title}`}
          >
            <Tape
              variant="pink"
              className="li-panel-tape"
              style={{
                width: 68,
                height: 18,
                right: 28,
                top: -9,
                transform: 'rotate(3deg)',
              }}
            />

            <header className="li-panel-bar">
              <span className="small-caps" aria-live="polite">
                Post {String(activeIndex + 1).padStart(2, '0')} /{' '}
                {String(posts.length).padStart(2, '0')}
              </span>
              <a
                href={activePost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline li-open-link"
              >
                Open on LinkedIn
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </header>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activePost.id}
                className="li-takeaway"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE }}
              >
                <p className="li-takeaway-kicker small-caps">
                  Field note {activePost.index}
                </p>
                <h3 className="li-takeaway-title serif">{activePost.title}</h3>
                <p className="li-takeaway-body muted">{activePost.summary}</p>
              </motion.div>
            </AnimatePresence>

            <div className="li-embed-stage">
              <div
                className={`li-embed-fallback${isEmbedLoaded ? ' is-loaded' : ''}`}
              >
                <span className="small-caps">LinkedIn embed</span>
                <p className="li-fallback-title serif-italic">
                  “{activePost.title}”
                </p>
                <p className="li-fallback-note muted">
                  Embedded LinkedIn feed preview. If blocked by browser privacy settings, use the link above.
                </p>
              </div>

              <iframe
                key={activePost.embedUrl}
                src={activePost.embedUrl}
                title={`LinkedIn post: ${activePost.title}`}
                loading="lazy"
                allowFullScreen
                className={`li-iframe${isEmbedLoaded ? ' is-loaded' : ''}`}
                onLoad={() =>
                  setLoadedEmbeds((prev) => ({
                    ...prev,
                    [activePost.embedUrl]: true,
                  }))
                }
              />
            </div>

            <footer className="li-panel-foot">
              <span className="li-urn">{activePost.urn}</span>
            </footer>
          </div>
        </div>
      </div>
    </section>
  )
}
