'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

interface ScrollWordRevealProps {
  lead: string
  emph: string
  phrase?: string
  leadClassName?: string
  emphClassName?: string
  wordClassName?: string
  renderCircled?: (children: React.ReactNode) => React.ReactNode
}

/**
 * GSAP ScrollTrigger scrubbed word-by-word illumination across editorial statements.
 * Respects prefers-reduced-motion and renders high-contrast tokens across dark and light themes.
 */
export function useScrollWordReveal(containerRef: React.RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const root = containerRef.current
      if (!root) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const words = root.querySelectorAll<HTMLElement>('[data-scrub-word]')
      if (words.length === 0) return

      if (reduced) {
        gsap.set(words, { opacity: 1 })
        return
      }

      gsap.fromTo(
        words,
        { opacity: 0.42 },
        {
          opacity: 1,
          stagger: 0.04,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top 84%',
            end: 'bottom 52%',
            scrub: 0.45,
          },
        }
      )
    },
    { scope: containerRef }
  )
}

export function ScrubWordSpans({
  text,
  prefix,
  className = '',
  trailingSpace = true,
}: {
  text: string
  prefix: string
  className?: string
  trailingSpace?: boolean
}) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <>
      {words.map((word, idx) => (
        <span key={`${prefix}-${idx}-${word}`} data-scrub-word="" className={className}>
          {word}
          {idx < words.length - 1 || trailingSpace ? ' ' : ''}
        </span>
      ))}
    </>
  )
}

export default function ScrollWordReveal({
  lead,
  emph,
  phrase,
  leadClassName = '',
  emphClassName = '',
  wordClassName = '',
  renderCircled,
}: ScrollWordRevealProps) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  useScrollWordReveal(wrapRef)

  const phraseIdx = phrase ? emph.indexOf(phrase) : -1
  const hasPhrase = Boolean(phrase && phraseIdx !== -1)
  const emphBefore = hasPhrase && phrase ? emph.slice(0, phraseIdx).trimEnd() : emph
  const emphAfter = hasPhrase && phrase ? emph.slice(phraseIdx + phrase.length) : ''

  return (
    <span ref={wrapRef}>
      <span className={leadClassName}>
        <ScrubWordSpans text={lead} prefix="lead" className={wordClassName} trailingSpace />
      </span>
      <span className={emphClassName}>
        {hasPhrase && phrase ? (
          <>
            <ScrubWordSpans text={emphBefore} prefix="before" className={wordClassName} trailingSpace />
            {renderCircled ? (
              renderCircled(
                <ScrubWordSpans text={phrase} prefix="phrase" className={wordClassName} trailingSpace={false} />
              )
            ) : (
              <ScrubWordSpans text={phrase} prefix="phrase" className={wordClassName} trailingSpace={false} />
            )}
            {emphAfter.trim() ? (
              <>
                {/^\s/.test(emphAfter) ? ' ' : ''}
                <ScrubWordSpans text={emphAfter.trim()} prefix="after" className={wordClassName} trailingSpace={false} />
              </>
            ) : (
              emphAfter
            )}
          </>
        ) : (
          <ScrubWordSpans text={emph} prefix="emph" className={wordClassName} trailingSpace={false} />
        )}
      </span>
    </span>
  )
}
