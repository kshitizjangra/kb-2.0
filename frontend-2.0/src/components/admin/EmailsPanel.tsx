'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  adminEmailsList,
  exportEmailsCSV,
  formatAdminDate,
  isUnauthorizedError,
  type EmailItem,
} from '@/lib/admin-api'

interface PanelProps {
  onUnauthorized?: () => void
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="adm-stat">
      <p className="adm-stat-label">{label}</p>
      <p className="adm-stat-value">{value}</p>
    </div>
  )
}

export default function EmailsPanel({ onUnauthorized }: PanelProps) {
  const [rows, setRows] = useState<(EmailItem & { ts: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    adminEmailsList()
      .then((emails) => {
        if (cancelled) return
        setRows(
          emails.map((r) => ({
            ...r,
            ts: r.createdAt
              ? Date.parse(r.createdAt.replace(' ', 'T') + 'Z')
              : Number.NaN,
          }))
        )
      })
      .catch((err) => {
        if (cancelled) return
        if (isUnauthorizedError(err)) {
          onUnauthorized?.()
          setError('Session expired or unauthorized. Please sign in.')
        } else {
          setError('Could not load emails. Please retry.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onUnauthorized])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.ip ?? '').toLowerCase().includes(q)
    )
  }, [rows, query])

  const stats = useMemo(() => {
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const recent = rows.filter((r) => !isNaN(r.ts) && r.ts >= weekAgo).length
    const latest = rows.length > 0 ? rows[0].createdAt : null
    return { total: rows.length, recent, latest: formatAdminDate(latest) }
  }, [rows, now])

  return (
    <div>
      <div className="adm-section-head">
        <h2 className="adm-section-title">
          Emails <span className="adm-count">({stats.total})</span>
        </h2>
        <button
          type="button"
          onClick={() => exportEmailsCSV(filtered)}
          disabled={filtered.length === 0}
          className="adm-btn"
        >
          Export CSV
        </button>
      </div>

      <div className="adm-stats">
        <StatCard label="Total Emails" value={String(stats.total)} />
        <StatCard label="Last 7 Days" value={String(stats.recent)} />
        <StatCard label="Latest Signup" value={stats.latest} />
      </div>

      <div className="adm-search-wrap">
        <input
          type="search"
          aria-label="Search emails by email or IP"
          placeholder="Search by email or IP…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          suppressHydrationWarning
          className="adm-input"
        />
      </div>

      {loading ? (
        <p className="adm-loading">Loading…</p>
      ) : error ? (
        <p className="adm-alert adm-alert--error" role="alert">{error}</p>
      ) : rows.length === 0 ? (
        <p className="adm-empty">No emails collected yet.</p>
      ) : filtered.length === 0 ? (
        <p className="adm-empty">No emails match “{query}”.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Email</th>
                <th>IP</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id}>
                  <td className="adm-faint">{i + 1}</td>
                  <td title={row.userAgent ?? ''}>{row.email}</td>
                  <td className="adm-mono adm-muted">{row.ip ?? '—'}</td>
                  <td className="adm-muted adm-small">
                    {formatAdminDate(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <p className="adm-table-foot">
          Showing {filtered.length} of {rows.length} emails
        </p>
      )}
    </div>
  )
}
