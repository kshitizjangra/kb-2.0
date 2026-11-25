'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import { API_BASE } from '@/lib/api'
import { AdminApiError, adminLogin } from '@/lib/admin-api'
import '@/components/admin/admin.css'

export default function AdminLoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await adminLogin(identifier, password)
      router.push('/admin')
    } catch (err) {
      if (err instanceof AdminApiError) {
        if (err.status === 429) {
          const mins =
            err.retryAfter && err.retryAfter > 0
              ? Math.ceil(err.retryAfter / 60)
              : null
          setError(
            mins
              ? `Too many attempts. Please try again in ~${mins} min.`
              : 'Too many attempts. Please try again later.'
          )
        } else {
          setError(err.message || 'Sign in failed. Please try again.')
        }
      } else {
        setError(
          `Could not reach the backend API (${API_BASE}). Make sure the Django server is running and try again.`
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-login-page">
      <SiteHeader />

      <main id="main-content" className="adm-login-main">
        <section className="adm-login-card" aria-labelledby="login-heading">
          <p className="adm-login-eyebrow">Owner Studio</p>
          <h1 id="login-heading" className="adm-login-title">
            Welcome <span>back.</span>
          </h1>
          <p className="adm-login-intro">Sign in to your admin dashboard</p>

          <form onSubmit={handleSubmit} className="adm-login-form">
            <div className="adm-field">
              <label className="adm-label" htmlFor="admin-identifier">
                Username or Email
              </label>
              <input
                id="admin-identifier"
                type="text"
                required
                autoComplete="username"
                placeholder="admin"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="adm-input"
                disabled={loading}
              />
            </div>

            <div className="adm-field">
              <label className="adm-label" htmlFor="admin-password">
                Password
              </label>
              <div className="adm-password-wrap">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="adm-input"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="adm-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="adm-alert adm-alert--error" role="alert" style={{ marginBottom: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="adm-btn-primary"
              style={{ width: '100%', paddingBlock: 11 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="adm-login-note">
            Authenticates against the Django backend (<code className="adm-code">{API_BASE}</code>) using session cookies and CSRF protection.
          </p>

          <Link href="/" className="adm-login-back">
            ← Back to Site
          </Link>
        </section>
      </main>
    </div>
  )
}
