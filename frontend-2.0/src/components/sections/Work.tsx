'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Play } from 'lucide-react'
import { Polaroid, Sticker, Tape } from '@/components/collage/Decor'
import ScrollWordReveal from '@/components/motion/ScrollWordReveal'
import { ALL_BRANDS, DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './work.css'

gsap.registerPlugin(ScrollTrigger)

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

function FlowerDoodle() {
  return (
    <svg className="wrk-flower" viewBox="0 0 48 48" width={46} height={46} aria-hidden focusable="false">
      <g fill="var(--kraft)" stroke="var(--kraft)" strokeWidth="1.1">
        <ellipse cx="24" cy="10.5" rx="6.2" ry="8.6" />
        <ellipse cx="24" cy="37.5" rx="6.2" ry="8.6" />
        <ellipse cx="10.5" cy="24" rx="8.6" ry="6.2" />
        <ellipse cx="37.5" cy="24" rx="8.6" ry="6.2" />
        <ellipse cx="14.4" cy="14.4" rx="7" ry="6" transform="rotate(-45 14.4 14.4)" />
        <ellipse cx="33.6" cy="33.6" rx="7" ry="6" transform="rotate(-45 33.6 33.6)" />
        <ellipse cx="33.6" cy="14.4" rx="7" ry="6" transform="rotate(45 33.6 14.4)" />
        <ellipse cx="14.4" cy="33.6" rx="7" ry="6" transform="rotate(45 14.4 33.6)" />
      </g>
      <circle cx="24" cy="24" r="5.2" fill="var(--bg)" />
    </svg>
  )
}

export interface WorkProps {
  data?: SiteCmsData['work']
}

export default function Work({ data = DEFAULT_CMS_DATA.work }: WorkProps) {
  const {
    label,
    lead,
    emph,
    stickyNote,
    videoLabel,
    videoBody,
    projects,
    campaignLabel,
    campaignBody,
    campaigns,
  } = data

  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  const [activeIndex, setActiveIndex] = useState(0)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [readyVideos, setReadyVideos] = useState<Record<number, boolean>>({})
  const [isMuted, setIsMuted] = useState(false)
  const gridRef = useRef<HTMLUListElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  useGSAP(
    () => {
      const el = sectionRef.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.fromTo(
        '.wrk-card',
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: '.wrk-grid',
            start: 'top 84%',
            once: true,
          },
        }
      )

      gsap.fromTo(
        '.wrk-scrap-p',
        { y: 14 },
        {
          y: -14,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.wrk-campaigns',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        }
      )
    },
    { scope: sectionRef }
  )

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return
      const isLocked = playingIndex === idx
      const isPreview = hoveredIndex === idx && playingIndex !== idx && !reduce

      if (isLocked) {
        vid.muted = isMuted
        vid.play().catch(() => {
          vid.muted = true
          setIsMuted(true)
          vid.play().catch(() => {})
        })
      } else if (isPreview) {
        vid.muted = true
        vid.play().catch(() => {})
      } else {
        vid.pause()
        if (vid.currentTime > 0) {
          try {
            vid.currentTime = 0
          } catch {
            /* ignore seek errors before metadata */
          }
        }
      }
    })
  }, [hoveredIndex, playingIndex, isMuted, reduce])

  function stepProject(delta: -1 | 1) {
    if (projects.length === 0) return
    const next = (activeIndex + delta + projects.length) % projects.length
    setActiveIndex(next)

    const grid = gridRef.current
    if (grid && grid.scrollWidth > grid.clientWidth + 4) {
      const target = grid.children[next] as HTMLElement | undefined
      if (target) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        grid.scrollTo({
          left: target.offsetLeft - grid.offsetLeft,
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
      }
    }
  }

  function togglePlay(index: number) {
    setActiveIndex(index)
    if (playingIndex === index) {
      videoRefs.current[index]?.pause()
      setPlayingIndex(null)
      setHoveredIndex((prev) => (prev === index ? null : prev))
      return
    }
    if (playingIndex !== null) {
      videoRefs.current[playingIndex]?.pause()
    }
    setPlayingIndex(index)
  }

  function toggleMute() {
    setIsMuted((prev) => {
      const next = !prev
      if (playingIndex !== null && videoRefs.current[playingIndex]) {
        videoRefs.current[playingIndex]!.muted = next
      }
      return next
    })
  }

  function handleHoverStart(index: number) {
    if (reduce) return
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return
    }
    setHoveredIndex(index)
  }

  function handleFocusStart(index: number) {
    if (reduce) return
    setHoveredIndex(index)
  }

  function handlePreviewEnd(index: number) {
    setHoveredIndex((prev) => (prev === index ? null : prev))
  }

  return (
    <section ref={sectionRef} id="work" className="work section">
      <div className="wrap">
        <p className="eyebrow wrk-label">{label}</p>

        <div className="wrk-statement-wrap">
          <h2 className="wrk-statement">
            <ScrollWordReveal lead={lead} emph={emph} emphClassName="wrk-emph" />
          </h2>
          <span className="wrk-sticky" aria-hidden>
            {stickyNote}
          </span>
        </div>

        <div className="wrk-row">
          <div className="wrk-video-meta">
            <p className="wrk-small">{videoLabel}</p>
            <p className="wrk-video-body">{videoBody}</p>
          </div>
          <div className="wrk-arrows">
            <motion.button
              type="button"
              className="wrk-arrow-btn"
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.14, ease: EASE }}
              onClick={() => stepProject(-1)}
              aria-label="Previous video project"
            >
              PREVIOUS
            </motion.button>
            <motion.button
              type="button"
              className="wrk-arrow-btn"
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.14, ease: EASE }}
              onClick={() => stepProject(1)}
              aria-label="Next video project"
            >
              NEXT
            </motion.button>
          </div>
        </div>

        <ul className="wrk-grid" ref={gridRef}>
          {projects.map((project, idx) => {
            const isLockedPlaying = playingIndex === idx
            const isPreviewing = hoveredIndex === idx && !isLockedPlaying && !reduce
            const showVideo = (isLockedPlaying || isPreviewing) && Boolean(readyVideos[idx])
            const isActive = activeIndex === idx
            return (
              <li
                className={`wrk-card ${isActive ? 'wrk-card--active' : ''}`}
                key={project.brand}
              >
                <div
                  className="wrk-frame"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (!isLockedPlaying) togglePlay(idx)
                  }}
                  onMouseEnter={() => handleHoverStart(idx)}
                  onMouseLeave={() => handlePreviewEnd(idx)}
                  onFocus={() => handleFocusStart(idx)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      handlePreviewEnd(idx)
                    }
                  }}
                >
                  <div className="wrk-media">
                    <Image
                      src={project.poster}
                      alt={`${project.brand}, ${project.category} video still`}
                      fill
                      sizes="(max-width: 760px) 82vw, (max-width: 900px) 44vw, 22vw"
                    />
                    <video
                      ref={(el) => {
                        videoRefs.current[idx] = el
                      }}
                      className={`wrk-video${showVideo ? ' is-visible' : ''}`}
                      src={project.src}
                      poster={project.poster}
                      playsInline
                      loop
                      muted={!isLockedPlaying || isMuted}
                      preload="none"
                      aria-hidden={!isLockedPlaying}
                      onCanPlay={() =>
                        setReadyVideos((prev) => (prev[idx] ? prev : { ...prev, [idx]: true }))
                      }
                      onPlaying={() =>
                        setReadyVideos((prev) => (prev[idx] ? prev : { ...prev, [idx]: true }))
                      }
                      onClick={() => {
                        if (isLockedPlaying) togglePlay(idx)
                      }}
                    />
                  </div>

                  {isLockedPlaying ? (
                    <div className="wrk-controls">
                      <button
                        type="button"
                        className="wrk-ctrl-btn"
                        onClick={() => togglePlay(idx)}
                        aria-label={`Pause ${project.brand} video`}
                      >
                        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                          <rect x="3" y="2.5" width="3.5" height="11" fill="currentColor" />
                          <rect x="9.5" y="2.5" width="3.5" height="11" fill="currentColor" />
                        </svg>
                        <span>Pause</span>
                      </button>
                      <button
                        type="button"
                        className="wrk-ctrl-btn"
                        onClick={toggleMute}
                        aria-label={isMuted ? `Unmute ${project.brand} video` : `Mute ${project.brand} video`}
                      >
                        {isMuted ? (
                          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                            <path d="M2 6h3l4-3.5v11L5 10H2V6z" fill="currentColor" />
                            <path d="M11.5 5.5l3 5m0-5l-3 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                            <path d="M2 6h3l4-3.5v11L5 10H2V6z" fill="currentColor" />
                            <path d="M11.5 5.2a3.8 3.8 0 0 1 0 5.6M13.4 3.5a6.2 6.2 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        )}
                        <span>{isMuted ? 'Muted' : 'Sound'}</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <h3 className="wrk-brand">{project.brand}</h3>
                <div className="wrk-cat-row">
                  <p className="wrk-cat">{project.category}</p>
                  <a
                    className="wrk-ig"
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch ${project.brand} reel on Instagram`}
                  >
                    IG ↗
                  </a>
                </div>
                <span className="wrk-divider" aria-hidden />
                <p className="wrk-role">{project.role}</p>
              </li>
            )
          })}
        </ul>

        <div className="wrk-campaigns">
          <div className="wrk-campaign-copy">
            <p className="wrk-small">{campaignLabel}</p>
            <p className="wrk-campaign-body">{campaignBody}</p>
          </div>

          <div className="wrk-scrap">
            {campaigns.map((campaign, i) => (
              <Polaroid
                key={campaign.src}
                className={`wrk-scrap-p wrk-scrap-p--${i + 1}`}
                src={campaign.src}
                alt={campaign.alt}
                sizes="(max-width: 760px) 44vw, 210px"
              />
            ))}
            <Tape
              className="wrk-scrap-tape wrk-scrap-tape--a"
              style={{ width: 84, height: 21, left: '31%', top: -8, transform: 'rotate(-4deg)' }}
            />
            <Tape
              variant="pink"
              className="wrk-scrap-tape wrk-scrap-tape--b"
              style={{ width: 72, height: 19, right: '9%', top: -2, transform: 'rotate(6deg)' }}
            />
            <Sticker
              name="retro-film-camera"
              width={72}
              style={{ left: -24, bottom: -18, transform: 'rotate(-10deg)', zIndex: 7 }}
            />
            <Sticker
              name="yellow-star-doodle"
              width={48}
              style={{ right: -16, bottom: 18, transform: 'rotate(14deg)', zIndex: 7 }}
            />
            <FlowerDoodle />
          </div>
        </div>

        <div className="wrk-trusted">
          <p className="wrk-trusted-label">TRUSTED BY</p>
          <div className="wrk-marquee-viewport">
            <div className="wrk-marquee-track">
              <ul className="wrk-logos">
                {ALL_BRANDS.map((brand) => (
                  <li className="wrk-logo" key={`a-${brand.name}`}>
                    <Image src={`/assets/brands/${brand.file}`} alt={brand.name} fill sizes="120px" />
                  </li>
                ))}
              </ul>
              <ul className="wrk-logos wrk-logos--clone" aria-hidden="true">
                {ALL_BRANDS.map((brand) => (
                  <li className="wrk-logo" key={`b-${brand.name}`}>
                    <Image src={`/assets/brands/${brand.file}`} alt="" fill sizes="120px" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
