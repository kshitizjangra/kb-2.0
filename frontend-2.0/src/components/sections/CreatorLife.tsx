'use client'

import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Doodle, PaperClip, Polaroid, Sticker } from '@/components/collage/Decor'
import ScrollWordReveal from '@/components/motion/ScrollWordReveal'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './creator-life.css'

gsap.registerPlugin(ScrollTrigger)

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const CLEAN_SHOT_MAP: Record<string, string> = {
  '/assets/portfolio/hero-selected.webp': '/assets/portfolio/hero.webp',
  '/assets/portfolio/carousel-01-02.webp': '/assets/portfolio/intro-v2.webp',
  '/assets/portfolio/reel-04.webp': '/assets/portfolio/carousel-01.webp',
  '/assets/portfolio/carousel-02-02.webp': '/assets/portfolio/carousel-02.webp',
  '/assets/portfolio/carousel-03-03.webp': '/assets/portfolio/carousel-03.webp',
}

export interface CreatorLifeProps {
  data?: SiteCmsData['creatorLife']
}

export default function CreatorLife({ data = DEFAULT_CMS_DATA.creatorLife }: CreatorLifeProps) {
  const {
    label,
    lead,
    emph,
    colA,
    colB,
    envelopeLabel,
    envelopeBrands,
    shots,
    portfolioA,
    portfolioB,
    ribbonText,
  } = data

  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  useGSAP(
    () => {
      const el = sectionRef.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.fromTo(
        '.cl-envelope-block',
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: '.cl-envelope-block',
            start: 'top 84%',
            once: true,
          },
        }
      )
    },
    { scope: sectionRef }
  )

  const displayShots = shots.map((shot) => ({
    image: CLEAN_SHOT_MAP[shot.image] ?? shot.image,
    previewVideo: shot.previewVideo,
  }))

  return (
    <section ref={sectionRef} className="creator-life section">
      <div className="wrap cl-top">
        <p className="eyebrow cl-label">{label}</p>

        <h2 className="cl-statement">
          <ScrollWordReveal lead={lead} emph={emph} emphClassName="cl-emph" />
        </h2>

        <div className="cl-cols-wrap">
          <Doodle variant="squiggle" width={150} className="cl-squiggle" />
          <div className="cl-cols">
            <p>{colA}</p>
            <p>{colB}</p>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="cl-envelope-block">
          <div className="cl-shots">
            <motion.div
              className="paper paper--green cl-brands-card"
              whileHover={reduce ? undefined : { y: -6 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <Sticker name="baby-blue-washi" width={72} className="cl-sticker-washi" />
              <Sticker name="pink-satin-bow" width={54} className="cl-sticker-bow" />
              <p className="cl-brands-label">{envelopeLabel}</p>
              <p className="cl-brands-text">{envelopeBrands}</p>
            </motion.div>

            {displayShots.map((shot, i) => (
              <Polaroid
                key={`${shot.image}-${i}`}
                className={`cl-shot cl-shot--${i + 1}`}
                src={shot.image}
                videoSrc={shot.previewVideo}
                alt={`Kamna on camera, portfolio still ${i + 1}`}
                sizes="(max-width: 760px) 24vw, 150px"
              />
            ))}
          </div>

          <div className="cl-envelope">
            <span className="cl-line cl-line--l" aria-hidden />
            <span className="cl-line cl-line--r" aria-hidden />
            <div className="cl-face">
              <p className="cl-port-a">{portfolioA}</p>
              <p className="cl-port-b">{portfolioB}</p>
            </div>
          </div>

          <PaperClip className="cl-clip" />

          <span className="tape tape--pink cl-tape-word" aria-hidden>
            <span>{ribbonText || 'SELECTED WORK'}</span>
          </span>
        </div>

        <div className="cl-more">
          <a
            className="link-underline"
            href="https://www.instagram.com/thekamnabhardwaj/"
            target="_blank"
            rel="noopener noreferrer"
          >
            SEE MORE ON INSTAGRAM
          </a>
        </div>
      </div>
    </section>
  )
}
