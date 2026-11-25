'use client'

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, Star } from 'lucide-react'
import { Pin, Sticker, Tape } from '@/components/collage/Decor'
import { API_BASE, type TestimonialItem } from '@/lib/kamna-data'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './testimonials.css'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface TestimonialsProps {
  data?: SiteCmsData['testimonials']
}

export default function Testimonials({
  data = DEFAULT_CMS_DATA.testimonials,
}: TestimonialsProps) {
  const reduce = useReducedMotion()
  const [reviews, setReviews] = useState<TestimonialItem[]>(data.items)
  const [count, setCount] = useState<string>(data.count)
  const [topmateUrl, setTopmateUrl] = useState<string>(data.topmateUrl)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_BASE}/api/testimonials`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload) return
        if (Array.isArray(payload.testimonials) && payload.testimonials.length > 0) {
          setReviews(
            payload.testimonials.map(
              (item: { name?: string; date?: string; text?: string }) => ({
                name: item.name ?? 'Topmate Client',
                date: item.date ?? '',
                text: item.text ?? '',
              })
            )
          )
          setIndex(0)
        }
        if (payload.settings?.topmate_testimonials_count) {
          setCount(String(payload.settings.topmate_testimonials_count))
        }
        if (payload.settings?.topmate_url) {
          setTopmateUrl(String(payload.settings.topmate_url))
        }
      })
      .catch(() => {
        /* Keep static 31 verified Topmate reviews when backend is offline */
      })

    return () => controller.abort()
  }, [])

  const total = reviews.length
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0
  const active = reviews[safeIndex]

  const goPrev = useCallback(() => {
    setDirection(-1)
    setIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  const goNext = useCallback(() => {
    setDirection(1)
    setIndex((prev) => (prev + 1) % total)
  }, [total])

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goPrev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goNext()
    }
  }

  return (
    <section
      id="testimonials"
      className="testimonials section"
      aria-labelledby="testimonials-heading"
      onKeyDown={handleKeyDown}
    >
      <div className="wrap">
        <header className="tst-topbar">
          <div className="tst-heading-block">
            <span className="eyebrow tst-eyebrow">{data.eyebrow}</span>
            <h2 id="testimonials-heading" className="tst-summary">
              {data.rating} · {count} reviews ·{' '}
              <span className="serif-italic tst-summary-accent">
                People&apos;s Choice · Top 5%
              </span>
            </h2>
          </div>

          <div className="tst-controls" role="group" aria-label="Review navigation">
            <motion.button
              type="button"
              className="tst-nav-btn"
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.14, ease: EASE }}
              onClick={goPrev}
              aria-label="Previous review"
            >
              <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Previous</span>
            </motion.button>

            <span className="tst-counter serif" aria-live="polite">
              {String(safeIndex + 1).padStart(2, '0')} /{' '}
              {String(total).padStart(2, '0')}
            </span>

            <motion.button
              type="button"
              className="tst-nav-btn"
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.14, ease: EASE }}
              onClick={goNext}
              aria-label="Next review"
            >
              <span>Next</span>
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </motion.button>
          </div>
        </header>

        <div className="tst-stage">
          <div className="tst-sheet-back paper paper--blue" aria-hidden="true" />

          <article
            className="tst-card paper"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={0}
            aria-label={`Review ${safeIndex + 1} of ${total} by ${active.name}. Use left or right arrow keys to browse.`}
          >
            <Tape
              variant="cream"
              className="tst-tape"
              style={{
                width: 78,
                height: 20,
                left: 28,
                top: -10,
                transform: 'rotate(-5deg)',
              }}
            />
            <Pin className="tst-pin" style={{ right: 28, top: -5 }} />
            <Sticker
              name="wavy-quote-ribbon"
              width={78}
              style={{ right: -18, bottom: -16, transform: 'rotate(-6deg)', zIndex: 7 }}
            />
            <Sticker
              name="black-embroidered-star"
              width={44}
              style={{ left: -16, bottom: 24, transform: 'rotate(11deg)', zIndex: 7 }}
            />

            <div className="tst-card-top">
              <span className="tst-verified">
                <Star size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>5.0 · Topmate Verified</span>
              </span>
              <span className="tst-index serif">
                #{String(safeIndex + 1).padStart(2, '0')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${safeIndex}-${active.name}`}
                initial={reduce ? false : { opacity: 0, x: direction * 12 }}
                animate={reduce ? undefined : { opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: direction * -12 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <blockquote className="tst-quote">
                  <p className="tst-quote-text serif">“{active.text}”</p>
                </blockquote>

                <footer className="tst-card-foot">
                  <div className="tst-author">
                    <span className="tst-name">{active.name}</span>
                    {active.date ? (
                      <span className="tst-date">{active.date}</span>
                    ) : null}
                  </div>

                  <span className="tst-kbd-hint">Arrow keys to browse</span>
                </footer>
              </motion.div>
            </AnimatePresence>
          </article>
        </div>

        <footer className="tst-footer">
          <a
            href={topmateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline tst-see-all"
          >
            See all {count} reviews on Topmate
            <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </section>
  )
}
