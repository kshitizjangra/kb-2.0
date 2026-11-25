import { API_BASE, apiFetch } from '@/lib/api'

export class AdminApiError extends Error {
  status: number
  retryAfter?: number

  constructor(message: string, status: number, retryAfter?: number) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function isUnauthorizedError(err: unknown): boolean {
  return err instanceof AdminApiError && (err.status === 401 || err.status === 403)
}

async function parseError(res: Response, fallback: string): Promise<AdminApiError> {
  const data = await res.json().catch(() => ({}))
  const retryHeader = res.headers.get('Retry-After')
  const retryAfter = retryHeader ? Number(retryHeader) : undefined
  const message =
    typeof data?.error === 'string' && data.error.trim()
      ? data.error
      : res.status === 401
        ? 'Unauthorized — please sign in.'
        : fallback
  return new AdminApiError(message, res.status, Number.isFinite(retryAfter) ? retryAfter : undefined)
}

async function throwIfBad(res: Response, fallback: string): Promise<void> {
  if (res.ok) return
  throw await parseError(res, fallback)
}

async function adminJson<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit,
  fallback = 'Request failed'
): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  await throwIfBad(res, fallback)
  return res.json() as Promise<T>
}

export function formatAdminDate(value: string | null | undefined): string {
  if (!value) return '—'
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================================================
// Auth
// ============================================================================

export async function adminLogin(
  identifier: string,
  password: string
): Promise<{ ok: boolean; user?: string }> {
  const res = await apiFetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
  await throwIfBad(res, 'Sign in failed. Please try again.')
  return res.json()
}

export async function adminLogout(): Promise<void> {
  const res = await apiFetch('/api/admin/logout', { method: 'POST' })
  await throwIfBad(res, 'Sign out failed')
}

// ============================================================================
// Emails
// ============================================================================

export interface EmailItem {
  id: number
  email: string
  ip: string | null
  userAgent: string | null
  createdAt: string | null
}

export async function adminEmailsList(): Promise<EmailItem[]> {
  const res = await apiFetch('/api/admin/emails')
  await throwIfBad(res, 'Could not load emails')
  const data = await res.json()
  return data.emails ?? []
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const s = String(value ?? '')
  const sanitized = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }
  return sanitized
}

export function exportEmailsCSV(rows: EmailItem[]): void {
  const header = 'id,email,ip,user_agent,created_at'
  const lines = rows.map((r) =>
    [
      escapeCsvCell(r.id),
      escapeCsvCell(r.email),
      escapeCsvCell(r.ip),
      escapeCsvCell(r.userAgent),
      escapeCsvCell(r.createdAt),
    ].join(',')
  )
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `emails_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================================
// Feedback
// ============================================================================

export interface FeedbackItem {
  id: number
  name: string
  email: string
  message: string
  ip: string | null
  createdAt: string | null
}

export async function adminFeedbackList(): Promise<FeedbackItem[]> {
  const res = await apiFetch('/api/admin/feedback')
  await throwIfBad(res, 'Could not load feedback')
  const data = await res.json()
  return data.feedback ?? []
}

export async function adminFeedbackDelete(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/feedback/${id}`, {
    method: 'DELETE',
  })
  await throwIfBad(res, 'Delete failed')
}

export async function submitFeedback(input: {
  name: string
  email: string
  message: string
}): Promise<void> {
  const res = await apiFetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwIfBad(res, 'Could not send feedback. Please try again.')
}

// ============================================================================
// Blog & Translations
// ============================================================================

export type TranslationLang = 'hi' | 'ta' | 'te' | 'mr' | 'kn' | 'or'

export const TRANS_LANGS: TranslationLang[] = ['hi', 'ta', 'te', 'mr', 'kn', 'or']

export const LANG_LABELS: Record<TranslationLang | 'en', string> = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
  or: 'ଓଡ଼ିଆ',
}

export interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  coverImage: string
  mediumUrl: string
  authorName: string
  authorPhoto: string
  publishedAt: string | null
  bodyHtml?: string
  isPublished?: boolean
  lang?: string
}

export interface BlogInput {
  title?: string
  slug?: string
  excerpt?: string
  body_html?: string
  cover_image?: string
  medium_url?: string
  published_at?: string
  is_published?: boolean
}

