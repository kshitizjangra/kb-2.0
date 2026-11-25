'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Provides Lenis smooth scrolling synchronized with GSAP ScrollTrigger on public pages,
 * disabled on touch devices, /admin, /cms, and prefers-reduced-motion.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isTouch || reduced || pathname?.startsWith('/admin') || pathname?.startsWith('/cms')) {
      if (!window.location.hash) window.scrollTo(0, 0)
      ScrollTrigger.refresh()
      return
    }

    if (!window.location.hash) window.scrollTo(0, 0)

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    lenis.on('scroll', ScrollTrigger.update)

    let rafId = 0
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    const refreshId = requestAnimationFrame(() => {
      ScrollTrigger.refresh()
    })

    function handleAnchorClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a[href*="#"]') as HTMLAnchorElement | null
      if (!anchor) return
      const raw = anchor.getAttribute('href')
      if (!raw || raw === '#') return

      const hashIndex = raw.indexOf('#')
      if (hashIndex === -1) return
      const hash = raw.slice(hashIndex)
      if (hash.length < 2) return
      const path = raw.slice(0, hashIndex)

      const currentPath = window.location.pathname
      const targetsSamePage = path === '' || path === currentPath || path === '/'

      if (!targetsSamePage) {
        if (path.startsWith('/')) {
          e.preventDefault()
          router.push(`${path}${hash}`)
        }
        return
      }

      const target = document.querySelector(hash)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target as HTMLElement, { duration: 1.1, offset: -12 })
      window.history.replaceState(null, '', hash)
    }

    function scrollToHash() {
      const hash = window.location.hash
      if (!hash || hash.length < 2) return
      let attempts = 0
      const tryScroll = () => {
        const target = document.querySelector(hash)
        if (target) {
          lenis.scrollTo(target as HTMLElement, { duration: 1.1, offset: -12 })
          return
        }
        if (++attempts < 12) requestAnimationFrame(tryScroll)
      }
      requestAnimationFrame(tryScroll)
    }

    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    document.addEventListener('click', handleAnchorClick)

    return () => {
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(refreshId)
      lenis.destroy()
      window.removeEventListener('hashchange', scrollToHash)
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [pathname, router])

  return <>{children}</>
}
