'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface HoverVideoFrameProps {
  src: string
  videoSrc?: string
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
}

/**
 * Displays a crisp next/image poster at rest and crossfades into a
 * muted looping preview video on hover, focus, or tap/click.
 */
export default function HoverVideoFrame({
  src,
  videoSrc,
  alt,
  sizes = '(max-width: 760px) 40vw, 280px',
  priority = false,
  className = '',
}: HoverVideoFrameProps) {
  const reduce = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  const isActive = Boolean(videoSrc) && (pinned || focused || (!reduce && hovered))

  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !videoSrc) return

    if (isActive) {
      vid.play().catch(() => {})
    } else {
      vid.pause()
    }
  }, [isActive, videoSrc])

  if (!videoSrc) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: 'cover' }}
      />
    )
  }

  function handleMouseEnter() {
    if (reduce) return
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return
    }
    setHovered(true)
  }

  function handleMouseLeave() {
    setHovered(false)
    setPinned(false)
  }

  function handleFocus() {
    if (!reduce) {
      setFocused(true)
    }
  }

  function handleBlur() {
    setFocused(false)
    setPinned(false)
  }

  function handleClick() {
    setPinned((prev) => !prev)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setPinned((prev) => !prev)
    }
  }

  return (
    <motion.div
      className={`hover-video-frame${isActive ? ' is-playing' : ''}${className ? ` ${className}` : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={pinned}
      aria-label={`${alt}, hover or activate to preview video`}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.14, ease: EASE }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: 'cover' }}
      />
      <video
        ref={videoRef}
        className={`hvf-video${isActive && videoReady ? ' is-visible' : ''}`}
        src={videoSrc}
        poster={src}
        playsInline
        muted
        loop
        preload="none"
        aria-hidden="true"
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
      />
    </motion.div>
  )
}