export interface BlogTranslation {
  lang: string
  title: string
  excerpt: string
  bodyHtml: string
  updatedAt: string | null
}

export function formatBlogDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value + 'T00:00:00Z')
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export async function fetchPosts(lang = 'en'): Promise<BlogPost[]> {
  const res = await fetch(`${API_BASE}/api/blog?lang=${encodeURIComponent(lang)}`, {
    credentials: 'omit',
  })
  if (!res.ok) throw new Error('Failed to load posts')
  const data = await res.json()
  return data.posts ?? []
}

export async function fetchPost(slug: string, lang = 'en'): Promise<BlogPost | null> {
  const res = await fetch(
    `${API_BASE}/api/blog/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`,
    { credentials: 'omit' }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to load post')
  const data = await res.json()
  return data.post ?? null
}

export async function adminBlogList(): Promise<BlogPost[]> {
  const res = await apiFetch('/api/admin/blog')
  await throwIfBad(res, 'Could not load posts')
  const data = await res.json()
  return data.posts ?? []
}

export async function adminBlogCreate(input: BlogInput): Promise<BlogPost> {
  const data = await adminJson<{ post: BlogPost }>('/api/admin/blog/create', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.post
}

export async function adminBlogUpdate(
  slug: string,
  input: BlogInput
): Promise<BlogPost> {
  const data = await adminJson<{ post: BlogPost }>(
    `/api/admin/blog/${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )
  return data.post
}

export async function adminBlogDelete(slug: string): Promise<void> {
  const res = await apiFetch(`/api/admin/blog/${encodeURIComponent(slug)}/delete`, {
    method: 'DELETE',
  })
  await throwIfBad(res, 'Delete failed')
}

export async function adminBlogCoverUpload(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch('/api/admin/blog/cover/upload', {
    method: 'POST',
    body: form,
  })
  await throwIfBad(res, 'Upload failed')
  const data = await res.json()
  return data.path as string
}

export async function adminBlogTranslations(
  slug: string
): Promise<BlogTranslation[]> {
  const res = await apiFetch(
    `/api/admin/blog/${encodeURIComponent(slug)}/translations`
  )
  await throwIfBad(res, 'Failed to load translations')
  const data = await res.json()
  return data.translations ?? []
}

export async function adminBlogTranslationSave(
  slug: string,
  input: { lang: string; title: string; excerpt: string; body_html: string }
): Promise<BlogTranslation> {
  const data = await adminJson<{ translation: BlogTranslation }>(
    `/api/admin/blog/${encodeURIComponent(slug)}/translations/save`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    'Save failed'
  )
  return data.translation
}

export async function adminBlogTranslationDelete(
  slug: string,
  lang: string
): Promise<void> {
  const res = await apiFetch(
    `/api/admin/blog/${encodeURIComponent(slug)}/translations/${encodeURIComponent(lang)}`,
    { method: 'DELETE' }
  )
  await throwIfBad(res, 'Delete failed')
}

// ============================================================================
// Files / Lead Magnet
// ============================================================================

export interface LeadMagnetInfo {
  exists: boolean
  filename?: string
  size?: number
  updatedAt?: string
  uploaded_name?: string
}

export async function adminLeadMagnetGet(): Promise<LeadMagnetInfo> {
  const res = await apiFetch('/api/admin/lead-magnet')
  await throwIfBad(res, 'Could not load file info')
  return res.json()
}

export async function adminLeadMagnetUpload(file: File): Promise<LeadMagnetInfo> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch('/api/admin/lead-magnet/upload', {
    method: 'POST',
    body: form,
  })
  await throwIfBad(res, 'Upload failed')
  return res.json()
}

// ============================================================================
// Newsletter
// ============================================================================

export interface SubscriberItem {
  id: number
  email: string
  name: string
  isActive: boolean
  status: 'pending' | 'active' | 'unsubscribed' | 'suppressed'
  source: string
  welcomeStatus: 'pending' | 'submitting' | 'queued' | 'failed' | 'review'
  createdAt: string | null
}

export interface IssueItem {
  id: number
  subject: string
  status: 'draft' | 'queued' | 'moderation' | 'sending' | 'sent' | 'failed' | 'review'
  recipientCount: number
  createdAt: string | null
  sentAt: string | null
  bodyHtml?: string
  previewHtml?: string
  providerCampaignId: string
  lastError: string
  deliveredCount: number
  openedCount: number
  clickedCount: number
  bouncedCount: number
}

export interface NewsletterStatus {
  configured: boolean
  ready: boolean
  error?: string
  subscriberLimit: number
  monthlyLimit: number
  subscribersUsed?: number
  emailsLeft?: number
  senderEmail?: string
  senderName?: string
  welcomeReady?: boolean
  welcomeError?: string
}

export async function adminSubscriberList(): Promise<SubscriberItem[]> {
  const res = await apiFetch('/api/admin/newsletter/subscribers')
  await throwIfBad(res, 'Could not load subscribers')
  return (await res.json()).subscribers ?? []
}

export async function adminSubscriberDelete(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/newsletter/subscribers/${id}`, {
    method: 'DELETE',
  })
  await throwIfBad(res, 'Delete failed')
}

export async function adminIssueList(): Promise<IssueItem[]> {
  const res = await apiFetch('/api/admin/newsletter/issues')
  await throwIfBad(res, 'Could not load issues')
  return (await res.json()).issues ?? []
}

export async function adminIssueGet(id: number): Promise<IssueItem> {
  const res = await apiFetch(`/api/admin/newsletter/issues/${id}`)
  await throwIfBad(res, 'Issue not found')
  return (await res.json()).issue
}

export async function adminIssueCreate(input: {
  subject: string
  body_html: string
}): Promise<IssueItem> {
  const data = await adminJson<{ issue: IssueItem }>(
    '/api/admin/newsletter/issues/create',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    'Create failed'
  )
  return data.issue
}

export async function adminIssueUpdate(
  id: number,
  input: { subject?: string; body_html?: string }
): Promise<IssueItem> {
  const data = await adminJson<{ issue: IssueItem }>(
    `/api/admin/newsletter/issues/${id}/edit`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    'Update failed'
  )
  return data.issue
}

export async function adminIssueDelete(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/newsletter/issues/${id}/delete`, {
    method: 'DELETE',
  })
  await throwIfBad(res, 'Delete failed')
}

export async function adminIssueSend(id: number): Promise<IssueItem> {
  const res = await apiFetch(`/api/admin/newsletter/issues/${id}/send`, {
    method: 'POST',
  })
  await throwIfBad(res, 'Send failed')
  return (await res.json()).issue
}

export async function adminIssueTest(id: number): Promise<{ email: string }> {
  const res = await apiFetch(`/api/admin/newsletter/issues/${id}/test`, {
    method: 'POST',
  })
  await throwIfBad(res, 'Test send failed')
  return res.json()
}

export async function adminNewsletterStatus(): Promise<NewsletterStatus> {
  const res = await apiFetch('/api/admin/newsletter/status')
  await throwIfBad(res, 'Could not check newsletter setup')
  return res.json()
}

export async function adminNewsletterSync(): Promise<void> {
  const res = await apiFetch('/api/admin/newsletter/sync', { method: 'POST' })
  await throwIfBad(res, 'Newsletter sync failed')
}

export async function subscribeToNewsletter(
  email: string,
  options: { name?: string; source?: 'pdf' | 'newsletter'; website?: string } = {}
): Promise<void> {
  const res = await apiFetch('/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), ...options, consent: true }),
  })
  await throwIfBad(res, 'Could not subscribe. Please try again shortly.')
}

// ============================================================================
// Reviews / Testimonials & Site Settings
// ============================================================================

export interface Testimonial {
  id: number
  name: string
  date: string
  text: string
  rating: number
  isVisible: boolean
  sortOrder: number
}

export interface TopmateSettings {
  topmate_ratings_count: string
  topmate_testimonials_count: string
  topmate_url: string
}

export const DEFAULT_TOPMATE_SETTINGS: TopmateSettings = {
  topmate_ratings_count: '31',
  topmate_testimonials_count: '31',
  topmate_url: 'https://topmate.io/kamna_bhardwaj',
}

export interface TestimonialInput {
  name: string
  date?: string
  text: string
  rating?: number
  is_visible?: boolean
  sort_order?: number
}

export async function fetchTestimonials(): Promise<{
  testimonials: Testimonial[]
  settings: TopmateSettings
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/testimonials`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return {
      testimonials: data.testimonials ?? [],
      settings: { ...DEFAULT_TOPMATE_SETTINGS, ...(data.settings ?? {}) },
    }
  } catch {
    return null
  }
}

export async function adminTestimonialsList(): Promise<{
  testimonials: Testimonial[]
  settings: TopmateSettings
}> {
  const res = await apiFetch('/api/admin/testimonials')
  await throwIfBad(res, 'Could not load reviews')
  const data = await res.json()
  return {
    testimonials: data.testimonials ?? [],
    settings: { ...DEFAULT_TOPMATE_SETTINGS, ...(data.settings ?? {}) },
  }
}

export async function adminTestimonialCreate(
  input: TestimonialInput
): Promise<Testimonial> {
  const data = await adminJson<{ testimonial: Testimonial }>(
    '/api/admin/testimonials/create',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
  return data.testimonial
}

export async function adminTestimonialUpdate(
  id: number,
  input: Partial<TestimonialInput>
): Promise<Testimonial> {
  const data = await adminJson<{ testimonial: Testimonial }>(
    `/api/admin/testimonials/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )
  return data.testimonial
}

export async function adminTestimonialDelete(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/testimonials/${id}/delete`, {
    method: 'DELETE',
  })
  await throwIfBad(res, 'Delete failed')
}

export async function adminSiteSettingsUpdate(
  input: Partial<TopmateSettings>
): Promise<TopmateSettings> {
  const data = await adminJson<{ settings?: Partial<TopmateSettings> }>(
    '/api/admin/site-settings',
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )
  return { ...DEFAULT_TOPMATE_SETTINGS, ...(data.settings ?? {}) }
}

// ============================================================================
// Social (LinkedIn + Instagram Reels)
// ============================================================================

export const FALLBACK_LINKEDIN_URNS = [
  'urn:li:activity:7175360778315735043',
  'urn:li:activity:7369397749256998912',
  'urn:li:activity:7350518438450057216',
  'urn:li:activity:7386432546634436608',
  'urn:li:activity:7468300929922945026',
]

export const FALLBACK_INSTAGRAM_REELS = [
  { url: 'https://www.instagram.com/reel/DZzn3h3M9Jp/', code: 'DZzn3h3M9Jp' },
  { url: 'https://www.instagram.com/reel/DXvzWqTMfIp/', code: 'DXvzWqTMfIp' },
  { url: 'https://www.instagram.com/reel/DZ10LkGNC-0/', code: 'DZ10LkGNC-0' },
  { url: 'https://www.instagram.com/reel/DYpMyXuNiTF/', code: 'DYpMyXuNiTF' },
  { url: 'https://www.instagram.com/reel/DWdrplHkkDi/', code: 'DWdrplHkkDi' },
]

export interface LinkedInItem {
  id: number
  urn: string
  position: number
  isActive: boolean
}

export interface ReelItem {
  id: number
  url: string
  code: string
  position: number
  isActive: boolean
}

export function linkedinPostUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${urn}`
}

export async function fetchLinkedinUrns(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/social/linkedin`, { credentials: 'omit' })
  if (!res.ok) throw new Error('Failed to load LinkedIn posts')
  const data = await res.json()
  const urns = (data.posts ?? []).map((p: LinkedInItem) => p.urn)
  return urns.length > 0 ? urns : FALLBACK_LINKEDIN_URNS
}

