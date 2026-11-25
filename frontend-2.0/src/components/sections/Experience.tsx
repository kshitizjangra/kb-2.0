'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Doodle, PaperClip, Stamp, Sticker } from '@/components/collage/Decor'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './experience.css'

gsap.registerPlugin(ScrollTrigger)

export interface ExperienceProps {
  data?: SiteCmsData['experience']
}

export default function Experience({ data = DEFAULT_CMS_DATA.experience }: ExperienceProps) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const layers = [
        { sel: '.exp-torn', fromY: 18, toY: -18 },
        { sel: '.exp-note', fromY: -10, toY: 14 },
        { sel: '.exp-stamp-motion', fromY: 22, toY: -22 },
      ]

      layers.forEach(({ sel, fromY, toY }) => {
        gsap.fromTo(
          sel,
          { y: fromY },
          {
            y: toY,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.55,
            },
          }
        )
      })

      gsap.fromTo(
        '.exp-copy',
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            once: true,
          },
        }
      )
    },
    { scope: ref }
  )

  return (
    <section ref={ref} className="experience section" aria-labelledby="experience-title">
      <div className="wrap exp-inner">
        <div className="exp-collage">
          <span className="exp-torn" aria-hidden />

          <div className="exp-note paper">
            <PaperClip className="exp-clip" />
            <p className="exp-note-title serif-italic">{data.noteTitle}</p>
            <p className="exp-note-body">{data.noteBody}</p>
          </div>

          <div className="exp-stamp-motion">
            <Stamp
              className="exp-stamp"
              src={data.stampImage}
              alt="Kamna on camera during a brand shoot"
              sizes="112px"
            />
          </div>

          <Sticker name="heart-postage-stamp" width={62} className="exp-sticker-stamp" />
          <Sticker name="monarch-butterfly-sketch" width={58} className="exp-sticker-butterfly" />
          <Doodle variant="star" className="exp-star" width={64} />
        </div>

        <div className="exp-copy">
          <h2 id="experience-title" className="exp-heading">
            <span className="exp-heading-a serif-italic">{data.headingA}</span>
            <span className="exp-heading-b display">{data.headingB}</span>
          </h2>

          <p className="exp-body muted">{data.body}</p>

          <div className="exp-link-wrap">
            <a className="link-underline" href="#contact">
              {data.ctaLabel}
            </a>
            <Doodle variant="squiggle" className="exp-squiggle" width={150} />
          </div>
        </div>
      </div>
    </section>
  )
}
