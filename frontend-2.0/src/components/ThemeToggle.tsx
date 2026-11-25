'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'kb-theme'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.4 14.6A8.6 8.6 0 1 1 9.4 3.6a6.9 6.9 0 0 0 11 11Z" />
    </svg>
  )
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    setTheme(next)
    root.dataset.theme = next
    root.style.colorScheme = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage may be unavailable (private mode) — the theme still applies for this visit */
    }
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
