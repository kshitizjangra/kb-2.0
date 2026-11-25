'use client'

import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion'
import { usePathname } from 'next/navigation'
import './motion.css'

/** Hairline scroll progress indicator along the top edge of public pages. */
export default function ScrollProgressBar() {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 32,
    restDelta: 0.001,
  })

  if (pathname?.startsWith('/admin') || reduce) return null

  return (
    <motion.div
      aria-hidden="true"
      className="kb-scroll-progress"
      style={{ scaleX }}
    />
  )
}
