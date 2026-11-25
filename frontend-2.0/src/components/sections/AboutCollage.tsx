'use client'

import { useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { PaperClip, Polaroid, Postmark, Stamp, Sticker, Tape } from '@/components/collage/Decor'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './about-collage.css'

gsap.registerPlugin(ScrollTrigger)

export interface AboutCollageProps {
  data?: SiteCmsData['aboutCollage']
  siteData?: SiteCmsData['site']
}

export default function AboutCollage({
  data = DEFAULT_CMS_DATA.aboutCollage,
  siteData = DEFAULT_CMS_DATA.site,
}: AboutCollageProps) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const parallaxTargets = [
        { sel: '.about-id', fromY: 14, toY: -18 },
        { sel: '.about-ticket', fromY: -12, toY: 14 },
        { sel: '.about-pol-wrap--a', fromY: 20, toY: -20 },
        { sel: '.about-pol-wrap--b', fromY: 10, toY: -24 },
      ]

      parallaxTargets.forEach(({ sel, fromY, toY }) => {
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
        ['.about-note', '.about-trusted'],
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: el,
            start: 'top 78%',
            once: true,
          },
        }
      )
    },
    { scope: ref }
  )

  const [titleA, titleB = ''] = data.title.split('\n')

  return (
    <section ref={ref} className="about-board section" aria-labelledby="about-board-title">
      <div className="about-board-inner">
        <div className="about-kraft" aria-hidden />

        <div className="about-cluster">
          <Stamp
            className="about-stamp about-stamp--a"
            src="/assets/portfolio/carousel-02-02.webp"
            alt="Kamna’s carousel design, kept as a postage stamp"
            sizes="90px"
          />
          <Stamp
            className="about-stamp about-stamp--b"
            src="/assets/portfolio/reel-02.webp"
            alt="A frame from Kamna’s McDonald’s reel"
            sizes="80px"
          />
          <Postmark className="about-postmark" top="NEW DELHI" bottom="INDIA" />

          <div className="about-id">
            <PaperClip className="about-id-clip" />
            <Tape
              className="about-id-tape"
              style={{ width: 76, height: 17, left: '36%', top: -9, transform: 'rotate(3deg)' }}
            />
            <div className="about-id-top">
              <span className="about-id-license">Creative License</span>
              <span className="about-id-serial">{data.idSerial}</span>
            </div>
            <div className="about-id-main">
              <span className="about-id-photo">
                <Image
                  src={data.idPhoto || '/kamna.jpg'}
                  alt={siteData.name}
                  width={112}
                  height={140}
                  sizes="60px"
                />
              </span>
              <dl className="about-id-fields">
                <div>
                  <dt>Name</dt>
                  <dd>{siteData.name}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{data.idRole}</dd>
                </div>
                <div>
                  <dt>Place</dt>
                  <dd>{data.idPlace}</dd>
                </div>
              </dl>
            </div>
            <span className="about-id-barcode" aria-hidden />
            <span className="about-id-sign">{siteData.shortName.toLowerCase()}</span>
          </div>

          <div className="about-ticket" aria-hidden>
            <Tape
              variant="blue"
              className="about-ticket-tape"
              style={{ width: 62, height: 16, right: '20%', top: -8, transform: 'rotate(-4deg)' }}
            />
            <div className="about-ticket-main">
              <span className="about-ticket-kicker">Boarding Pass · {siteData.name}</span>
              <span className="about-ticket-route">{data.boardingRoute}</span>
              <span className="about-ticket-meta">{data.boardingMeta}</span>
            </div>
            <div className="about-ticket-stub">
              <span>KB</span>
              <span>26</span>
            </div>
          </div>

          <div className="about-pol-wrap about-pol-wrap--a">
            <Polaroid
              src={data.polaroidA}
              videoSrc={data.polaroidAPreviewVideo}
              alt="Kamna’s LinkedIn carousel on personal branding"
              sizes="(max-width: 900px) 46vw, 220px"
            />
            <Tape
              className="about-pol-tape"
              style={{ width: 62, height: 18, left: '28%', top: -9, transform: 'rotate(-5deg)' }}
            />
          </div>

          <div className="about-pol-wrap about-pol-wrap--b">
            <Polaroid
              src={data.polaroidB}
              videoSrc={data.polaroidBPreviewVideo}
              alt="Kamna on camera during a brand shoot"
              sizes="(max-width: 900px) 40vw, 180px"
            />
            <Sticker
              name="cherry-postage-stamp"
              width={56}
              style={{ right: -22, bottom: -14, transform: 'rotate(11deg)' }}
            />
          </div>
          <Sticker
            name="good-things-are-coming-ticket"
            width={92}
            style={{ left: '6%', bottom: -18, transform: 'rotate(-8deg)', zIndex: 7 }}
          />
        </div>

        <article className="paper paper--blue about-note">
          <Sticker
            name="sparkle-glasses"
            width={64}
            style={{ right: 16, top: -22, transform: 'rotate(9deg)', zIndex: 7 }}
          />
          <Tape
            className="about-note-tape"
            style={{ width: 94, height: 21, left: '24%', top: -12, transform: 'rotate(-3deg)' }}
          />
          <PaperClip className="about-note-clip" />

          <h2 id="about-board-title" className="about-note-title">
            <span className="about-note-title-a">{titleA}</span>
            {titleB ? <span className="about-note-title-b">{titleB}</span> : null}
          </h2>

          {data.paragraphs.map((paragraph, idx) => (
            <p key={`${idx}-${paragraph.slice(0, 20)}`} className="about-note-body">
              {paragraph}
            </p>
          ))}

          <p className="about-note-skills">
            <span className="about-note-skills-label">Skills:</span>{' '}
            {data.skills.map((skill) => (
              <span key={skill} className="about-skill">
                {skill}
              </span>
            ))}
          </p>
        </article>

        <aside className="about-trusted">
          <Tape
            className="about-trusted-tape"
            style={{ width: 66, height: 17, left: '32%', top: -8, transform: 'rotate(-3deg)' }}
          />
          <p className="about-trusted-label">{data.trustedNote}</p>
          <p className="about-trusted-brands">{data.trustedBrands}</p>
        </aside>

        <div className="about-side-name" aria-hidden>
          {siteData.name}
        </div>
      </div>
    </section>
  )
}
