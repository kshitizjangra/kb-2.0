'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, ArrowUpRight, X } from 'lucide-react'
import { ensureChatThread, pollChatThread, sendChatThreadMessage } from '@/lib/admin-api'
import { FALLBACK_BLOG_POSTS, fetchBlogPosts, type BlogPost } from '@/lib/blog-data'
import {
  answerLocally,
  buildKnowledge,
  rankChunks,
} from '@/lib/kamna-knowledge'
import './chat.css'

interface ChatSource {
  title: string
  url?: string
}

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
  sources?: ChatSource[]
}

const QUICK_PROMPTS = [
  'What does Kamna do?',
  'How do I get the free PDF?',
  'How do I book a 1:1?',
  'Find posts on writing',
] as const

const GREETING: ChatMsg = {
  role: 'assistant',
  text: 'Ask about Kamna: her personal branding work, 1:1 Topmate calls, the free LinkedIn headlines PDF, or blog essays.',
}

export default function ChatWithKamna() {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const isAdmin = pathname?.startsWith('/admin') ?? false
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<BlogPost[]>(FALLBACK_BLOG_POSTS)
  const [msgs, setMsgs] = useState<ChatMsg[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef<string | null>(null)
  const serverIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (isAdmin) return
    let cancelled = false
    fetchBlogPosts()
      .then((data) => {
        if (!cancelled && data.length > 0) setPosts(data)
      })
      .catch(() => {
        // Keep FALLBACK_BLOG_POSTS
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin || !open || tokenRef.current !== null) return
    let cancelled = false
    tokenRef.current = 'pending'
    ensureChatThread()
      .then(({ token, messages }) => {
        if (cancelled) return
        tokenRef.current = token
        const known = new Set<number>()
        const history: ChatMsg[] = []
        for (const m of messages) {
          known.add(m.id)
          history.push({
            role: m.sender === 'visitor' ? 'user' : 'assistant',
            text: m.sender === 'kamna' ? `Kamna: ${m.text}` : m.text,
          })
        }
        serverIdsRef.current = known
        if (history.length > 0) setMsgs(history)
      })
      .catch(() => {
        if (!cancelled) tokenRef.current = null
      })
    return () => {
      cancelled = true
    }
  }, [open, isAdmin])

  useEffect(() => {
    if (isAdmin || !open) return
    const id = window.setInterval(() => {
      const token = tokenRef.current
      if (!token || token === 'pending') return
      const after = Math.max(0, ...serverIdsRef.current)
      pollChatThread(token, after)
        .then((fresh) => {
          const unseen = fresh.filter((m) => !serverIdsRef.current.has(m.id))
          if (unseen.length === 0) return
          for (const m of unseen) serverIdsRef.current.add(m.id)
          setMsgs((prev) => [
            ...prev,
            ...unseen.map((m) => ({
              role: (m.sender === 'visitor' ? 'user' : 'assistant') as 'user' | 'assistant',
              text: m.sender === 'kamna' ? `Kamna: ${m.text}` : m.text,
            })),
          ])
        })
        .catch(() => {})
    }, 5000)
    return () => window.clearInterval(id)
  }, [open, isAdmin])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 220)
    function onWindowKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        requestAnimationFrame(() => launcherRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [msgs, open, loading])

  const knowledge = useMemo(() => buildKnowledge(posts), [posts])

  function closeDrawer() {
    setOpen(false)
    requestAnimationFrame(() => launcherRef.current?.focus())
  }

  async function send(raw?: string) {
    const text = (raw ?? input).trim()
    if (!text || loading) return

    setInput('')
    setMsgs((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    const token = tokenRef.current
    if (token && token !== 'pending') {
      sendChatThreadMessage(token, 'visitor', text)
        .then((m) => serverIdsRef.current.add(m.id))
        .catch(() => {})
    }

    const top = rankChunks(text, knowledge, 3)
    let reply: ChatMsg | null = null

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: AbortSignal.timeout(3500),
      })
      if (res.ok) {
        const data = (await res.json()) as { text?: unknown }
        if (typeof data.text === 'string' && data.text.trim()) {
          reply = {
            role: 'assistant',
            text: data.text.trim(),
            sources: top.map((c) => ({ title: c.title, url: c.url })),
          }
        }
      }
    } catch {
      // /api/chat optional — fall back cleanly to local TF-IDF answering
    }

    if (!reply) {
      const local = answerLocally(text, knowledge)
      reply = {
        role: 'assistant',
        text: local.text,
        sources: local.sources,
      }
    }

    setMsgs((prev) => [...prev, reply as ChatMsg])
    if (token && token !== 'pending' && reply) {
      sendChatThreadMessage(token, 'bot', reply.text)
        .then((m) => serverIdsRef.current.add(m.id))
        .catch(() => {})
    }
    setLoading(false)
  }

  if (isAdmin) return null

  return (
    <AnimatePresence mode="wait">
      {!open ? (
        <motion.button
          key="chat-launcher"
          ref={launcherRef}
          type="button"
          className="kamna-chat-launcher"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 6 }}
          whileTap={reduce ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setOpen(true)}
          aria-label="Ask Kamna"
          aria-haspopup="dialog"
          aria-expanded={false}
          aria-controls="kamna-chat-dialog"
        >
          <span className="kamna-chat-avatar-wrap" aria-hidden="true">
            <Image src="/kamna.jpg" alt="" fill sizes="28px" />
          </span>
          <span className="kamna-chat-launcher-label">Ask Kamna</span>
        </motion.button>
      ) : (
        <motion.div
          key="chat-drawer"
          id="kamna-chat-dialog"
          className="kamna-chat-drawer"
          role="dialog"
          aria-label="Ask Kamna assistant"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              closeDrawer()
            }
          }}
        >
      <header className="kamna-chat-header">
        <div className="kamna-chat-header-avatar">
          <Image src="/kamna.jpg" alt="Kamna Bhardwaj" fill sizes="34px" />
        </div>
        <div className="kamna-chat-header-meta">
          <p className="kamna-chat-title">Ask Kamna</p>
          <p className="kamna-chat-status">
            <span>Editorial guide</span>
          </p>
        </div>
        <button
          type="button"
          className="kamna-chat-close"
          onClick={closeDrawer}
          aria-label="Close Ask Kamna"
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      <div
        className="kamna-chat-messages"
        role="log"
        aria-label="Conversation with Kamna assistant"
        aria-live="polite"
      >
        {msgs.map((m, idx) => (
          <div
            key={idx}
            className={`kamna-chat-row ${m.role === 'user' ? 'is-user' : ''}`}
          >
            {m.role === 'assistant' ? (
              <div className="kamna-chat-msg-avatar" aria-hidden="true">
                <Image src="/kamna.jpg" alt="" fill sizes="24px" />
              </div>
            ) : null}

            <div
              className={`kamna-chat-bubble ${m.role === 'user' ? 'is-user' : ''}`}
            >
              <p>{m.text}</p>
              {m.sources && m.sources.length > 0 ? (
                <div className="kamna-chat-sources">
                  {m.sources.map((s) =>
                    s.url ? (
                      <Link
                        key={`${idx}-${s.title}`}
                        href={s.url}
                        className="kamna-chat-source-link"
                        title={s.title}
                        onClick={() => {
                          if (s.url?.startsWith('/#')) {
                            setOpen(false)
                          }
                        }}
                      >
                        <span>
                          {s.title.length > 26
                            ? `${s.title.slice(0, 26)}…`
                            : s.title}
                        </span>
                        <ArrowUpRight size={11} aria-hidden="true" />
                      </Link>
                    ) : null
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="kamna-chat-typing" role="status">
            <div className="kamna-chat-msg-avatar" aria-hidden="true">
              <Image src="/kamna.jpg" alt="" fill sizes="24px" />
            </div>
            <span>Looking through Kamna’s notes…</span>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="kamna-chat-quick" aria-label="Quick questions">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            className="kamna-chat-chip"
            onClick={() => send(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="kamna-chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about services, PDF, or essays..."
          aria-label="Ask Kamna a question"
          maxLength={500}
        />
        <button
          type="submit"
          className="kamna-chat-send"
          disabled={loading || !input.trim()}
          aria-label="Send question"
        >
          <ArrowUp size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
