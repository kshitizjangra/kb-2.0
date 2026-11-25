'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LANG_LABELS,
  TRANS_LANGS,
  adminBlogCoverUpload,
  adminBlogCreate,
  adminBlogDelete,
  adminBlogList,
  adminBlogTranslationDelete,
  adminBlogTranslationSave,
  adminBlogTranslations,
  adminBlogUpdate,
  formatBlogDate,
  isUnauthorizedError,
  type BlogInput,
  type BlogPost,
  type BlogTranslation,
  type TranslationLang,
} from '@/lib/admin-api'
import RichEditor from '@/components/admin/RichEditor'

interface PanelProps {
  onUnauthorized?: () => void
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 300)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

interface FormState {
  title: string
  slug: string
  slugTouched: boolean
  excerpt: string
  body: string
  cover: string
  date: string
  published: boolean
}

const emptyForm = (): FormState => ({
  title: '',
  slug: '',
  slugTouched: false,
  excerpt: '',
  body: '',
  cover: '',
  date: todayISO(),
  published: false,
})

function formFromPost(post: BlogPost): FormState {
  return {
    title: post.title,
    slug: post.slug,
    slugTouched: true,
    excerpt: post.excerpt,
    body: post.bodyHtml ?? '',
    cover: post.coverImage,
    date: (post.publishedAt ?? todayISO()).slice(0, 10),
    published: post.isPublished ?? true,
  }
}

