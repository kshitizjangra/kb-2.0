'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { adminLogout } from '@/lib/admin-api'
import EmailsPanel from '@/components/admin/EmailsPanel'
import FeedbackPanel from '@/components/admin/FeedbackPanel'
import BlogPanel from '@/components/admin/BlogPanel'
import FilesPanel from '@/components/admin/FilesPanel'
import NewsletterPanel from '@/components/admin/NewsletterPanel'
import ReviewsPanel from '@/components/admin/ReviewsPanel'
import SocialPanel from '@/components/admin/SocialPanel'
import ChatPanel from '@/components/admin/ChatPanel'
import '@/components/admin/admin.css'

type Tab =
  | 'emails'
  | 'feedback'
  | 'blog'
  | 'files'
  | 'newsletter'
  | 'reviews'
  | 'social'
  | 'chat'

const TABS: { id: Tab; label: string }[] = [
  { id: 'emails', label: 'Emails' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'blog', label: 'Blog' },
  { id: 'files', label: 'Files' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'social', label: 'Social' },
  { id: 'chat', label: 'Live Chat' },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('emails')
  const [signingOut, setSigningOut] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)

  const handleUnauthorized = useCallback(() => {
    setUnauthorized(true)
  }, [])

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await adminLogout()
    } catch {
      // still bounce to login — session flush attempted server-side
    }
    window.location.href = '/admin/login'
  }

  return (
    <main className="adm-shell">
      <div className="adm-wrap">
        <header className="adm-header">
          <div>
            <p className="adm-header-kicker">Owner Desk</p>
            <h1 id="admin-title" className="adm-header-title">
              Admin <span>Dashboard</span>
            </h1>
            <p className="adm-header-meta">Kamna Bhardwaj, Owner</p>
          </div>
          <div className="adm-header-actions">
            <Link href="/cms" className="adm-btn adm-btn-pink">
              Open Payload CMS Studio ↗
            </Link>
            <Link href="/" className="adm-btn">
              ← Back to Site
            </Link>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="adm-btn"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>

        <nav className="adm-tabs" aria-labelledby="admin-title">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`adm-tab ${tab === t.id ? 'is-active' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {unauthorized && (
          <div className="adm-auth-banner" role="alert">
            <span>
              Your admin session is missing or expired (401 Unauthorized). Sign
              in to manage live data.
            </span>
            <Link href="/admin/login" className="adm-btn-primary adm-btn-sm">
              Sign in at /admin/login →
            </Link>
          </div>
        )}

        <div className="adm-panels">
          {tab === 'emails' && (
            <EmailsPanel onUnauthorized={handleUnauthorized} />
          )}
          {tab === 'feedback' && (
            <FeedbackPanel onUnauthorized={handleUnauthorized} />
          )}
          {tab === 'blog' && <BlogPanel onUnauthorized={handleUnauthorized} />}
          {tab === 'files' && (
            <FilesPanel onUnauthorized={handleUnauthorized} />
          )}
          {tab === 'newsletter' && (
            <NewsletterPanel onUnauthorized={handleUnauthorized} />
          )}
          {tab === 'reviews' && (
            <ReviewsPanel onUnauthorized={handleUnauthorized} />
          )}
          {tab === 'social' && (
            <SocialPanel onUnauthorized={handleUnauthorized} />
          )}
          {tab === 'chat' && <ChatPanel onUnauthorized={handleUnauthorized} />}
        </div>
      </div>
    </main>
  )
}
