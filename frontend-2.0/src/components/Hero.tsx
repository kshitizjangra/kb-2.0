'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import SiteHeader from '@/components/SiteHeader'
import { Doodle, Pin, Polaroid, Postmark, Stamp, Sticker, Tape } from '@/components/collage/Decor'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './hero.css'

gsap.registerPlugin(ScrollTrigger)

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface HeroProps {
  data?: SiteCmsData['hero']
  siteData?: SiteCmsData['site']
}

export default function Hero({
  data = DEFAULT_CMS_DATA.hero,
  siteData = DEFAULT_CMS_DATA.site,
}: HeroProps) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const introItems = el.querySelectorAll(
        '.hero-torn, .hero-filmstrip, .hero-kraft, .hero-polaroid, .hero-stamp-main, .hero-stamp-small, .hero-postmark'
      )

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(
        introItems,
        { opacity: 0, y: 14, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.045, clearProps: 'transform' }
      )
        .fromTo(
          '.hero-eyebrow',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45 },
          '-=0.35'
        )
        .fromTo(
          '.hero-name',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.55 },
          '-=0.35'
        )
        .fromTo(
          '.hero-cta',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45 },
          '-=0.32'
        )

      gsap.to('.hero-collage-motion', {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
        },
      })

      gsap.to('.hero-kraft', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
        },
      })

      gsap.to('.hero-copy', {
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '80% top',
          scrub: 0.4,
        },
      })
    },
    { scope: ref }
  )

  return (
    <section ref={ref} className="hero" aria-label={`${data.name}, ${data.eyebrow}`}>
      <SiteHeader siteData={siteData} />
      <div className="hero-stage">
        <div className="hero-collage">
          <div className="hero-collage-motion">
            <div className="hero-torn hero-torn--pink" aria-hidden />
            <div className="hero-filmstrip" aria-hidden>
              <span>
                <Image src="/assets/portfolio/hero.webp" alt="" fill sizes="210px" style={{ objectFit: 'cover' }} />
              </span>
              <span>
                <Image src="/assets/portfolio/hero-selected.webp" alt="" fill sizes="210px" style={{ objectFit: 'cover' }} />
              </span>
              <span>
                <Image src="/assets/portfolio/intro-v2.webp" alt="" fill sizes="210px" style={{ objectFit: 'cover' }} />
              </span>
            </div>

            <div className="hero-kraft" aria-hidden>
              <span className="hero-kraft-line" />
              <span className="hero-kraft-line hero-kraft-line--short" />
              <div className="hero-kraft-photo">
                <Image src="/assets/portfolio/carousel-01.webp" alt="" fill sizes="160px" style={{ objectFit: 'cover' }} />
              </div>
              <span className="hero-kraft-stamp">26</span>
            </div>

            <Polaroid
              className="hero-polaroid"
              src={data.polaroidImage}
              videoSrc={data.polaroidPreviewVideo}
              alt={`${data.name}, personal brand strategist and content creator`}
              sizes="(max-width: 760px) 42vw, 320px"
              priority
            />
            <Tape
              className="hero-tape-a"
              style={{ width: 96, height: 24, left: '39%', top: 30, transform: 'rotate(-4deg)' }}
            />
            <Tape
              variant="blue"
              className="hero-tape-b"
              style={{ width: 84, height: 22, left: '55%', top: 400, transform: 'rotate(6deg)' }}
            />
            <Pin className="hero-pin" style={{ left: '61%', top: 34 }} />

            <Stamp
              className="hero-stamp-main"
              src={data.stampMainImage}
              alt="Kamna’s LinkedIn carousel design"
              sizes="200px"
            />

            <Stamp
              className="hero-stamp-small"
              src={data.stampSmallImage}
              videoSrc={data.stampSmallPreviewVideo}
              alt="Kamna on camera"
              sizes="130px"
            />

            <Postmark
              className="hero-postmark"
              top={data.postmarkTop}
              bottom={data.postmarkBottom}
            />

            <span className="hero-tape-dark" aria-hidden />
            <Sticker name="pink-doodle-star" width={58} className="hero-sticker-star" />
            <Sticker name="gold-safety-pin-pink-tape" width={72} className="hero-sticker-pin-tape" />
            <Sticker name="black-push-pin" width={40} className="hero-sticker-pushpin" />
            <Doodle variant="sparkle" width={54} className="hero-sparkle" />
            <Doodle variant="arrow" width={132} className="hero-arrow" />
          </div>
        </div>
      </div>

      <div className="hero-copy wrap">
        <p className="hero-eyebrow">{data.eyebrow}</p>
        <h1 className="hero-name">{data.name}</h1>
        <div className="hero-cta">
          <motion.div
            whileHover={reduce ? undefined : { y: -1 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            style={{ display: 'inline-block' }}
          >
            <Link href={data.ctaHref} className="link-underline">
              {data.cta}
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="hero-scroll" aria-hidden>
        <span>Scroll to explore</span>
      </div>
    </section>
  )
}
