export interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  coverImage: string
  authorName: string
  authorPhoto: string
  publishedAt: string | null
  bodyHtml: string
  mediumUrl?: string
  lang?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8765'

export const FALLBACK_BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: 'What Building in Public on LinkedIn Actually Taught Me at 21',
    slug: 'building-in-public-on-linkedin',
    excerpt:
      'Skip the polished guru persona. Here is what happened when I stopped trying to sound like a VP and started sharing my real experiments in public.',
    coverImage: '/blog/cover-1.jpg',
    authorName: 'Kamna Bhardwaj',
    authorPhoto: '/blog/author-kamna.jpg',
    publishedAt: '2026-02-18',
    bodyHtml: `
      <p>When I wrote my first LinkedIn posts from a noisy bedroom in New Delhi, I thought I had to sound twice my age. I read corporate case studies, borrowed stiff vocabulary, and wondered why nobody cared enough to leave a comment.</p>
      <p>Everything shifted the week I stopped writing like a textbook and started documenting what I was actually testing in real time — the cold DMs that got ignored, the carousels that flopped at 200 impressions, and the small shifts that finally took my community past 18,000+ people.</p>
      <h2>People trust receipts, not performance</h2>
      <p>Building in public is often misunderstood as oversharing. It isn’t. It’s letting people watch your thinking evolve while the work is still warm:</p>
      <ul>
        <li>Share the exact teardown of a headline you rewrote and why the second version worked better.</li>
        <li>Talk about the campaign brief that taught you something uncomfortable about pacing on camera.</li>
        <li>Write for the person two steps behind you, not the imaginary boardroom watching from afar.</li>
      </ul>
      <blockquote>The fastest way to sound original online is to stop editing out your actual voice.</blockquote>
      <h2>Show the process while it’s still messy</h2>
      <p>Founders and creators reach out to me because they see how I think before we ever get on a Topmate call. Your feed is your proof of work. When you treat every post as a small field note from the arena, consistency stops feeling like a chore — it becomes a record of who you are becoming.</p>
    `.trim(),
  },
  {
    id: 2,
    title: 'How to Write LinkedIn Hooks That Don’t Feel Cringey',
    slug: 'writing-hooks-that-dont-feel-cringey',
    excerpt:
      'You don’t need clickbait cliffhangers or fake drama to earn the click. Four honest ways to open a post with tension and clarity.',
    coverImage: '/blog/cover-2.jpg',
    authorName: 'Kamna Bhardwaj',
    authorPhoto: '/blog/author-kamna.jpg',
    publishedAt: '2026-01-29',
    bodyHtml: `
      <p>We have all scrolled past the same tired opener: <em>“I lost everything at 22. Here are 7 lessons about B2B SaaS.”</em> It works for three seconds of shock value and costs you three months of credibility.</p>
      <p>A good hook isn’t a trick. It is simply a clear promise made in plain human language so the right reader knows this post was written for them.</p>
      <h2>1. Open with a specific observation</h2>
      <p>Instead of “Content strategy is changing in 2026,” try: “I audited 35 founder profiles last month and 29 of them hid what they actually do in line three of their bio.” Specificity signals that you did the homework.</p>
      <h2>2. Name the quiet contradiction</h2>
      <p>Tension doesn’t require hype. Point out the gap between common advice and lived reality: “Everyone tells you to post daily, nobody mentions how fast daily posting burns out your best ideas when you don’t have pillars.”</p>
      <h2>3. Use contrast without manufacturing drama</h2>
      <ul>
        <li>State what you expected to happen vs. what actually happened.</li>
        <li>Share a single concrete number paired with a real emotion.</li>
        <li>Ask the exact question a client asked you on a call yesterday.</li>
      </ul>
      <blockquote>If your hook sounds weird spoken out loud to a friend over chai, rewrite it until it doesn’t.</blockquote>
      <p>Readers can smell borrowed templates from a mile away. Make the first two lines honest, grounded, and specific — the rest of the post will feel effortless to finish.</p>
    `.trim(),
  },
  {
    id: 3,
    title: 'What I Learned Decoding 100 Top LinkedIn Creators’ Headlines',
    slug: 'decoding-100-top-creators-headlines',
    excerpt:
      'After breaking down 100 standout profiles line by line, the pattern wasn’t clever wordplay — it was ruthless clarity.',
    coverImage: '/blog/cover-3.jpg',
    authorName: 'Kamna Bhardwaj',
    authorPhoto: '/blog/author-kamna.jpg',
    publishedAt: '2026-01-12',
    bodyHtml: `
      <p>Most people treat their LinkedIn headline like an afterthought — a string of job titles separated by vertical bars. Yet every time you leave a thoughtful comment, your headline is the tiny billboard riding next to your name.</p>
      <p>When I sat down to decode 100 top creators’ headlines and About sections for my free PDF guide, I expected to find flashy copywriting tricks. What I actually found was much simpler — and far more repeatable.</p>
      <h2>The 3-part anatomy that showed up everywhere</h2>
      <p>Almost every high-converting headline answered three questions in under 120 characters:</p>
      <ul>
        <li><strong>Who you help or what you build:</strong> Clear positioning beats vague labels like “Visionary” or “Enthusiast.”</li>
        <li><strong>The tangible outcome or craft:</strong> Storytelling, demand gen, UGC, product design — name the thing people actually hire you for.</li>
        <li><strong>One human receipt:</strong> Community scale, notable brands, or what you’re actively building right now.</li>
      </ul>
      <h2>Study structure, never copy tone</h2>
      <p>The biggest mistake creators make when reading swipe files is lifting someone else’s personality. A sarcastic fintech founder and a calm brand strategist should never sound identical. Borrow the <em>architecture</em> — clarity first, proof second, human edge third — and fill it with your own voice.</p>
      <p>Over 1,000+ creators have downloaded that breakdown since I first shared it, and the best DMs I receive are always from people who used the structure to finally explain their work in one clean sentence.</p>
    `.trim(),
  },
  {
    id: 4,
    title: 'Balancing College, Client Strategy, and Brand Shoots Without Losing Your Mind',
    slug: 'balancing-college-life-and-brand-deals',
    excerpt:
      'Behind the McDonald’s, Taco Bell, and OPPO reels is a lot of Google Calendar Tetris, quiet mornings, and learning to say no.',
    coverImage: '/blog/cover-4.jpg',
    authorName: 'Kamna Bhardwaj',
    authorPhoto: '/blog/author-kamna.jpg',
    publishedAt: '2025-12-19',
    bodyHtml: `
      <p>People look at a campaign reel for McDonald’s, Taco Bell, or MARS Cosmetics and assume my whole week looks like a studio set. In reality, most of my week looks like deadlines, lecture notes, strategy decks, and editing on a laptop with three tabs of rough drafts open.</p>
      <p>When you are 21 and juggling creator shoots alongside personal brand strategy clients and college life, “hustle harder” stops working very quickly. You need boundaries that protect your energy on camera and your focus off it.</p>
      <h2>Batch by brain mode, not by client</h2>
      <p>The single habit that saved my schedule was separating creative days from admin days:</p>
      <ul>
        <li><strong>Mornings are for deep writing:</strong> Ghostwriting, LinkedIn drafts, and client strategy before notifications pile up.</li>
        <li><strong>Afternoons are for shoots & calls:</strong> Recording UGC, hopping on Topmate 1:1s, and reviewing campaign briefs.</li>
        <li><strong>Evenings are screen-light:</strong> Observing real life, because you cannot write good stories if you never step away from the feed.</li>
      </ul>
      <blockquote>Saying no to a misaligned brief is how you stay sharp enough to overdeliver on the right one.</blockquote>
      <p>You don’t need a 5 a.m. cold plunge routine. You just need honest expectations with your clients, a realistic calendar, and enough breathing room to still enjoy what you’re building.</p>
    `.trim(),
  },
  {
    id: 5,
    title: 'Why Boring Consistency Beats Viral Luck Every Single Time',
    slug: 'consistency-over-viral-luck',
    excerpt:
      'One post blowing up feels good for a weekend. A repeatable content system you can show up for in quiet weeks builds a real career.',
    coverImage: '/blog/cover-5.jpg',
    authorName: 'Kamna Bhardwaj',
    authorPhoto: '/blog/author-kamna.jpg',
    publishedAt: '2025-11-28',
    bodyHtml: `
      <p>Everyone asks how to go viral. Almost nobody asks how to survive the Tuesday after nothing you posted moved the needle.</p>
      <p>Having worked on 30+ brand campaigns and built an 18K+ audience from scratch, I can tell you with zero hesitation: the creators and founders who win long-term aren’t the ones chasing the algorithm every week. They are the ones who build a rhythm they can maintain when views are quiet.</p>
      <h2>What a sustainable system looks like</h2>
      <p>When I work with founders on their LinkedIn presence, we strip away the pressure to reinvent the wheel every morning. Instead, we anchor everything around three repeatable pillars:</p>
      <ul>
        <li><strong>Proof of work:</strong> What you shipped, learned, or fixed this week.</li>
        <li><strong>Point of view:</strong> A belief you hold about your industry that challenges lazy defaults.</li>
        <li><strong>Personal texture:</strong> The human behind the brand — the why, the failures, the small moments.</li>
      </ul>
      <h2>Compounding hides in the quiet months</h2>
      <p>Most of the inbound opportunities, brand partnerships, and 5/5 Topmate reviews I’m grateful for today didn’t come from my highest-reach posts. They came from someone quietly reading my work for four months before finally sending a message that started with, <em>“I feel like I already know how you think.”</em></p>
      <p>Keep showing up with craft and honesty. The work that looks overnight always took a hundred quiet posts first.</p>
    `.trim(),
  },
]

export function formatBlogDate(value: string | null | undefined): string {
  if (!value) return ''
  const iso = value.includes('T') ? value : `${value}T00:00:00Z`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_BASE}/api/blog?lang=en`, {
      credentials: 'omit',
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 120 },
    })
    if (!res.ok) return FALLBACK_BLOG_POSTS
    const data = (await res.json()) as { posts?: BlogPost[] }
    if (Array.isArray(data.posts) && data.posts.length > 0) {
      return data.posts
    }
    return FALLBACK_BLOG_POSTS
  } catch {
    return FALLBACK_BLOG_POSTS
  }
}

export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_BASE}/api/blog/${encodeURIComponent(slug)}?lang=en`, {
      credentials: 'omit',
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 120 },
    })
    if (res.ok) {
      const data = (await res.json()) as { post?: BlogPost }
      if (data.post) return data.post
    }
  } catch {
    // API unreachable or timed out — fall through to fallback posts
  }
  return FALLBACK_BLOG_POSTS.find((p) => p.slug === slug) ?? null
}
