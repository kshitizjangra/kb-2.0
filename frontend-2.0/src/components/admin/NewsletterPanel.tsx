'use client'

import { useEffect, useRef, useState } from 'react'
import {
  adminIssueCreate,
  adminIssueDelete,
  adminIssueGet,
  adminIssueList,
  adminIssueSend,
  adminIssueTest,
  adminIssueUpdate,
  adminNewsletterStatus,
  adminNewsletterSync,
  adminSubscriberDelete,
  adminSubscriberList,
  formatAdminDate,
  isUnauthorizedError,
  type IssueItem,
  type NewsletterStatus,
  type SubscriberItem,
} from '@/lib/admin-api'
import RichEditor from '@/components/admin/RichEditor'

interface PanelProps {
  onUnauthorized?: () => void
}

const STATUS_PILL: Record<IssueItem['status'], string> = {
  draft: 'adm-pill',
  queued: 'adm-pill adm-pill--warn',
  moderation: 'adm-pill adm-pill--warn',
  sending: 'adm-pill adm-pill--warn',
  sent: 'adm-pill adm-pill--pink',
  failed: 'adm-pill adm-pill--danger',
  review: 'adm-pill adm-pill--danger',
}

const STATUS_LABEL: Record<IssueItem['status'], string> = {
  draft: 'Draft',
  queued: 'Queued',
  moderation: 'Awaiting moderation',
  sending: 'Sending',
  sent: 'Completed',
  failed: 'Failed',
  review: 'Check SendPulse',
}

const SUBSCRIBER_LABEL: Record<SubscriberItem['status'], string> = {
  pending: 'Awaiting confirmation',
  active: 'Confirmed',
  unsubscribed: 'Unsubscribed',
  suppressed: 'Delivery blocked',
}

