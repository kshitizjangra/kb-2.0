'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

interface RevealProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  delay?: number
  y?: number
  duration?: number
}

/** Editorial scroll-reveal wrapper using Framer Motion, respecting prefers-reduced-motion. */
export default function Reveal({
  children,
  className,
  style,
  delay = 0,
  y = 22,
  duration = 0.65,
}: RevealProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ delay, duration, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
