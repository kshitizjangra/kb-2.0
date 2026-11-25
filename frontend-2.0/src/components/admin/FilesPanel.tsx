'use client'

import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '@/lib/api'
import {
  adminLeadMagnetGet,
  adminLeadMagnetUpload,
  isUnauthorizedError,
  type LeadMagnetInfo,
} from '@/lib/admin-api'

interface PanelProps {
  onUnauthorized?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function FilesPanel({ onUnauthorized }: PanelProps) {
  const [info, setInfo] = useState<LeadMagnetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    adminLeadMagnetGet()
      .then((data) => {
        if (cancelled) return
        setInfo(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (isUnauthorizedError(err)) {
          onUnauthorized?.()
          setMessage('Session expired or unauthorized. Please sign in.')
        } else {
          setMessage('Could not load file info. Please retry.')
        }
        setIsError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onUnauthorized])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setMessage('')
    setIsError(false)
    try {
      const data = await adminLeadMagnetUpload(file)
      setInfo(data)
      const shown = data.uploaded_name || data.filename || file.name
      setMessage(`Updated — ${shown} is now live.`)
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setMessage(err instanceof Error ? err.message : 'Upload failed.')
      setIsError(true)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="adm-section-head">
        <h2 className="adm-section-title">Files</h2>
      </div>

      {loading ? (
        <p className="adm-loading">Loading…</p>
      ) : (
        <div className="adm-card">
          <p className="adm-label">Lead magnet PDF (email-gated download)</p>

          {info?.exists ? (
            <div className="adm-row-title-line" style={{ marginTop: 10 }}>
              <p className="adm-mono" style={{ fontSize: 14 }}>
                {info.filename}
              </p>
              <p className="adm-small adm-muted">
                {info.size != null ? formatBytes(info.size) : ''} · Updated{' '}
                {info.updatedAt ?? '—'}
              </p>
            </div>
          ) : (
            <p className="adm-alert adm-alert--error" style={{ marginTop: 12 }}>
              No file uploaded yet.
            </p>
          )}

          <div style={{ marginTop: 20 }}>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="adm-hidden-input"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="adm-btn-primary"
            >
              {uploading ? 'Uploading…' : 'Upload new PDF'}
            </button>
            <p className="adm-small adm-faint" style={{ marginTop: 10 }}>
              PDF only, max 25 MB. Saved to the database and live on the next
              request — no rebuild needed.
            </p>
          </div>

          {message && (
            <p
              className={`adm-alert ${isError ? 'adm-alert--error' : 'adm-alert--notice'}`}
              style={{ marginTop: 16, marginBottom: 0 }}
              role={isError ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}

          <p className="adm-small adm-faint" style={{ marginTop: 16 }}>
            Direct link (requires email token):{' '}
            <span className="adm-mono">{`${API_BASE}/api/download?token=…`}</span>
          </p>
        </div>
      )}
    </div>
  )
}