export default function NewsletterPanel({ onUnauthorized }: PanelProps) {
  const [subs, setSubs] = useState<SubscriberItem[]>([])
  const [issues, setIssues] = useState<IssueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'subs' | 'issues' | 'compose'>('subs')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [subject, setSubject] = useState('')
  const [editorKey, setEditorKey] = useState('')
  const [editorInitial, setEditorInitial] = useState('')
  const bodyRef = useRef('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [testFor, setTestFor] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [setup, setSetup] = useState<NewsletterStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      adminSubscriberList(),
      adminIssueList(),
      adminNewsletterStatus(),
    ]).then(
      ([s, i, status]) => {
        if (cancelled) return
        setSubs(s)
        setIssues(i)
        setSetup(status)
        setLoading(false)
      },
      (err) => {
        if (cancelled) return
        if (isUnauthorizedError(err)) {
          onUnauthorized?.()
          setError('Session expired or unauthorized. Please sign in.')
        } else {
          setError('Could not load newsletter data. Please retry.')
        }
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [onUnauthorized])

  const needsSync =
    issues.some((i) =>
      ['queued', 'moderation', 'sending', 'review'].includes(i.status)
    ) ||
    subs.some(
      (s) =>
        s.status === 'pending' ||
        (setup?.welcomeReady &&
          s.status === 'active' &&
          ['pending', 'submitting', 'failed'].includes(s.welcomeStatus))
    )

  useEffect(() => {
    if (!setup?.ready || !needsSync) return
    let cancelled = false
    let running = false
    const timer = window.setInterval(async () => {
      if (running) return
      running = true
      try {
        await adminNewsletterSync()
        const [s, i] = await Promise.all([
          adminSubscriberList(),
          adminIssueList(),
        ])
        if (!cancelled) {
          setSubs(s)
          setIssues(i)
        }
      } catch (err) {
        if (!cancelled) {
          if (isUnauthorizedError(err)) onUnauthorized?.()
          setError(
            err instanceof Error
              ? err.message
              : 'Sync failed. Use Sync & check setup to retry.'
          )
        }
      } finally {
        running = false
      }
    }, 20000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [setup?.ready, needsSync, onUnauthorized])

  async function sync() {
    if (syncing) return
    setSyncing(true)
    setError('')
    try {
      const status = await adminNewsletterStatus()
      setSetup(status)
      if (status.ready) await adminNewsletterSync()
      const [s, i] = await Promise.all([
        adminSubscriberList(),
        adminIssueList(),
      ])
      setSubs(s)
      setIssues(i)
      setNotice(
        status.ready
          ? 'Subscriber confirmations and campaign statuses refreshed.'
          : 'Setup checked. Complete the settings below to activate sending.'
      )
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError(err instanceof Error ? err.message : 'Sync failed. Please retry.')
    } finally {
      setSyncing(false)
    }
  }

  async function showPreview(issue: IssueItem) {
    try {
      const full = await adminIssueGet(issue.id)
      setPreview({ subject: full.subject, html: full.previewHtml ?? '' })
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Could not load preview. Please retry.')
    }
  }

  async function refreshIssues() {
    setIssues(await adminIssueList())
  }

  function openNew() {
    setEditingId(null)
    setSubject('')
    setEditorInitial('')
    bodyRef.current = ''
    setEditorKey(`nl-new-${Date.now()}`)
    setFormError('')
    setView('compose')
  }

  async function openEdit(issue: IssueItem) {
    try {
      const full = await adminIssueGet(issue.id)
      setEditingId(issue.id)
      setSubject(full.subject)
      setEditorInitial(full.bodyHtml ?? '')
      bodyRef.current = full.bodyHtml ?? ''
      setEditorKey(`nl-edit-${issue.id}`)
      setFormError('')
      setView('compose')
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Could not load issue. Please retry.')
    }
  }

  async function handleSave() {
    if (!subject.trim()) {
      setFormError('Subject required.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editingId === null) {
        await adminIssueCreate({
          subject: subject.trim(),
          body_html: bodyRef.current,
        })
      } else {
        await adminIssueUpdate(editingId, {
          subject: subject.trim(),
          body_html: bodyRef.current,
        })
      }
      setView('issues')
      await refreshIssues()
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this issue?')) return
    try {
      await adminIssueDelete(id)
      setIssues((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Delete failed. Please retry.')
    }
  }

  async function handleSend(issue: IssueItem) {
    if (busyId !== null) return
    if (
      !window.confirm(
        `Submit “${issue.subject}” to confirmed, deliverable subscribers? SendPulse will queue delivery. Free-plan limits are checked first.`
      )
    ) {
      return
    }
    setBusyId(issue.id)
    setError('')
    try {
      const updated = await adminIssueSend(issue.id)
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? updated : i)))
      setNotice(
        `Queued for ${updated.recipientCount} subscriber(s). Delivery may await SendPulse moderation; status refreshes automatically.`
      )
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError(err instanceof Error ? err.message : 'Send failed.')
      await refreshIssues().catch(() => {})
    } finally {
      setBusyId(null)
    }
  }

  async function handleTest(id: number) {
    if (busyId !== null) return
    setBusyId(id)
    setError('')
    try {
      const result = await adminIssueTest(id)
      setNotice(
        `Test queued for ${result.email}. Check its inbox before sending the issue.`
      )
      setTestFor(null)
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError(err instanceof Error ? err.message : 'Test send failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSubDelete(id: number) {
    if (!window.confirm('Remove this subscriber?')) return
    try {
      await adminSubscriberDelete(id)
      setSubs((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Delete failed. Please retry.')
    }
  }

  if (loading) return <p className="adm-loading">Loading…</p>

  return (
    <div>
      <div className="adm-card" style={{ marginBottom: 24 }}>
        <div
          className="adm-row-title-line"
          style={{ justifyContent: 'space-between' }}
        >
          <p className="adm-row-title" style={{ fontSize: 14 }}>
            SendPulse Free · 500 subscribers · 15,000 emails/month
          </p>
          <button
            type="button"
            onClick={sync}
            disabled={syncing || busyId !== null}
            className="adm-btn adm-btn-sm"
          >
            {syncing ? 'Syncing…' : 'Sync & check setup'}
          </button>
        </div>

        {setup?.ready ? (
          <p className="adm-small adm-muted" style={{ marginTop: 10 }}>
            Sender: {setup.senderName} &lt;{setup.senderEmail}&gt; ·{' '}
            {setup.subscribersUsed}/{setup.subscriberLimit} account subscribers ·{' '}
            {setup.emailsLeft?.toLocaleString()} emails remaining
          </p>
        ) : (
          <div className="adm-small adm-muted" style={{ marginTop: 10 }}>
            <p>
              {setup?.error ||
                'Could not check setup. Use the button above to retry.'}
            </p>
            <p style={{ marginTop: 6 }}>
              Add <code className="adm-code">SENDPULSE_CLIENT_ID</code>,{' '}
              <code className="adm-code">SENDPULSE_CLIENT_SECRET</code>,{' '}
              <code className="adm-code">SENDPULSE_LIST_ID</code>, and{' '}
              <code className="adm-code">SENDPULSE_SENDER_EMAIL</code> to the
              backend environment, restart it, and activate the sender in
              SendPulse.
            </p>
          </div>
        )}

        {setup?.ready && !setup.welcomeReady && (
          <p className="adm-alert adm-alert--warn" style={{ marginTop: 12, marginBottom: 0 }}>
            Welcome setup: {setup.welcomeError}
          </p>
        )}

        <p className="adm-small adm-faint" style={{ marginTop: 10 }}>
          Only confirmed newsletter opt-ins receive issues. PDF download emails
          are separate. SendPulse branding stays on the free plan. Tests go to
          your verified sender and count toward the four-campaigns/hour limit.
        </p>
      </div>

      <div className="adm-section-head">
        <div className="adm-btn-group">
          {(
            [
              ['subs', `Subscribers (${subs.length})`],
              ['issues', `Issues (${issues.length})`],
            ] as const
          ).map(([v, label]) => {
            const active = view === v || (v === 'issues' && view === 'compose')
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={
                  active ? 'adm-btn-primary adm-btn-sm' : 'adm-btn adm-btn-sm'
                }
              >
                {label}
              </button>
            )
          })}
        </div>
        {view === 'issues' && (
          <button type="button" onClick={openNew} className="adm-btn-primary">
            + New Issue
          </button>
        )}
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

      {preview && (
        <section className="adm-preview-box" aria-label="Newsletter preview">
          <div className="adm-preview-head">
            <h3 className="adm-row-title">{preview.subject}</h3>
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={() => setPreview(null)}
            >
              Close preview
            </button>
          </div>
          <iframe
            title={`Email preview: ${preview.subject}`}
            srcDoc={preview.html}
            sandbox=""
            className="adm-iframe"
          />
          <p className="adm-small adm-faint" style={{ marginTop: 8 }}>
            Saved draft preview. Inbox rendering and the provider footer are
            verified with Send test.
          </p>
        </section>
      )}

      {view === 'subs' &&
        (subs.length === 0 ? (
          <p className="adm-empty">No subscribers yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Since</th>
                  <th>Status</th>
                  <th className="adm-table-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>{s.email}</td>
                    <td className="adm-muted">{s.name || '—'}</td>
                    <td className="adm-muted adm-small">
                      {formatAdminDate(s.createdAt)}
                    </td>
                    <td>
                      <span
                        className={`adm-pill ${s.isActive ? 'adm-pill--pink' : ''}`}
                      >
                        {SUBSCRIBER_LABEL[s.status]}
                      </span>
                      {s.status === 'active' && (
                        <p className="adm-small adm-faint" style={{ marginTop: 4 }}>
                          Welcome: {s.welcomeStatus}
                        </p>
                      )}
                    </td>
                    <td className="adm-table-right">
                      <button
                        type="button"
                        onClick={() => handleSubDelete(s.id)}
                        className="adm-btn-danger adm-btn-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {view === 'issues' &&
        (issues.length === 0 ? (
          <p className="adm-empty">No issues yet. Compose the first one.</p>
        ) : (
          <div className="adm-list">
            {issues.map((issue) => (
              <div key={issue.id}>
                <div className="adm-row">
                  <div className="adm-row-main">
                    <div className="adm-row-title-line">
                      <p className="adm-row-title">{issue.subject}</p>
                      <span className={STATUS_PILL[issue.status]}>
                        {STATUS_LABEL[issue.status]}
                      </span>
                    </div>
                    <p className="adm-row-meta adm-mono">
                      {issue.status === 'sent'
                        ? `Sent to ${issue.recipientCount} · ${issue.sentAt ?? ''}`
                        : `Created ${issue.createdAt ?? ''}`}
                    </p>
                    {issue.lastError && (
                      <p className="adm-small" style={{ color: '#f4a499', marginTop: 6 }}>
                        {issue.lastError}
                      </p>
                    )}
                    {issue.status === 'sent' && (
                      <p className="adm-small adm-muted" style={{ marginTop: 6 }}>
                        Delivered {issue.deliveredCount} · Opened{' '}
                        {issue.openedCount} · Clicked {issue.clickedCount} ·
                        Bounced {issue.bouncedCount}
                      </p>
                    )}
                  </div>
                  <div className="adm-btn-group">
                    <button
                      type="button"
                      onClick={() => showPreview(issue)}
                      className="adm-btn adm-btn-sm"
                    >
                      Preview
                    </button>
                    {(issue.status === 'draft' ||
                      (issue.status === 'failed' && !issue.providerCampaignId)) && (
                      <>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => openEdit(issue)}
                          className="adm-btn adm-btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={!setup?.ready || busyId !== null}
                          onClick={() =>
                            setTestFor(testFor === issue.id ? null : issue.id)
                          }
                          className="adm-btn adm-btn-sm"
                        >
                          Test
                        </button>
                        <button
                          type="button"
                          disabled={!setup?.ready || busyId !== null}
                          onClick={() => handleSend(issue)}
                          className="adm-btn-primary adm-btn-sm"
                        >
                          {busyId === issue.id ? 'Submitting…' : 'Send'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => handleDelete(issue.id)}
                          className="adm-btn-danger adm-btn-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {testFor === issue.id && (
                  <div
                    className="adm-card"
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <p className="adm-small adm-muted">
                      Test recipient: {setup?.senderEmail}. Sending a test does
                      not publish the issue.
                    </p>
                    <button
                      type="button"
                      disabled={busyId !== null || !setup?.ready}
                      onClick={() => handleTest(issue.id)}
                      className="adm-btn-primary adm-btn-sm"
                    >
                      {busyId === issue.id ? 'Submitting…' : 'Send test'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

      {view === 'compose' && (
        <div>
          <div className="adm-section-head">
            <h2 className="adm-section-title">
              {editingId === null ? 'New Issue' : 'Edit Issue'}
            </h2>
            <div className="adm-btn-group">
              <button
                type="button"
                onClick={() => setView('issues')}
                className="adm-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="adm-btn-primary"
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
            </div>
          </div>

          {formError && (
            <p className="adm-alert adm-alert--error" role="alert">
              {formError}
            </p>
          )}

          <div className="adm-stack">
            <div className="adm-field">
              <label className="adm-label" htmlFor="nl-subject">
                Subject
              </label>
              <input
                id="nl-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="One honest lesson from this week"
                className="adm-input"
              />
            </div>
            <div className="adm-field">
              <span className="adm-label">Body</span>
              <RichEditor
                key={editorKey}
                initialValue={editorInitial}
                onContentChange={(content) => {
                  bodyRef.current = content
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