export default function BlogPanel({ onUnauthorized }: PanelProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<BlogPost | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editorKey, setEditorKey] = useState('')
  const bodyRef = useRef('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const coverFileRef = useRef<HTMLInputElement | null>(null)

  const [trLang, setTrLang] = useState<TranslationLang>('hi')
  const [trList, setTrList] = useState<BlogTranslation[]>([])
  const [trTitle, setTrTitle] = useState('')
  const [trExcerpt, setTrExcerpt] = useState('')
  const [trEditorKey, setTrEditorKey] = useState('')
  const trBodyRef = useRef('')
  const [trSaving, setTrSaving] = useState(false)
  const [trError, setTrError] = useState('')

  async function refresh() {
    try {
      setPosts(await adminBlogList())
    } catch (err) {
      if (isUnauthorizedError(err)) {
        onUnauthorized?.()
        setError('Session expired or unauthorized. Please sign in.')
      } else {
        setError('Could not load posts. Please retry.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    adminBlogList().then(
      (data) => {
        if (!cancelled) {
          setPosts(data)
          setLoading(false)
        }
      },
      (err) => {
        if (!cancelled) {
          if (isUnauthorizedError(err)) {
            onUnauthorized?.()
            setError('Session expired or unauthorized. Please sign in.')
          } else {
            setError('Could not load posts. Please retry.')
          }
          setLoading(false)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [onUnauthorized])

  function openNew() {
    setForm(emptyForm())
    bodyRef.current = ''
    setEditorKey(`new-${Date.now()}`)
    setFormError('')
    setCoverError('')
    setTrList([])
    setTrTitle('')
    setTrExcerpt('')
    trBodyRef.current = ''
    setTrLang('hi')
    setTrError('')
    setEditing('new')
  }

  function loadTranslations(slug: string, lang: TranslationLang) {
    adminBlogTranslations(slug).then(
      (list) => {
        setTrList(list)
        const found = list.find((t) => t.lang === lang)
        setTrTitle(found?.title ?? '')
        setTrExcerpt(found?.excerpt ?? '')
        trBodyRef.current = found?.bodyHtml ?? ''
        setTrEditorKey(`tr-${slug}-${lang}-${Date.now()}`)
      },
      (err) => {
        if (isUnauthorizedError(err)) onUnauthorized?.()
        setTrError('Could not load translations.')
      }
    )
  }

  function openEdit(post: BlogPost) {
    const f = formFromPost(post)
    setForm(f)
    bodyRef.current = f.body
    setEditorKey(`edit-${post.slug}`)
    setFormError('')
    setCoverError('')
    setTrTitle('')
    setTrExcerpt('')
    trBodyRef.current = ''
    setTrLang('hi')
    setTrError('')
    setTrList([])
    setEditing(post)
    loadTranslations(post.slug, 'hi')
  }

  function switchTrLang(lang: TranslationLang) {
    setTrLang(lang)
    setTrError('')
    const found = trList.find((t) => t.lang === lang)
    setTrTitle(found?.title ?? '')
    setTrExcerpt(found?.excerpt ?? '')
    trBodyRef.current = found?.bodyHtml ?? ''
    const slug = editing && editing !== 'new' ? editing.slug : 'new'
    setTrEditorKey(`tr-${slug}-${lang}-${Date.now()}`)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleTitle(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: f.slugTouched ? f.slug : slugifyTitle(title),
    }))
  }

  async function handleSave() {
    setSaving(true)
    setFormError('')
    const input: BlogInput = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim(),
      body_html: bodyRef.current,
      cover_image: form.cover.trim(),
      published_at: form.date,
      is_published: form.published,
    }
    try {
      if (editing === 'new') {
        await adminBlogCreate(input)
      } else if (editing) {
        await adminBlogUpdate(editing.slug, input)
      }
      setEditing(null)
      setLoading(true)
      await refresh()
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCoverFile(file: File | undefined) {
    if (!file) return
    setCoverUploading(true)
    setCoverError('')
    try {
      const path = await adminBlogCoverUpload(file)
      setForm((f) => ({ ...f, cover: path }))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setCoverError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setCoverUploading(false)
      if (coverFileRef.current) coverFileRef.current.value = ''
    }
  }

  async function handleDelete(post: BlogPost) {
    if (!window.confirm(`Delete “${post.title}”?`)) return
    try {
      await adminBlogDelete(post.slug)
      setPosts((prev) => prev.filter((p) => p.slug !== post.slug))
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Delete failed. Please retry.')
    }
  }

  async function handleToggle(post: BlogPost) {
    try {
      const updated = await adminBlogUpdate(post.slug, {
        is_published: !post.isPublished,
      })
      setPosts((prev) =>
        prev.map((p) => (p.slug === post.slug ? { ...p, ...updated } : p))
      )
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setError('Update failed. Please retry.')
    }
  }

  async function handleTrSave() {
    if (editing === 'new' || !editing) return
    setTrSaving(true)
    setTrError('')
    try {
      const saved = await adminBlogTranslationSave(editing.slug, {
        lang: trLang,
        title: trTitle.trim(),
        excerpt: trExcerpt.trim(),
        body_html: trBodyRef.current,
      })
      setTrList((prev) => {
        const rest = prev.filter((t) => t.lang !== saved.lang)
        return [...rest, saved].sort((a, b) => a.lang.localeCompare(b.lang))
      })
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setTrError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setTrSaving(false)
    }
  }

  async function handleTrDelete() {
    if (editing === 'new' || !editing) return
    if (!window.confirm(`Delete ${LANG_LABELS[trLang]} translation?`)) return
    try {
      await adminBlogTranslationDelete(editing.slug, trLang)
      setTrList((prev) => prev.filter((t) => t.lang !== trLang))
      setTrTitle('')
      setTrExcerpt('')
      trBodyRef.current = ''
      setTrEditorKey(`tr-${editing.slug}-${trLang}-${Date.now()}`)
    } catch (err) {
      if (isUnauthorizedError(err)) onUnauthorized?.()
      setTrError('Delete failed. Please retry.')
    }
  }

  if (editing) {
    return (
      <div>
        <div className="adm-section-head">
          <h2 className="adm-section-title">
            {editing === 'new' ? 'New Post' : 'Edit Post'}
          </h2>
          <div className="adm-btn-group">
            <button
              type="button"
              onClick={() => setEditing(null)}
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
              {saving ? 'Saving…' : 'Save'}
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
            <label className="adm-label" htmlFor="post-title">
              Title
            </label>
            <input
              id="post-title"
              type="text"
              value={form.title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="Post title"
              className="adm-input"
            />
          </div>

          <div className="adm-grid-2">
            <div className="adm-field">
              <label className="adm-label" htmlFor="post-slug">
                Slug
              </label>
              <input
                id="post-slug"
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    slug: e.target.value,
                    slugTouched: true,
                  }))
                }
                placeholder="auto-from-title"
                className="adm-input adm-input--mono"
              />
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="post-date">
                Publish date
              </label>
              <input
                id="post-date"
                type="date"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
                className="adm-input"
              />
            </div>
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="post-excerpt">
              Excerpt
            </label>
            <textarea
              id="post-excerpt"
              rows={2}
              value={form.excerpt}
              onChange={(e) => setField('excerpt', e.target.value)}
              placeholder="Short summary for cards"
              className="adm-textarea"
            />
          </div>

          <div className="adm-field">
            <span className="adm-label">Cover image</span>
            <div className="adm-cover-box">
              {form.cover ? (
                <div className="adm-cover-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.cover}
                    alt="Cover preview"
                    className="adm-cover-img"
                  />
                  <div className="adm-cover-meta">
                    <p className="adm-cover-path">{form.cover}</p>
                    <div className="adm-btn-group">
                      <button
                        type="button"
                        onClick={() => coverFileRef.current?.click()}
                        disabled={coverUploading}
                        className="adm-btn adm-btn-sm"
                      >
                        {coverUploading ? 'Uploading…' : 'Replace image'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('cover', '')}
                        disabled={coverUploading}
                        className="adm-btn-danger adm-btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="adm-btn-group">
                  <button
                    type="button"
                    onClick={() => coverFileRef.current?.click()}
                    disabled={coverUploading}
                    className="adm-btn-primary"
                  >
                    {coverUploading ? 'Uploading…' : 'Upload cover image'}
                  </button>
                  <p className="adm-small adm-faint">
                    JPG, PNG or WebP, max 5 MB.
                  </p>
                </div>
              )}
              <input
                ref={coverFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="adm-hidden-input"
                onChange={(e) => handleCoverFile(e.target.files?.[0])}
              />
              {coverError && (
                <p className="adm-alert adm-alert--error" style={{ marginTop: 12, marginBottom: 0 }}>
                  {coverError}
                </p>
              )}
            </div>
          </div>

          <div className="adm-field">
            <span className="adm-label">Body</span>
            <RichEditor
              key={editorKey}
              initialValue={form.body}
              onContentChange={(content) => {
                bodyRef.current = content
              }}
            />
          </div>

          <label className="adm-check">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setField('published', e.target.checked)}
            />
            Published (uncheck to keep as draft)
          </label>

          {editing !== 'new' && (
            <section className="adm-trans-box" aria-label="Translations">
              <div className="adm-trans-head">
                <h3 className="adm-section-title" style={{ fontSize: 22 }}>
                  Translations{' '}
                  <span className="adm-count">
                    ({trList.length}/{TRANS_LANGS.length})
                  </span>
                </h3>
                <div className="adm-lang-tabs">
                  {TRANS_LANGS.map((l) => {
                    const done = trList.some((t) => t.lang === l)
                    const active = trLang === l
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => switchTrLang(l)}
                        aria-current={active ? 'true' : undefined}
                        className={
                          active
                            ? 'adm-btn-primary adm-btn-sm'
                            : 'adm-btn adm-btn-sm'
                        }
                        style={
                          done && !active
                            ? { borderColor: 'rgba(244, 179, 203, 0.5)', color: 'var(--pink)' }
                            : undefined
                        }
                      >
                        {done ? '✓ ' : ''}
                        {LANG_LABELS[l]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {trError && (
                <p className="adm-alert adm-alert--error" role="alert">
                  {trError}
                </p>
              )}

              <div className="adm-stack">
                <div className="adm-field">
                  <label className="adm-label" htmlFor="tr-title">
                    Title ({LANG_LABELS[trLang]})
                  </label>
                  <input
                    id="tr-title"
                    type="text"
                    value={trTitle}
                    onChange={(e) => setTrTitle(e.target.value)}
                    placeholder={`Title in ${LANG_LABELS[trLang]}`}
                    className="adm-input"
                  />
                </div>
                <div className="adm-field">
                  <label className="adm-label" htmlFor="tr-excerpt">
                    Excerpt ({LANG_LABELS[trLang]})
                  </label>
                  <textarea
                    id="tr-excerpt"
                    rows={2}
                    value={trExcerpt}
                    onChange={(e) => setTrExcerpt(e.target.value)}
                    placeholder={`Short summary in ${LANG_LABELS[trLang]}`}
                    className="adm-textarea"
                  />
                </div>
                <div className="adm-field">
                  <span className="adm-label">Body ({LANG_LABELS[trLang]})</span>
                  <RichEditor
                    key={trEditorKey}
                    initialValue={trBodyRef.current}
                    onContentChange={(content) => {
                      trBodyRef.current = content
                    }}
                  />
                </div>
                <div className="adm-btn-group">
                  <button
                    type="button"
                    onClick={handleTrSave}
                    disabled={trSaving}
                    className="adm-btn-primary"
                  >
                    {trSaving ? 'Saving…' : `Save ${LANG_LABELS[trLang]}`}
                  </button>
                  {trList.some((t) => t.lang === trLang) && (
                    <button
                      type="button"
                      onClick={handleTrDelete}
                      className="adm-btn-danger"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="adm-section-head">
        <h2 className="adm-section-title">
          Blog Posts <span className="adm-count">({posts.length})</span>
        </h2>
        <button type="button" onClick={openNew} className="adm-btn-primary">
          + New Post
        </button>
      </div>

      {loading ? (
        <p className="adm-loading">Loading…</p>
      ) : error ? (
        <p className="adm-alert adm-alert--error" role="alert">{error}</p>
      ) : posts.length === 0 ? (
        <p className="adm-empty">No posts yet.</p>
      ) : (
        <div className="adm-list">
          {posts.map((post) => (
            <div key={post.slug} className="adm-row">
              <div className="adm-row-main">
                <div className="adm-row-title-line">
                  <p className="adm-row-title">{post.title}</p>
                  <span
                    className={`adm-pill ${post.isPublished ? 'adm-pill--pink' : ''}`}
                  >
                    {post.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="adm-row-meta adm-mono">
                  /{post.slug} · {formatBlogDate(post.publishedAt)}
                </p>
              </div>
              <div className="adm-btn-group">
                <button
                  type="button"
                  onClick={() => handleToggle(post)}
                  className="adm-btn adm-btn-sm"
                >
                  {post.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(post)}
                  className="adm-btn adm-btn-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(post)}
                  className="adm-btn-danger adm-btn-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
