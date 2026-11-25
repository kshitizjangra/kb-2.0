import type { BlogPost } from '@/lib/blog-data'

export interface KnowledgeChunk {
  id: string
  title: string
  url?: string
  content: string
}

// Static knowledge distilled from Kamna's v2 portfolio + public links.
// No API key needed. Shared by ChatWithKamna + blog search.
export const STATIC_KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: 'about',
    title: 'About Kamna Bhardwaj',
    url: '/#about',
    content:
      'Kamna Bhardwaj is a 21-year-old creator, storyteller, and personal branding strategist based in New Delhi, India. She built an 18K+ community on LinkedIn and 1K+ on Instagram, and has partnered with brands like OPPO, MARS Cosmetics, Minimalist, McDonald’s, Taco Bell, Carvel, and Chaayos. She builds in public and teaches founders, coaches, and creators to build brands that sound like them.',
  },
  {
    id: 'services',
    title: 'Services — What Kamna does',
    url: '/#services',
    content:
      'Kamna offers Personal Brand & LinkedIn Strategy (positioning, content pillars, profile audits, ghostwriting, and sustainable content systems) as well as Content Creation & Storytelling (UGC, reels, carousels, and brand campaigns for consumer, food, beauty, lifestyle, and tech brands).',
  },
  {
    id: 'lead-magnet',
    title: 'Free PDF — 100 LinkedIn Headlines Decoded',
    url: '/#download',
    content:
      'Free PDF resource: Decoded 100 Top LinkedIn Creators’ Headlines and About Sections. Learn the exact structure and positioning patterns behind headlines that convert and about sections that attract opportunities — trusted by 1,000+ creators. Study structure, not tone.',
  },
  {
    id: 'topmate',
    title: 'Book a 1:1 Call on Topmate',
    url: '/#topmate',
    content:
      'Book a 1:1 personal branding, LinkedIn strategy, or profile audit session directly with Kamna on Topmate: https://topmate.io/kamna_bhardwaj. Rated 5/5 across 31+ reviews (Top 5%, People’s Choice).',
  },
  {
    id: 'testimonials',
    title: 'Reviews & Social Proof',
    url: '/#testimonials',
    content:
      'Kamna holds a 5/5 rating across 31+ reviews on Topmate (People’s Choice, Top 5% creator) and has produced 30+ brand campaigns and content collaborations.',
  },
  {
    id: 'newsletter',
    title: 'Weekly Newsletter',
    url: '/#newsletter',
    content:
      'Join Kamna’s weekly newsletter for personal branding notes, writing breakdowns, career lessons, and stories from building in public. Confirm your email via the inbox link after signing up; unsubscribe anytime.',
  },
  {
    id: 'contact',
    title: 'Contact & Brand Inquiries',
    url: '/#contact',
    content:
      'To work with Kamna on personal brand strategy, ghostwriting, or creator brand campaigns, drop a message in the Contact section or email kamnabhardwaj.work@gmail.com. You can also connect on LinkedIn or book a 1:1 on Topmate.',
  },
  {
    id: 'blog',
    title: 'The Blog — Notes on writing & building in public',
    url: '/blog',
    content:
      'Read Kamna’s essays and practical guides on building in public on LinkedIn, writing hooks without sounding cringey, decoding 100 creator headlines, balancing college with brand shoots, and why consistency beats viral luck.',
  },
]

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function postsToChunks(posts: BlogPost[]): KnowledgeChunk[] {
  return posts.map((p) => ({
    id: `blog-${p.slug}`,
    title: p.title,
    url: `/blog/${p.slug}`,
    content: `${p.title}. ${p.excerpt ?? ''} ${
      p.bodyHtml ? stripHtml(p.bodyHtml).slice(0, 2000) : ''
    }`.trim(),
  }))
}

export function buildKnowledge(posts: BlogPost[]): KnowledgeChunk[] {
  return [...STATIC_KNOWLEDGE, ...postsToChunks(posts)]
}

// --- Tiny $0 retrieval: tokenize + TF-IDF cosine, no dependencies ---

const STOP = new Set(
  'a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,into,over,after,of,to,in,on,is,are,was,were,be,been,being,do,does,did,doing,have,has,had,having,i,me,my,we,our,you,your,he,she,it,they,them,his,her,its,their,what,which,who,whom,this,that,these,those,am,can,will,just,so,than,too,very,how,why,where,kya,hai,mein,ka,ki,ke'.split(
    ','
  )
)

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0B00-\u0B7F\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1)
  const n = tokens.length || 1
  for (const [k, v] of m) m.set(k, v / n)
  return m
}

export interface RankedChunk extends KnowledgeChunk {
  score: number
}