export async function fetchInstagramReels(): Promise<{ url: string; code: string }[]> {
  const res = await fetch(`${API_BASE}/api/social/instagram`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load Instagram reels')
  const data = await res.json()
  const reels = (data.reels ?? []).map((r: ReelItem) => ({ url: r.url, code: r.code }))
  return reels.length > 0 ? reels : FALLBACK_INSTAGRAM_REELS
}

export async function adminSocialList(): Promise<{
  linkedin: LinkedInItem[]
  instagram: ReelItem[]
}> {
  const res = await apiFetch('/api/admin/social')
  await throwIfBad(res, 'Could not load social posts')
  const data = await res.json()
  return { linkedin: data.linkedin ?? [], instagram: data.instagram ?? [] }
}

export async function adminLinkedinCreate(input: {
  urn: string
  position?: number
  is_active?: boolean
}): Promise<{ post: LinkedInItem }> {
  return adminJson('/api/admin/social/linkedin', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function adminLinkedinUpdate(
  id: number,
  input: { urn?: string; position?: number; is_active?: boolean }
): Promise<{ post: LinkedInItem }> {
  return adminJson(`/api/admin/social/linkedin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function adminLinkedinDelete(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/social/linkedin/${id}/delete`, {
    method: 'DELETE',
  })
  await throwIfBad(res, 'Delete failed')
}

export async function adminReelCreate(input: {
  url: string
  position?: number
  is_active?: boolean
}): Promise<{ reel: ReelItem }> {
  return adminJson('/api/admin/social/instagram', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function adminReelUpdate(
  id: number,
  input: { url?: string; position?: number; is_active?: boolean }
): Promise<{ reel: ReelItem }> {
  return adminJson(`/api/admin/social/instagram/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function adminReelDelete(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/social/instagram/${id}/delete`, {
    method: 'DELETE',
  })
  await throwIfBad(res, 'Delete failed')
}

// ============================================================================
// Live Chat
// ============================================================================

export type ChatSender = 'visitor' | 'bot' | 'kamna'

export interface ChatMessage {
  id: number
  sender: ChatSender
  text: string
  createdAt: string | null
}

export interface ChatThread {
  token: string
  label: string
  hasUnread: boolean
  updatedAt: string | null
  lastMessage?: ChatMessage | null
}

const CHAT_TOKEN_KEY = 'kamna-chat-token'

export function getStoredChatToken(): string | null {
  try {
    return localStorage.getItem(CHAT_TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeChatToken(token: string): void {
  try {
    localStorage.setItem(CHAT_TOKEN_KEY, token)
  } catch {
    // private mode — chat still works, just no resume
  }
}

export async function ensureChatThread(): Promise<{
  token: string
  messages: ChatMessage[]
}> {
  const res = await apiFetch('/api/chat/thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: getStoredChatToken() }),
  })
  await throwIfBad(res, 'Chat unavailable')
  const data = await res.json()
  storeChatToken(data.token)
  return { token: data.token, messages: data.messages ?? [] }
}

export async function sendChatThreadMessage(
  token: string,
  sender: 'visitor' | 'bot',
  text: string
): Promise<ChatMessage> {
  const res = await apiFetch('/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, sender, text }),
  })
  await throwIfBad(res, 'Send failed')
  const data = await res.json()
  return data.message
}

export async function pollChatThread(
  token: string,
  after: number
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${API_BASE}/api/chat/messages?token=${encodeURIComponent(token)}&after=${after}`,
    { cache: 'no-store' }
  )
  await throwIfBad(res, 'Poll failed')
  const data = await res.json()
  return data.messages ?? []
}

export async function adminChatThreads(): Promise<ChatThread[]> {
  const res = await apiFetch('/api/admin/chat')
  await throwIfBad(res, 'Could not load chats')
  const data = await res.json()
  return data.threads ?? []
}

export async function adminChatDetail(token: string): Promise<{
  thread: ChatThread
  messages: ChatMessage[]
}> {
  const res = await apiFetch(`/api/admin/chat/${encodeURIComponent(token)}`)
  await throwIfBad(res, 'Chat not found')
  return res.json()
}

export async function adminChatReply(
  token: string,
  text: string
): Promise<ChatMessage> {
  const data = await adminJson<{ message: ChatMessage }>(
    `/api/admin/chat/${encodeURIComponent(token)}/reply`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    },
    'Reply failed'
  )
  return data.message
}

export async function adminChatDelete(token: string): Promise<void> {
  const res = await apiFetch(
    `/api/admin/chat/${encodeURIComponent(token)}/delete`,
    { method: 'DELETE' }
  )
  await throwIfBad(res, 'Delete failed')
}
