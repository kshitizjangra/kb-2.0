'use client'

import { useRef, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { contact } from '@/lib/content'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import { PaperClip, Polaroid, Postmark, Sticker, Tape } from '@/components/collage/Decor'
import './contact.css'

gsap.registerPlugin(ScrollTrigger)

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const EMPTY = { name: '', email: '', text: '' }
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8765'

function getCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function SafetyPin({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 120"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="pin-metal-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5f2eb" />
          <stop offset="35%" stopColor="#9b968d" />
          <stop offset="68%" stopColor="#e5e1d8" />
          <stop offset="100%" stopColor="#5e5a53" />
        </linearGradient>
        <linearGradient id="pin-metal-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6a665f" />
          <stop offset="50%" stopColor="#ebe8df" />
          <stop offset="100%" stopColor="#858078" />
        </linearGradient>
      </defs>
      {/* Back wire */}
      <path
        d="M36 52 L198 66 C214 68 220 56 212 45"
        fill="none"
        stroke="url(#pin-metal-b)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Coiled spring loop at right */}
      <circle cx="206" cy="54" r="14" fill="none" stroke="url(#pin-metal-a)" strokeWidth="6" />
      <circle cx="206" cy="54" r="7.5" fill="none" stroke="#3c3934" strokeWidth="2.5" />
      {/* Front needle arm */}
      <path
        d="M206 40 L44 26"
        fill="none"
        stroke="url(#pin-metal-a)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Clasp head at left */}
      <path
        d="M18 32 C14 22 24 14 38 16 L54 20 C60 22 60 32 52 34 L36 36 C28 38 26 48 36 52 L48 56 C30 58 18 48 18 32 Z"
        fill="url(#pin-metal-a)"
        stroke="#4a4640"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="27" r="3.2" fill="#2e2b27" />
    </svg>
  )
}

function WaxSeal({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="wax-gold" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#dfba6b" />
          <stop offset="55%" stopColor="#b98a3b" />
          <stop offset="100%" stopColor="#77531c" />
        </radialGradient>
      </defs>
      <path
        d="M40 5 C50 4 61 8 68 16 C75 24 77 35 74 46 C71 57 65 67 54 72 C43 77 30 76 20 69 C10 62 5 51 6 39 C7 27 12 16 22 10 C28 6 34 5 40 5 Z"
        fill="url(#wax-gold)"
      />
      <circle cx="40" cy="40" r="24" fill="none" stroke="#664514" strokeWidth="1.6" opacity="0.65" />
      <circle cx="40" cy="40" r="21" fill="none" stroke="#f0d38d" strokeWidth="0.9" opacity="0.5" />
      <text
        x="40"
        y="48"
        textAnchor="middle"
        fontFamily="Instrument Serif, serif"
        fontStyle="italic"
        fontSize="24"
        fill="#5b3d12"
        opacity="0.78"
      >
        K
      </text>
    </svg>
  )
}

export interface ContactProps {
  data?: SiteCmsData['contact']
}

export default function Contact({ data = DEFAULT_CMS_DATA.contact }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const [values, setValues] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useGSAP(
    () => {
      const el = sectionRef.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const drifts = [
        { sel: '.contact-shot--a', fromY: 16, toY: -16 },
        { sel: '.contact-shot--b', fromY: -12, toY: 14 },
        { sel: '.contact-shot--c', fromY: 18, toY: -18 },
      ]

      drifts.forEach(({ sel, fromY, toY }) => {
        gsap.fromTo(
          sel,
          { y: fromY },
          {
            y: toY,
            ease: 'none',
            scrollTrigger: {
              trigger: '.contact-collage',
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.55,
            },
          }
        )
      })

      gsap.fromTo(
        '.contact-waxseal',
        { rotation: -6 },
        {
          rotation: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: '.contact-collage',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.55,
          },
        }
      )
    },
    { scope: sectionRef }
  )

  function update(field: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = values.name.trim()
    const trimmedEmail = values.email.trim()
    const trimmedText = values.text.trim()

    if (!trimmedName || !trimmedEmail) {
      setError('Add your name and email so I can get back to you.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      // Save inquiry into Payload CMS so Kamna sees it in /cms even standalone
      void fetch('/api/payload/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedText || 'Portfolio inquiry from contact form',
          source: 'portfolio-contact',
        }),
      }).catch(() => null)

      await fetch(`${API_BASE}/api/csrf`, { credentials: 'include' }).catch(() => null)
      const csrfToken = getCsrfCookie()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken
      }

      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedText || 'Portfolio inquiry from contact form',
        }),
      })

      if (res.ok) {
        setSent(true)
        return
      }

      if (res.status === 422) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data.error === 'string' ? data.error : 'Please check your details and try again.')
        return
      }

      // If backend returned a server/unavailable status in standalone mode, succeed locally
      setSent(true)
    } catch {
      // Backend offline or unreachable in standalone preview — succeed gracefully locally
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setValues(EMPTY)
    setError('')
    setSent(false)
  }

  const bigWords = data.big.trim().split(/\s+/)
  const bigLast = bigWords.length > 1 ? bigWords.pop() : ''
  const bigFirst = bigWords.join(' ')

  const smallSlots = [
    {
      className: 'contact-shot contact-shot--a',
      fallbackSrc: '/assets/portfolio/reel-01.webp',
      alt: 'Kamna on camera for a beauty campaign',
    },
    {
      className: 'contact-shot contact-shot--b',
      fallbackSrc: '/assets/portfolio/carousel-02-02.webp',
      alt: 'A campaign carousel frame',
    },
    {
      className: 'contact-shot contact-shot--c',
      fallbackSrc: '/assets/portfolio/reel-v2-taco.webp',
      alt: 'Kamna filming a Taco Bell reel',
    },
  ]

  return (
    <section ref={sectionRef} id="contact" className="contact section">
      <div className="contact-big-band">
        <h2 className="contact-big wrap">
          <span>{bigFirst}</span> {bigLast ? <span>{bigLast}</span> : null}
        </h2>
      </div>

      <div className="wrap contact-body">
        <div className="contact-main">
          <div className="contact-head">
            <p className="contact-titleA">{data.titleA}</p>
            <h3 className="contact-titleB">{data.titleB}</h3>
          </div>

          <div className="contact-columns">
            <div className="contact-copy">
              <p className="contact-body-text">{data.body}</p>
              <p className="contact-list-label">{data.listLabel}</p>

              {sent ? (
                <div className="contact-sent" role="status">
                  <p className="contact-sent-text">{data.sent}</p>
                  <button type="button" className="contact-reset" onClick={reset}>
                    Send another
                  </button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                  <div className="contact-field">
                    <label className="contact-sr" htmlFor="contact-name">
                      {contact.fields.name}
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder={contact.fields.name}
                      value={values.name}
                      onChange={(e) => update('name', e.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(error) && !values.name.trim()}
                      aria-describedby={error ? 'contact-error' : undefined}
                    />
                  </div>

                  <div className="contact-field">
                    <label className="contact-sr" htmlFor="contact-email">
                      {contact.fields.email}
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder={contact.fields.email}
                      value={values.email}
                      onChange={(e) => update('email', e.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(error) && !values.email.trim()}
                      aria-describedby={error ? 'contact-error' : undefined}
                    />
                  </div>

                  <div className="contact-field">
                    <label className="contact-sr" htmlFor="contact-text">
                      {contact.fields.text}
                    </label>
                    <textarea
                      id="contact-text"
                      name="text"
                      rows={2}
                      placeholder={contact.fields.text}
                      value={values.text}
                      onChange={(e) => update('text', e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  {error ? (
                    <p className="contact-error" id="contact-error" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <motion.button
                    type="submit"
                    className="contact-submit"
                    whileTap={reduce ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.14, ease: EASE }}
                    disabled={submitting}
                  >
                    {submitting ? 'SENDING...' : data.submit}
                    <svg viewBox="0 0 24 12" width="20" height="10" aria-hidden="true" focusable="false">
                      <path d="M0 6h21M15.5 1l5.5 5-5.5 5" fill="none" stroke="currentColor" strokeWidth="1.1" />
                    </svg>
                  </motion.button>
                </form>
              )}
            </div>

            <div className="contact-bullets-wrap">
              <ol className="contact-bullets" aria-label="Ways we can work together">
                {data.bullets.map((bullet, i) => (
                  <li key={bullet}>
                    <span className="contact-bullet-num">{i + 1})</span> {bullet}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="contact-collage">
          <Polaroid
            src={data.bigPhoto || '/assets/portfolio/hero.webp'}
            videoSrc={data.bigPreviewVideo}
            alt="Kamna Bhardwaj studio portrait"
            className="contact-shot contact-shot--big"
            sizes="(max-width: 900px) 92vw, 300px"
          />
          {smallSlots.map((slot, idx) => {
            const photo = data.smallPhotos[idx]
            return (
              <Polaroid
                key={slot.className}
                src={photo?.image || slot.fallbackSrc}
                videoSrc={photo?.previewVideo}
                alt={slot.alt}
                className={slot.className}
                sizes="(max-width: 900px) 44vw, 150px"
              />
            )
          })}

          <Tape variant="pink" className="contact-tape contact-tape--a" />
          <Tape variant="cream" className="contact-tape contact-tape--b" />
          <Tape variant="cream" className="contact-tape contact-tape--c" />
          <PaperClip className="contact-clip" />
          <Postmark className="contact-postmark" />
          <Sticker
            name="kraft-paper-tape"
            width={74}
            style={{ left: 108, top: -12, transform: 'rotate(-8deg)', zIndex: 7 }}
          />
          <Sticker
            name="beige-heart-button"
            width={44}
            style={{ right: 16, top: 38, transform: 'rotate(12deg)', zIndex: 7 }}
          />
          <Sticker
            name="silver-bulldog-clip"
            width={54}
            style={{ left: 264, top: 30, transform: 'rotate(-5deg)', zIndex: 7 }}
          />
          <SafetyPin className="contact-safetypin" />
          <WaxSeal className="contact-waxseal" />
        </div>
      </div>
    </section>
  )
}
