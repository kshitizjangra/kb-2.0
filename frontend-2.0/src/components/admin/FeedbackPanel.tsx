'use client'

import { useEffect, useState } from 'react'
import {
  adminFeedbackDelete,
  adminFeedbackList,
  formatAdminDate,
  isUnauthorizedError,
  type FeedbackItem,
} from '@/lib/admin-api'

interface PanelProps {
  onUnauthorized?: () => void
}

export default function FeedbackPanel({ onUnauthorized }: PanelProps) {
  const [rows, setRows] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    adminFeedbackList()
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((err) => {
        if (cancelled) return
        if (isUnauthorizedError(err)) {
          onUnauthorized?.()
          setError('Session expired or unauthorized. Please sign in.')
        } else {
          setError('Could not load feedback. Please retry.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onUnauthorized])

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this feedback?')) return
    setError('')
    try {
      await adminFeedbackDelete(id)
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
          Feedback <span className="adm-count">({rows.length})</span>
        </h2>
      </div>

      {loading ? (
        <p className="adm-loading">Loading…</p>
      ) : error ? (
        <p className="adm-alert adm-alert--error" role="alert">{error}</p>
      ) : rows.length === 0 ? (
        <p className="adm-empty">No feedback yet.</p>
      ) : (
        <div className="adm-list">
          {rows.map((row) => (
            <article key={row.id} className="adm-card">
              <div className="adm-row-title-line" style={{ justifyContent: 'space-between' }}>
                <div>
                  <p className="adm-row-title">{row.name}</p>
                  <p className="adm-row-meta">
                    {row.email} · {formatAdminDate(row.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(row.id)}
                  className="adm-btn-danger adm-btn-sm"
                >
                  Delete
                </button>
              </div>
              <p className="adm-row-body">{row.message}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
