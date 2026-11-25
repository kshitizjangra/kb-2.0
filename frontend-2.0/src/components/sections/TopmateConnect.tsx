'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowUpRight } from 'lucide-react'
import { Pin, Tape } from '@/components/collage/Decor'
import { API_BASE } from '@/lib/kamna-data'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './topmate-connect.css'

gsap.registerPlugin(ScrollTrigger)

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface TopmateConnectProps {
  data?: SiteCmsData['topmate']
  newsletterData?: SiteCmsData['newsletter']
}

export default function TopmateConnect({
  data = DEFAULT_CMS_DATA.topmate,
  newsletterData = DEFAULT_CMS_DATA.newsletter,
}: TopmateConnectProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const defaultRatings = data.stats.find((s) => s.label === 'Ratings')?.value ?? '31'
  const defaultTestimonials = data.stats.find((s) => s.label === 'Testimonials')?.value ?? '31'
  const [ratingsCount, setRatingsCount] = useState<string>(defaultRatings)
  const [testimonialsCount, setTestimonialsCount] = useState<string>(defaultTestimonials)
  const [topmateUrl, setTopmateUrl] = useState<string>(data.topmateUrl)

  useGSAP(
    () => {
      const el = sectionRef.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.fromTo(
        '.tc-service-row',
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.055,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: '.tc-services-list',
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
    fetch(`${API_BASE}/api/testimonials`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload?.settings) return
        if (payload.settings.topmate_ratings_count) {
          setRatingsCount(String(payload.settings.topmate_ratings_count))
        }
        if (payload.settings.topmate_testimonials_count) {
          setTestimonialsCount(String(payload.settings.topmate_testimonials_count))
        }
        if (payload.settings.topmate_url) {
          setTopmateUrl(String(payload.settings.topmate_url))
        }
      })
      .catch(() => {
        /* Keep static 31 counts when backend is unavailable */
      })

    return () => controller.abort()
  }, [])

  const stats = data.stats.map((stat) => {
    if (stat.label === 'Ratings') return { ...stat, value: ratingsCount }
    if (stat.label === 'Testimonials')
      return { ...stat, value: testimonialsCount }
    return stat
  })

  return (
    <section
      ref={sectionRef}
      id="topmate"
      className="topmate-connect section"
      aria-labelledby="topmate-heading"
    >
      <div className="wrap">
        <div className="tc-topmate-grid">
          <div className="tc-intro">
            <span className="eyebrow tc-eyebrow">{data.eyebrow}</span>

            <h2 id="topmate-heading" className="tc-heading serif">
              {data.heading.includes('1:1') ? (
                <>
                  {data.heading.split('1:1')[0]}
                  <span className="serif-italic tc-accent">1:1</span>
                  {data.heading.split('1:1')[1]}
                </>
              ) : (
                data.heading
              )}
            </h2>

            <p className="tc-sub muted">{data.body}</p>

            <dl className="tc-stats">
              {stats.map((stat) => (
                <div className="tc-stat" key={stat.label}>
                  <dt className="small-caps">{stat.label}</dt>
                  <dd className="serif" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="tc-badges" aria-label="Topmate creator badges">
              {data.badges.map((badge) => (
                <span className="pill tc-badge" key={badge}>
                  {badge}
                </span>
              ))}
            </div>

            <div className="tc-cta-wrap">
              <motion.a
                href={topmateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tc-book-btn"
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.14, ease: EASE }}
              >
                Book on Topmate
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </motion.a>
            </div>
          </div>

          <div className="tc-services-col">
            <div className="tc-services-head">
              <span className="small-caps">1:1 sessions &amp; digital goods</span>
              <span className="small-caps" style={{ fontVariantNumeric: 'tabular-nums' }}>
                01 / {String(data.services.length).padStart(2, '0')}
              </span>
            </div>

            <ol className="tc-services-list">
              {data.services.map((service, idx) => {
                const serviceIndex = String(idx + 1).padStart(2, '0')
                return (
                  <li className="tc-service-row" key={`${serviceIndex}-${service.name}`}>
                    <a
                      href={topmateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tc-service-link"
                    >
                      <span
                        className="tc-service-index serif"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                        aria-hidden="true"
                      >
                        {serviceIndex}
                      </span>

                      <div className="tc-service-info">
                        <h3 className="tc-service-name">{service.name}</h3>
                        <p className="tc-service-meta muted">{service.duration}</p>
                      </div>

                      <div className="tc-service-price-wrap">
                        <span
                          className="tc-service-price serif"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {service.price}
                        </span>
                        <ArrowUpRight
                          size={16}
                          strokeWidth={1.5}
                          className="tc-service-arrow"
                          aria-hidden="true"
                        />
                      </div>
                    </a>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        <div
          id="newsletter"
          className="tc-newsletter-wrap"
          aria-labelledby="newsletter-heading"
        >
          <article className="tc-newsletter-note paper paper--blue">
            <Tape
              variant="cream"
              className="tc-nl-tape"
              style={{
                width: 74,
                height: 18,
                left: 28,
                top: -9,
                transform: 'rotate(-4deg)',
              }}
            />
            <Pin className="tc-nl-pin" style={{ right: 24, top: -5 }} />

            <div className="tc-nl-top">
              <span className="tc-nl-kicker">{newsletterData.kicker || 'Dispatch, New Delhi'}</span>
              <span className="tc-nl-badge">{newsletterData.badge}</span>
            </div>

            <div className="tc-nl-body">
              <h2 id="newsletter-heading" className="tc-nl-heading serif">
                {newsletterData.heading}
              </h2>
              <p className="tc-nl-sub">{newsletterData.sub}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