export function rankChunks(query: string, chunks: KnowledgeChunk[], topK = 3): RankedChunk[] {
  const qTokens = tokenize(query)
  if (qTokens.length === 0 || chunks.length === 0) return []
  const qTf = termFreq(qTokens)

  const df = new Map<string, number>()
  const chunkTfs = chunks.map((c) => {
    const tf = termFreq(tokenize(`${c.title} ${c.content}`))
    for (const k of new Set(tf.keys())) df.set(k, (df.get(k) ?? 0) + 1)
    return tf
  })
  const N = chunks.length
  const idf = (t: string) => Math.log(1 + N / (1 + (df.get(t) ?? 0)))

  const scored = chunks.map((c, i) => {
    const tf = chunkTfs[i]
    let dot = 0
    let qNorm = 0
    let dNorm = 0
    for (const [t, qv] of qTf) {
      const w = qv * idf(t)
      qNorm += w * w
      const dv = (tf.get(t) ?? 0) * idf(t)
      dot += w * dv
    }
    for (const [, dv0] of tf) dNorm += dv0 * dv0
    const titleTokens = new Set(tokenize(c.title))
    let overlap = 0
    for (const t of qTokens) if (titleTokens.has(t)) overlap += 1
    const cosine = dot / (Math.sqrt(qNorm) * Math.sqrt(dNorm) + 1e-9)
    return { ...c, score: cosine + overlap * 0.05 }
  })

  return scored
    .filter((s) => s.score > 0.001)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

export interface LocalAnswer {
  text: string
  sources: { title: string; url?: string }[]
}

const INTENT_REPLIES: { match: RegExp; chunkId: string; prefix: string }[] = [
  { match: /1:1|book|call|topmate/, chunkId: 'topmate', prefix: 'Book a 1:1 session:' },
  { match: /free|pdf|lead|magnet|headline.*decod|100/, chunkId: 'lead-magnet', prefix: 'Free resource:' },
  { match: /blog|post|posts|article|read|writing|hook/, chunkId: 'blog', prefix: 'From the blog:' },
  { match: /newsletter|subscribe|email/, chunkId: 'newsletter', prefix: 'Newsletter:' },
  { match: /review|rating|testimonial|proof|trust/, chunkId: 'testimonials', prefix: 'Social proof:' },
  { match: /work with|hire|price|contact|inquir/, chunkId: 'contact', prefix: 'Working together:' },
  { match: /service|offer|ghostwrit|strateg|content|what does kamna do/, chunkId: 'services', prefix: 'What Kamna does:' },
  { match: /who|about|kamna|background|story/, chunkId: 'about', prefix: 'About Kamna:' },
]

export function answerLocally(query: string, chunks: KnowledgeChunk[]): LocalAnswer {
  const ranked = rankChunks(query, chunks, 3)
  if (ranked.length === 0) {
    return {
      text: 'Ask me about Kamna — what she does, her 1:1 Topmate calls, the free LinkedIn Headlines PDF, brand collaborations, or blog posts on writing.',
      sources: STATIC_KNOWLEDGE.slice(0, 3).map((c) => ({ title: c.title, url: c.url })),
    }
  }
  const q = query.toLowerCase()
  const intent = INTENT_REPLIES.find((r) => r.match.test(q))
  const isBlogQuery = /\b(blog|post|posts|article|articles|writing|hook|hooks)\b/.test(q)
  const blogMatches = ranked.filter((r) => r.id.startsWith('blog-'))

  const top =
    isBlogQuery && blogMatches.length > 0
      ? blogMatches[0]
      : intent
        ? ranked.find((r) => r.id === intent.chunkId) ??
          chunks.find((c) => c.id === intent.chunkId) ??
          ranked[0]
        : ranked[0]

  const prefix = intent && top.id === intent.chunkId ? `${intent.prefix} ` : ''
  const snippet = top.content.length > 320 ? `${top.content.slice(0, 320).trimEnd()}…` : top.content
  const others = ranked.filter((r) => r.id !== top.id)
  const extra =
    others.length > 0
      ? ` Related: ${others.map((r) => r.title).join(' · ')}.`
      : ''

  const sources = [
    { title: top.title, url: top.url },
    ...others.map((r) => ({ title: r.title, url: r.url })),
  ].slice(0, 3)

  return {
    text: `${prefix}${snippet}${extra}`,
    sources,
  }
}

export function searchPosts(query: string, posts: BlogPost[]): BlogPost[] {
  const q = query.trim()
  if (!q) return posts
  const chunks = postsToChunks(posts)
  const ranked = rankChunks(q, chunks, posts.length)
  if (ranked.length === 0) {
    const low = q.toLowerCase()
    return posts.filter((p) =>
      `${p.title} ${p.excerpt}`.toLowerCase().includes(low)
    )
  }
  const byId = new Map(ranked.map((r) => [r.id, r.score]))
  return [...posts]
    .filter((p) => (byId.get(`blog-${p.slug}`) ?? 0) > 0.001)
    .sort(
      (a, b) => (byId.get(`blog-${b.slug}`) ?? -1) - (byId.get(`blog-${a.slug}`) ?? -1)
    )
}
