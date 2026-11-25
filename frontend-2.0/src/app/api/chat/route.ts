// POST /api/chat — $0 hybrid chat.
// Context is built SERVER-SIDE from own knowledge base — client input is
// never injected into the system prompt (prevents prompt injection).
// Tries free-tier LLM if key present, else 503 so client uses local fallback.
// Free keys (pick one, both optional):
//   GEMINI_API_KEY — Google AI Studio, gemini-2.0-flash free tier
//   GROQ_API_KEY   — Groq console, llama-3.3-70b-versatile free tier

import {
  STATIC_KNOWLEDGE,
  buildKnowledge,
  rankChunks,
  type KnowledgeChunk,
} from '@/lib/kamna-knowledge'

const PROVIDER_TIMEOUT_MS = 8000
const KNOWLEDGE_TIMEOUT_MS = 5000
const KNOWLEDGE_TTL_MS = 60_000

interface ChatBody {
  message?: string
  history?: { role: 'user' | 'assistant'; text: string }[]
}

// Tiny in-memory rate limit: 20 req / 10 min per IP. Best-effort only.
const hits = new Map<string, number[]>()
const MAX_TRACKED_IPS = 5000

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  // Evict IPs with no recent hits so the map stays bounded.
  if (hits.size >= MAX_TRACKED_IPS) {
    for (const [key, arr] of hits) {
      if (arr.every((t) => now - t >= windowMs)) hits.delete(key)
    }
    if (hits.size >= MAX_TRACKED_IPS) hits.clear()
  }
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= 20) return true
  arr.push(now)
  hits.set(ip, arr)
  return false
}

// Server-side knowledge base (STATIC + published posts), cached 60s.
let knowledgeCache: { data: KnowledgeChunk[]; at: number } | null = null

async function getKnowledge(): Promise<KnowledgeChunk[]> {
  if (knowledgeCache && Date.now() - knowledgeCache.at < KNOWLEDGE_TTL_MS) {
    return knowledgeCache.data
  }
  try {
    // NEXT_PUBLIC_API_URL may be a relative path in prod (browser-only);
    // server-side we need an absolute origin — prefer BACKEND_ORIGIN.
    const publicBase = process.env.NEXT_PUBLIC_API_URL ?? ''
    const apiBase = publicBase.startsWith('http')
      ? publicBase
      : (process.env.BACKEND_ORIGIN ?? 'http://localhost:8765')
    const res = await fetch(`${apiBase}/api/blog?lang=en`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(KNOWLEDGE_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`blog fetch ${res.status}`)
    const data = (await res.json()) as { posts?: unknown[] }
    const posts = (data.posts ?? []) as Parameters<typeof buildKnowledge>[0]
    const chunks = posts.length > 0 ? buildKnowledge(posts) : STATIC_KNOWLEDGE
    knowledgeCache = { data: chunks, at: Date.now() }
    return chunks
  } catch {
    // Backend down / timeout → fall back to last good or static knowledge.
    return knowledgeCache?.data ?? STATIC_KNOWLEDGE
  }
}

function systemPrompt(top: KnowledgeChunk[]): string {
  const ctx =
    top
      .slice(0, 5)
      .map((c) => `- ${c.title}${c.url ? ` (${c.url})` : ''}: ${c.content.slice(0, 800)}`)
      .join('\n') || '- (no context retrieved)'
  return [
    'You are Kamna Bhardwaj assistant on her portfolio site.',
    'Answer ONLY from context below. If answer missing, say so and suggest contacting via Contact section or Topmate.',
    'Keep replies under 120 words, friendly, first-person as Kamna team.',
    'Never invent prices, dates, or credentials.',
    'Context:',
    ctx,
  ].join('\n')
}

async function callGemini(message: string, sys: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: [{ parts: [{ text: message.slice(0, 1000) }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('')
      .trim()
    return text || null
  } catch {
    return null
  }
}

async function callGroq(message: string, sys: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 300,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: message.slice(0, 1000) },
        ],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

export async function POST(req: Request): Promise<Response> {
  // Rightmost XFF hop = appended by the trusted proxy; leftmost is client-controlled.
  const forwarded = req.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',').pop()?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  if (rateLimited(ip)) {
    return Response.json(
      { error: 'Rate limited. Try again later.' },
      { status: 429 }
    )
  }

  let body: ChatBody
  try {
    body = (await req.json()) as ChatBody
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  if (!message || message.length > 1000) {
    return Response.json(
      { error: 'Message required (max 1000 chars)' },
      { status: 422 }
    )
  }

  // Context ranked server-side — client payload ignored (prompt injection).
  const knowledge = await getKnowledge()
  const top = rankChunks(message, knowledge, 5)
  const sys = systemPrompt(top)

  // Prefer Gemini free tier, fallback to Groq free tier.
  const text =
    (await callGemini(message, sys)) ?? (await callGroq(message, sys))

  if (!text) {
    // No key configured or provider failed → client renders local answer.
    return Response.json(
      { error: 'AI_OFFLINE', fallback: true },
      { status: 503 }
    )
  }
  return Response.json({ text })
}
