'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adminChatDelete,
  adminChatDetail,
  adminChatReply,
  adminChatThreads,
  formatAdminDate,
  isUnauthorizedError,
  type ChatMessage,
  type ChatThread,
} from '@/lib/admin-api'

interface PanelProps {
  onUnauthorized?: () => void
}

export default function ChatPanel({ onUnauthorized }: PanelProps) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(() => {
    adminChatThreads()
      .then(setThreads)
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          onUnauthorized?.()
          setError('Session expired or unauthorized. Please sign in.')
        } else {
          setError('Could not load chats. Is the backend running?')
        }
      })
      .finally(() => setLoading(false))
  }, [onUnauthorized])

  useEffect(() => {
    loadThreads()
    const id = window.setInterval(loadThreads, 8000)
    return () => window.clearInterval(id)
  }, [loadThreads])

  const loadThread = useCallback(
    (token: string) => {
      setThreadLoading(true)
      adminChatDetail(token)
        .then(({ messages: msgs }) => {
          setMessages(msgs)
          setThreads((prev) =>
            prev.map((t) => (t.token === token ? { ...t, hasUnread: false } : t))
          )
        })
        .catch((err) => {
          if (isUnauthorizedError(err)) onUnauthorized?.()
          setError('Could not open chat. Please retry.')
        })
        .finally(() => setThreadLoading(false))
    },
    [onUnauthorized]
  )

  useEffect(() => {
    if (!active) return
    const t = window.setTimeout(() => loadThread(active), 0)
    const id = window.setInterval(() => loadThread(active), 5000)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(id)
    }
  }, [active, loadThread])

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [messages])

  async function handleReply() {
    const text = draft.trim()
    if (!text || !active || sending) return
    setDraft('')
    setSending(true)
    try {
      const msg = await adminChatReply(active, text)
      setMessages((prev) => [...prev, msg])
      loadThreads()
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Reply failed. Please retry.')
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(token: string) {
    if (!window.confirm('Delete this whole conversation?')) return
    try {
      await adminChatDelete(token)
      setThreads((prev) => prev.filter((t) => t.token !== token))
      if (active === token) {
        setActive(null)
        setMessages([])
      }
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Delete failed. Please retry.')
    }
  }

  const unreadCount = threads.filter((t) => t.hasUnread).length

  return (
    <div>
      <div className="adm-section-head">
        <h2 className="adm-section-title">
          Live Chat{' '}
          <span className="adm-count">
            ({threads.length}
            {unreadCount > 0 ? ` · ${unreadCount} new` : ''})
          </span>
        </h2>
      </div>

      {loading ? (
        <p className="adm-loading">Loading…</p>
      ) : error && threads.length === 0 ? (
        <p className="adm-alert adm-alert--error" role="alert">
          {error}
        </p>
      ) : threads.length === 0 ? (
        <p className="adm-empty">
          No conversations yet. Chats from the Ask Kamna widget appear here.
        </p>
      ) : (
        <div className="adm-chat-grid">
          <div className="adm-chat-threads">
            {threads.map((t) => (
              <div
                key={t.token}
                className={`adm-chat-thread ${active === t.token ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setActive(t.token)}
                  className="adm-chat-thread-btn"
                >
                  <p className="adm-chat-thread-name">
                    {t.hasUnread && (
                      <span className="adm-chat-dot" aria-label="Unread" />
                    )}
                    <span>{t.label || t.token.slice(0, 8)}</span>
                  </p>
                  <p className="adm-chat-thread-preview">
                    {t.lastMessage?.text ?? '—'}
                  </p>
                  <p className="adm-chat-thread-date">
                    {formatAdminDate(t.updatedAt)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.token)}
                  className="adm-chat-thread-del"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="adm-chat-pane">
            {!active ? (
              <p className="adm-chat-placeholder">
                Pick a conversation to read and reply as Kamna.
              </p>
            ) : (
              <>
                <div className="adm-chat-messages">
                  {threadLoading && messages.length === 0 ? (
                    <p className="adm-loading">Loading…</p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`adm-chat-msg ${
                          m.sender === 'kamna'
                            ? 'adm-chat-msg--kamna'
                            : m.sender === 'bot'
                              ? 'adm-chat-msg--bot'
                              : ''
                        }`}
                      >
                        <p className="adm-chat-msg-sender">
                          {m.sender === 'visitor'
                            ? 'Visitor'
                            : m.sender === 'kamna'
                              ? 'Kamna (you)'
                              : 'Bot'}
                        </p>
                        {m.text}
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleReply()
                  }}
                  className="adm-chat-compose"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Reply as Kamna…"
                    aria-label="Reply as Kamna"
                    maxLength={2000}
                    className="adm-input"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="adm-btn-primary"
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {error && threads.length > 0 && (
        <p className="adm-alert adm-alert--error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}
    </div>
  )
}
