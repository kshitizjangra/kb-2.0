'use client'

import { useEffect, useState } from 'react'
import {
  adminLinkedinCreate,
  adminLinkedinDelete,
  adminLinkedinUpdate,
  adminReelCreate,
  adminReelDelete,
  adminReelUpdate,
  adminSocialList,
  isUnauthorizedError,
  linkedinPostUrl,
  type LinkedInItem,
  type ReelItem,
} from '@/lib/admin-api'

interface PanelProps {
  onUnauthorized?: () => void
}

export default function SocialPanel({ onUnauthorized }: PanelProps) {
  const [linkedin, setLinkedin] = useState<LinkedInItem[]>([])
  const [reels, setReels] = useState<ReelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newUrn, setNewUrn] = useState('')
  const [newReelUrl, setNewReelUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingLinkedinId, setEditingLinkedinId] = useState<number | null>(null)
  const [editLinkedinValue, setEditLinkedinValue] = useState('')
  const [editingReelId, setEditingReelId] = useState<number | null>(null)
  const [editReelValue, setEditReelValue] = useState('')

  useEffect(() => {
    let cancelled = false
    adminSocialList().then(
      (data) => {
        if (!cancelled) {
          setLinkedin(data.linkedin)
          setReels(data.instagram)
          setLoading(false)
        }
      },
      (err) => {
        if (!cancelled) {
          if (isUnauthorizedError(err)) {
            onUnauthorized?.()
            setError('Session expired or unauthorized. Please sign in.')
          } else {
            setError('Could not load social posts. Please retry.')
          }
          setLoading(false)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [onUnauthorized])

  async function handleAddLinkedin() {
    if (!newUrn.trim()) return
    setSaving(true)
    setFormError('')
    try {
      const data = await adminLinkedinCreate({
        urn: newUrn.trim(),
        position: linkedin.length,
      })
      setLinkedin((prev) => [...prev, data.post])
      setNewUrn('')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setFormError(err instanceof Error ? err.message : 'Add failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddReel() {
    if (!newReelUrl.trim()) return
    setSaving(true)
    setFormError('')
    try {
      const data = await adminReelCreate({
        url: newReelUrl.trim(),
        position: reels.length,
      })
      setReels((prev) => [...prev, data.reel])
      setNewReelUrl('')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setFormError(err instanceof Error ? err.message : 'Add failed.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleLinkedin(row: LinkedInItem) {
    try {
      const data = await adminLinkedinUpdate(row.id, {
        is_active: !row.isActive,
      })
      setLinkedin((prev) =>
        prev.map((r) => (r.id === row.id ? data.post : r))
      )
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Update failed. Please retry.')
    }
  }

  async function toggleReel(row: ReelItem) {
    try {
      const data = await adminReelUpdate(row.id, { is_active: !row.isActive })
      setReels((prev) => prev.map((r) => (r.id === row.id ? data.reel : r)))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Update failed. Please retry.')
    }
  }

  async function saveReplaceLinkedin(row: LinkedInItem, raw?: string) {
    const value = (raw ?? editLinkedinValue).trim()
    if (!value) return
    setSaving(true)
    setFormError('')
    try {
      const data = await adminLinkedinUpdate(row.id, { urn: value })
      setLinkedin((prev) =>
        prev.map((r) => (r.id === row.id ? data.post : r))
      )
      setEditingLinkedinId(null)
      setEditLinkedinValue('')
      setNotice('LinkedIn Post updated.')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setFormError(err instanceof Error ? err.message : 'Replace failed.')
    } finally {
      setSaving(false)
    }
  }

  async function saveReplaceReel(row: ReelItem, raw?: string) {
    const value = (raw ?? editReelValue).trim()
    if (!value) return
    setSaving(true)
    setFormError('')
    try {
      const data = await adminReelUpdate(row.id, { url: value })
      setReels((prev) => prev.map((r) => (r.id === row.id ? data.reel : r)))
      setEditingReelId(null)
      setEditReelValue('')
      setNotice('Reel updated.')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setFormError(err instanceof Error ? err.message : 'Replace failed.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLinkedin(row: LinkedInItem) {
    if (!window.confirm('Remove this LinkedIn post?')) return
    try {
      await adminLinkedinDelete(row.id)
      setLinkedin((prev) => prev.filter((r) => r.id !== row.id))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Delete failed. Please retry.')
    }
  }

  async function deleteReel(row: ReelItem) {
    if (!window.confirm('Remove this reel?')) return
    try {
      await adminReelDelete(row.id)
      setReels((prev) => prev.filter((r) => r.id !== row.id))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Delete failed. Please retry.')
    }
  }

  if (loading) {
    return <p className="adm-loading">Loading…</p>
  }

  return (
    <div className="adm-stack-lg">
      {error && (
        <p className="adm-alert adm-alert--error" role="alert" style={{ marginBottom: 0 }}>
          {error}
        </p>
      )}
      {formError && (
        <p className="adm-alert adm-alert--error" role="alert" style={{ marginBottom: 0 }}>
          {formError}
        </p>
      )}
      {notice && (
        <p className="adm-alert adm-alert--notice" role="status" style={{ marginBottom: 0 }}>
          {notice}
        </p>
      )}

      <section>
        <h2 className="adm-section-title" style={{ marginBottom: 16 }}>
          LinkedIn Posts{' '}
          <span className="adm-count">({linkedin.length})</span>
        </h2>

        <div className="adm-field" style={{ marginBottom: 16 }}>
          <label className="adm-label" htmlFor="social-urn">
            Post link — paste the LinkedIn post link, embed code, or URN
          </label>
          <div className="adm-inline-row">
            <input
              id="social-urn"
              type="text"
              value={newUrn}
              onChange={(e) => setNewUrn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddLinkedin()
                }
              }}
              placeholder="Paste LinkedIn post link or embed code"
              className="adm-input adm-input--mono"
            />
            <button
              type="button"
              onClick={handleAddLinkedin}
              disabled={saving || !newUrn.trim()}
              className="adm-btn-primary"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="adm-list">
          {linkedin.length === 0 && (
            <p className="adm-empty">No LinkedIn posts yet.</p>
          )}
          {linkedin.map((row, i) => (
            <div key={row.id} className="adm-card">
              <div
                className="adm-row-title-line"
                style={{ justifyContent: 'space-between' }}
              >
                <div className="adm-row-main">
                  <div className="adm-row-title-line">
                    <p className="adm-row-title">LinkedIn Post {i + 1}</p>
                    <span
                      className={`adm-pill ${row.isActive ? 'adm-pill--pink' : ''}`}
                    >
                      {row.isActive ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <a
                    href={linkedinPostUrl(row.urn)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adm-link adm-small"
                    style={{ display: 'inline-block', marginTop: 4 }}
                  >
                    View post ↗
                  </a>
                </div>
                <div className="adm-btn-group">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLinkedinId(row.id)
                      setEditLinkedinValue(row.urn)
                      setFormError('')
                      setNotice('')
                    }}
                    className="adm-btn adm-btn-sm"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLinkedin(row)}
                    className="adm-btn adm-btn-sm"
                  >
                    {row.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLinkedin(row)}
                    className="adm-btn-danger adm-btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingLinkedinId === row.id && (
                <div className="adm-inline-row" style={{ marginTop: 12 }}>
                  <input
                    type="text"
                    autoFocus
                    aria-label="Replacement LinkedIn post link or URN"
                    value={editLinkedinValue}
                    onChange={(e) => setEditLinkedinValue(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pasted = e.clipboardData.getData('text').trim()
                      if (pasted) void saveReplaceLinkedin(row, pasted)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void saveReplaceLinkedin(row)
                      } else if (e.key === 'Escape') {
                        setEditingLinkedinId(null)
                      }
                    }}
                    placeholder="Paste the new post link — saves instantly"
                    className="adm-input adm-input--mono"
                  />
                  <div className="adm-btn-group">
                    <button
                      type="button"
                      onClick={() => saveReplaceLinkedin(row)}
                      disabled={saving || !editLinkedinValue.trim()}
                      className="adm-btn-primary adm-btn-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLinkedinId(null)}
                      className="adm-btn adm-btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="adm-section-title" style={{ marginBottom: 16 }}>
          Instagram Reels{' '}
          <span className="adm-count">({reels.length})</span>
        </h2>

        <div className="adm-field" style={{ marginBottom: 16 }}>
          <label className="adm-label" htmlFor="social-reel">
            Reel URL — paste full link or code
          </label>
          <div className="adm-inline-row">
            <input
              id="social-reel"
              type="text"
              value={newReelUrl}
              onChange={(e) => setNewReelUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddReel()
                }
              }}
              placeholder="https://www.instagram.com/reel/XXXX/"
              className="adm-input adm-input--mono"
            />
            <button
              type="button"
              onClick={handleAddReel}
              disabled={saving || !newReelUrl.trim()}
              className="adm-btn-primary"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="adm-list">
          {reels.length === 0 && <p className="adm-empty">No reels yet.</p>}
          {reels.map((row, i) => (
            <div key={row.id} className="adm-card">
              <div
                className="adm-row-title-line"
                style={{ justifyContent: 'space-between' }}
              >
                <div className="adm-row-main">
                  <div className="adm-row-title-line">
                    <p className="adm-row-title">Reel {i + 1}</p>
                    <span
                      className={`adm-pill ${row.isActive ? 'adm-pill--pink' : ''}`}
                    >
                      {row.isActive ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adm-link adm-small"
                    style={{ display: 'inline-block', marginTop: 4 }}
                  >
                    View reel ↗
                  </a>
                </div>
                <div className="adm-btn-group">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReelId(row.id)
                      setEditReelValue(row.url)
                      setFormError('')
                      setNotice('')
                    }}
                    className="adm-btn adm-btn-sm"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleReel(row)}
                    className="adm-btn adm-btn-sm"
                  >
                    {row.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteReel(row)}
                    className="adm-btn-danger adm-btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingReelId === row.id && (
                <div className="adm-inline-row" style={{ marginTop: 12 }}>
                  <input
                    type="text"
                    autoFocus
                    aria-label="Replacement Instagram reel URL"
                    value={editReelValue}
                    onChange={(e) => setEditReelValue(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pasted = e.clipboardData.getData('text').trim()
                      if (pasted) void saveReplaceReel(row, pasted)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void saveReplaceReel(row)
                      } else if (e.key === 'Escape') {
                        setEditingReelId(null)
                      }
                    }}
                    placeholder="Paste the new reel link — saves instantly"
                    className="adm-input adm-input--mono"
                  />
                  <div className="adm-btn-group">
                    <button
                      type="button"
                      onClick={() => saveReplaceReel(row)}
                      disabled={saving || !editReelValue.trim()}
                      className="adm-btn-primary adm-btn-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingReelId(null)}
                      className="adm-btn adm-btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
