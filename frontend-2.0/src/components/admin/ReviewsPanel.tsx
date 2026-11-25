'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_TOPMATE_SETTINGS,
  adminSiteSettingsUpdate,
  adminTestimonialCreate,
  adminTestimonialDelete,
  adminTestimonialUpdate,
  adminTestimonialsList,
  isUnauthorizedError,
  type Testimonial,
  type TopmateSettings,
} from '@/lib/admin-api'

interface PanelProps {
  onUnauthorized?: () => void
}

export default function ReviewsPanel({ onUnauthorized }: PanelProps) {
  const [rows, setRows] = useState<Testimonial[]>([])
  const [settings, setSettings] = useState<TopmateSettings>(
    DEFAULT_TOPMATE_SETTINGS
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingCounts, setSavingCounts] = useState(false)

  // New-review form
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editText, setEditText] = useState('')

  useEffect(() => {
    let cancelled = false
    adminTestimonialsList()
      .then((d) => {
        if (cancelled) return
        setRows(d.testimonials)
        setSettings(d.settings)
      })
      .catch((err) => {
        if (cancelled) return
        if (isUnauthorizedError(err)) {
          onUnauthorized?.()
          setError('Session expired or unauthorized. Please sign in.')
        } else {
          setError('Could not load reviews. Please retry.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onUnauthorized])

  function flash(msg: string) {
    setNotice(msg)
    window.setTimeout(() => setNotice(''), 3000)
  }

  async function handleSaveCounts() {
    setSavingCounts(true)
    setError('')
    try {
      const updated = await adminSiteSettingsUpdate(settings)
      setSettings(updated)
      flash('Counts saved — live on site.')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Could not save counts. Please retry.')
    } finally {
      setSavingCounts(false)
    }
  }

  async function handleAdd() {
    if (!name.trim() || !text.trim()) {
      setError('Name and review text are required.')
      return
    }
    setAdding(true)
    setError('')
    try {
      const created = await adminTestimonialCreate({
        name: name.trim(),
        date: date.trim(),
        text: text.trim(),
        sort_order: 0,
      })
      setRows((prev) => [created, ...prev])
      setName('')
      setDate('')
      setText('')
      flash('Review added — live on site.')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError(err instanceof Error ? err.message : 'Add failed. Please retry.')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(row: Testimonial) {
    setEditingId(row.id)
    setEditName(row.name)
    setEditDate(row.date)
    setEditText(row.text)
  }

  async function handleEditSave(id: number) {
    setError('')
    try {
      const updated = await adminTestimonialUpdate(id, {
        name: editName.trim(),
        date: editDate.trim(),
        text: editText.trim(),
      })
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      setEditingId(null)
      flash('Review updated.')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function handleToggle(id: number, isVisible: boolean) {
    setError('')
    try {
      const updated = await adminTestimonialUpdate(id, {
        is_visible: !isVisible,
      })
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Toggle failed. Please retry.')
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this review?')) return
    try {
      await adminTestimonialDelete(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Delete failed. Please retry.')
    }
  }

  return (
    <div>
      <div className="adm-section-head">
        <h2 className="adm-section-title">
          Reviews <span className="adm-count">({rows.length})</span>
        </h2>
      </div>

      {notice && (
        <p className="adm-alert adm-alert--notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="adm-alert adm-alert--error" role="alert">
          {error}
        </p>
      )}

      <section className="adm-card" style={{ marginBottom: 24 }}>
        <p className="adm-label">Topmate counts on site</p>
        <p className="adm-small adm-faint" style={{ marginBottom: 16 }}>
          When a new rating lands on{' '}
          <a
            href="https://topmate.io/kamna_bhardwaj"
            target="_blank"
            rel="noopener noreferrer"
            className="adm-link"
          >
            Topmate
          </a>
          , bump these numbers — no code change needed.
        </p>
        <div className="adm-grid-3">
          <label className="adm-field">
            <span className="adm-label">Ratings count</span>
            <input
              value={settings.topmate_ratings_count}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  topmate_ratings_count: e.target.value,
                })
              }
              className="adm-input"
            />
          </label>
          <label className="adm-field">
            <span className="adm-label">Reviews count</span>
            <input
              value={settings.topmate_testimonials_count}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  topmate_testimonials_count: e.target.value,
                })
              }
              className="adm-input"
            />
          </label>
          <label className="adm-field">
            <span className="adm-label">Topmate URL</span>
            <input
              value={settings.topmate_url}
              onChange={(e) =>
                setSettings({ ...settings, topmate_url: e.target.value })
              }
              className="adm-input"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleSaveCounts}
          disabled={savingCounts}
          className="adm-btn-primary"
          style={{ marginTop: 16 }}
        >
          {savingCounts ? 'Saving…' : 'Save counts'}
        </button>
      </section>

      <section className="adm-card" style={{ marginBottom: 24 }}>
        <p className="adm-label">Add review from Topmate</p>
        <p className="adm-small adm-faint" style={{ marginBottom: 16 }}>
          Copy name + text from Topmate, paste here. Date like “Sep 2026”.
        </p>
        <div className="adm-stack">
          <div className="adm-grid-2">
            <input
              aria-label="Reviewer name"
              placeholder="Name (e.g. Samiksha Mishra)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="adm-input"
            />
            <input
              aria-label="Review date"
              placeholder="Date (e.g. Sep 2026)"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="adm-input"
            />
          </div>
          <textarea
            aria-label="Review text"
            placeholder="Review text…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="adm-textarea"
          />
          <div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="adm-btn-primary"
            >
              {adding ? 'Adding…' : 'Add review'}
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="adm-loading">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="adm-empty">No reviews yet.</p>
      ) : (
        <div className="adm-list">
          {rows.map((row, i) => (
            <article
              key={row.id}
              className={`adm-card ${row.isVisible ? '' : 'adm-card--muted'}`}
            >
              {editingId === row.id ? (
                <div className="adm-stack">
                  <div className="adm-grid-2">
                    <input
                      aria-label="Edit reviewer name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="adm-input"
                    />
                    <input
                      aria-label="Edit review date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="adm-input"
                    />
                  </div>
                  <textarea
                    aria-label="Edit review text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="adm-textarea"
                  />
                  <div className="adm-btn-group">
                    <button
                      type="button"
                      onClick={() => handleEditSave(row.id)}
                      className="adm-btn-primary adm-btn-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="adm-btn adm-btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    className="adm-row-title-line"
                    style={{ justifyContent: 'space-between' }}
                  >
                    <div>
                      <div className="adm-row-title-line">
                        <p className="adm-row-title">
                          <span className="adm-faint" style={{ marginRight: 8 }}>
                            {i + 1}.
                          </span>
                          {row.name}
                        </p>
                        {!row.isVisible && (
                          <span className="adm-pill">Hidden</span>
                        )}
                      </div>
                      <p className="adm-row-meta">{row.date || '—'}</p>
                    </div>
                    <div className="adm-btn-group">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="adm-btn adm-btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(row.id, row.isVisible)}
                        className="adm-btn adm-btn-sm"
                      >
                        {row.isVisible ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="adm-btn-danger adm-btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="adm-row-body">{row.text}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
