'use client'

import { useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Polaroid, Tape } from '@/components/collage/Decor'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './services.css'

gsap.registerPlugin(ScrollTrigger)

export interface ServicesProps {
  data?: SiteCmsData['services']
}

export default function Services({ data = DEFAULT_CMS_DATA.services }: ServicesProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = sectionRef.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const cards = el.querySelectorAll<HTMLElement>('.svc-card')
      cards.forEach((card, idx) => {
        if (idx === cards.length - 1) return
        const nextCard = cards[idx + 1]
        gsap.to(card, {
          scale: 0.975,
          opacity: 0.9,
          ease: 'none',
          scrollTrigger: {
            trigger: nextCard,
            start: 'top 78%',
            end: 'top 22%',
            scrub: true,
          },
        })
      })

      gsap.fromTo(
        '.svc-pol-wrap',
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: '.svc-head',
            start: 'top 82%',
            once: true,
          },
        }
      )
    },
    { scope: sectionRef }
  )

  return (
    <section ref={sectionRef} id="services" className="services section" aria-labelledby="services-title">
      <div className="wrap">
        <header className="svc-head">
          <div className="svc-pol-wrap svc-pol-wrap--l">
            <Polaroid
              className="svc-pol"
              src="/assets/portfolio/carousel-01-04.webp"
              alt="Travel frame from Kamna’s content carousel"
              sizes="(max-width: 760px) 90px, 160px"
            />
            <Tape
              className="svc-pol-tape"
              style={{ width: 54, height: 15, left: '50%', top: -7, transform: 'translateX(-50%) rotate(-5deg)' }}
            />
          </div>

          <h2 id="services-title" className="svc-heading display">
            Services
          </h2>

          <div className="svc-pol-wrap svc-pol-wrap--r">
            <Polaroid
              className="svc-pol"
              src="/assets/portfolio/carousel-03-04.webp"
              alt="Interior frame from Kamna’s content carousel"
              sizes="(max-width: 760px) 90px, 160px"
            />
            <Tape
              variant="blue"
              className="svc-pol-tape"
              style={{ width: 48, height: 14, left: '50%', top: -7, transform: 'translateX(-50%) rotate(6deg)' }}
            />
          </div>
        </header>

        <div className="svc-list">
          {data.map((service) => (
            <article className="svc-card" key={service.index}>
              <span className="svc-index serif" aria-hidden>
                ({service.index})
              </span>

              <div className="svc-card-main">
                <p className="svc-kicker">{service.kicker}</p>

                <h3 className="svc-title serif">
                  {service.title.split('\n').map((line) => (
                    <span className="svc-title-line" key={line}>
                      {line}
                    </span>
                  ))}
                </h3>

                <p className="svc-body muted">{service.body}</p>

                <ul className="svc-tags">
                  {service.tags.map((tag) => (
                    <li className="pill" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>

              <figure className="svc-figure">
                <div className="svc-figure-inner">
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    sizes="(max-width: 900px) 92vw, 400px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <Tape
                  className="svc-figure-tape"
                  style={{ width: 62, height: 16, left: '50%', top: -8, transform: 'translateX(-50%) rotate(-2deg)' }}
                />
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
