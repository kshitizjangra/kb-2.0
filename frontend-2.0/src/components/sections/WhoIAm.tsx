'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Doodle, Stamp, Sticker, Tape } from '@/components/collage/Decor'
import ScrollWordReveal from '@/components/motion/ScrollWordReveal'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './who-i-am.css'

gsap.registerPlugin(ScrollTrigger)

const CIRCLED_PHRASE = 'sounds like you'

export interface WhoIAmProps {
  data?: SiteCmsData['whoIAm']
}

export default function WhoIAm({ data = DEFAULT_CMS_DATA.whoIAm }: WhoIAmProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = sectionRef.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.fromTo(
        '.about-tape-parallax',
        { y: -14 },
        {
          y: 18,
          ease: 'none',
          scrollTrigger: {
            trigger: '.about-statement-wrap',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        }
      )

      gsap.fromTo(
        '.about-stamp-wrap',
        { y: 20 },
        {
          y: -18,
          ease: 'none',
          scrollTrigger: {
            trigger: '.about-statement-wrap',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        }
      )

      gsap.fromTo(
        '.about-value',
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.about-values-grid',
            start: 'top 86%',
            once: true,
          },
        }
      )
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      id="about"
      className="about-intro section"
      aria-labelledby="who-i-am-label"
    >
      <div className="wrap about-intro-inner">
        <p id="who-i-am-label" className="eyebrow about-label">
          {data.label}
        </p>

        <div className="about-statement-wrap">
          <p className="about-statement">
            <ScrollWordReveal
              lead={data.lead}
              emph={data.emph}
              phrase={CIRCLED_PHRASE}
              leadClassName="about-lead"
              emphClassName="about-emph"
              wordClassName="about-word"
              renderCircled={(children) => (
                <span className="about-circled">
                  {children}
                  <Doodle variant="circle" className="about-circle-doodle" />
                </span>
              )}
            />
          </p>

          <div className="about-tape-parallax" aria-hidden>
            <Tape
              variant="blue"
              className="about-tape-blue"
              style={{ width: 92, height: 24, transform: 'rotate(12deg)' }}
            />
          </div>

          <div className="about-stamp-wrap">
            <Sticker name="blush-washi" width={68} className="about-sticker-washi" />
            <Tape
              variant="cream"
              className="about-stamp-tape"
              style={{ width: 52, height: 18, transform: 'rotate(-42deg)' }}
            />
            <Stamp
              className="about-stamp"
              src={data.stampImage}
              videoSrc={data.stampPreviewVideo}
              alt="Kamna on camera"
              sizes="160px"
            />
          </div>
        </div>

        <div className="about-values">
          <p className="small-caps about-values-label">MY VALUES</p>
          <ul className="about-values-grid">
            {data.values.map((value) => (
              <li key={value.title} className="about-value">
                <h3 className="about-value-title">{value.title}</h3>
                <p className="about-value-text">{value.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
