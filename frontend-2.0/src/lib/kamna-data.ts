export interface LinkedInPostItem {
  id: string
  urn: string
  index: string
  title: string
  summary: string
  url: string
  embedUrl: string
}

export interface TestimonialItem {
  name: string
  date: string
  text: string
}

export interface TopmateServiceItem {
  index: string
  name: string
  price: string
  duration: string
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8765'

export const LINKEDIN_PROFILE_URL =
  'https://www.linkedin.com/in/kamna-bharadwaj/'

export function linkedinPostUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${urn}`
}

export function linkedinEmbedUrl(urn: string): string {
  return `https://www.linkedin.com/embed/feed/update/${urn}`
}

export const LINKEDIN_POSTS: LinkedInPostItem[] = [
  {
    id: 'urn:li:activity:7175360778315735043',
    urn: 'urn:li:activity:7175360778315735043',
    index: '01',
    title: 'Metro nikal gyi',
    summary:
      'An everyday Delhi metro moment turned into an honest reminder about slowing down, noticing life in transit, and finding stories in ordinary mornings.',
    url: linkedinPostUrl('urn:li:activity:7175360778315735043'),
    embedUrl: linkedinEmbedUrl('urn:li:activity:7175360778315735043'),
  },
  {
    id: 'urn:li:activity:7369397749256998912',
    urn: 'urn:li:activity:7369397749256998912',
    index: '02',
    title: '1 saal phele tum',
    summary:
      'Looking back a full year at where things started — the quiet drafts, small bets, and how showing up consistently compounds before anyone notices.',
    url: linkedinPostUrl('urn:li:activity:7369397749256998912'),
    embedUrl: linkedinEmbedUrl('urn:li:activity:7369397749256998912'),
  },
  {
    id: 'urn:li:activity:7350518438450057216',
    urn: 'urn:li:activity:7350518438450057216',
    index: '03',
    title: 'First brand trip',
    summary:
      'Behind the scenes of my first brand trip — what building a personal brand in public opens up when you stay authentic on and off camera.',
    url: linkedinPostUrl('urn:li:activity:7350518438450057216'),
    embedUrl: linkedinEmbedUrl('urn:li:activity:7350518438450057216'),
  },
  {
    id: 'urn:li:activity:7386432546634436608',
    urn: 'urn:li:activity:7386432546634436608',
    index: '04',
    title: 'All because I started creating',
    summary:
      'The opportunities, conversations, and friendships that only became possible the day I stopped overthinking and hit publish.',
    url: linkedinPostUrl('urn:li:activity:7386432546634436608'),
    embedUrl: linkedinEmbedUrl('urn:li:activity:7386432546634436608'),
  },
  {
    id: 'urn:li:activity:7468300929922945026',
    urn: 'urn:li:activity:7468300929922945026',
    index: '05',
    title: 'Doubt tha, phir bhi post kiya',
    summary:
      'Self-doubt never really disappears before posting. Here is why pressing publish anyway is the only real advantage most creators need.',
    url: linkedinPostUrl('urn:li:activity:7468300929922945026'),
    embedUrl: linkedinEmbedUrl('urn:li:activity:7468300929922945026'),
  },
]

export function mapLinkedinUrns(urns: string[]): LinkedInPostItem[] {
  const byUrn = new Map(LINKEDIN_POSTS.map((post) => [post.urn, post]))
  return urns.map((urn, i) => {
    const known = byUrn.get(urn)
    if (known) {
      return { ...known, index: String(i + 1).padStart(2, '0') }
    }
    return {
      id: urn,
      urn,
      index: String(i + 1).padStart(2, '0'),
      title: `LinkedIn Post ${String(i + 1).padStart(2, '0')}`,
      summary:
        'Reflections on building a personal brand in public, writing with voice, and turning everyday observations into content.',
      url: linkedinPostUrl(urn),
      embedUrl: linkedinEmbedUrl(urn),
    }
  })
}

export const LEAD_MAGNET = {
  eyebrow: 'FREE RESOURCE',
  title: "Decoded: 100 Top LinkedIn Creators' Headlines & About Sections",
  description:
    'I studied 100 top LinkedIn creators and broke down their exact formulas. Headlines that convert. About sections that sell. The patterns no one talks about — decoded.',
  joined: 'Joined by 1,000+ creators',
  quote:
    'Most people study top creators and just copy their tone. I study their structure and the patterns that attract opportunities and people.',
  cta: 'GET FREE PDF',
  pdfUrl: '/decoded_linkedin_creators.pdf',
} as const

export const TOPMATE_SUMMARY = {
  rating: '5/5',
  count: '31',
  badges: ["People's Choice", 'Top 5%', 'Community Care'],
  url: 'https://topmate.io/kamna_bhardwaj',
} as const

export const TESTIMONIALS: TestimonialItem[] = [
  {
    name: 'Manvi Narang',
    date: 'Dec 2025',
    text: "I had a really lovely conversation with Kamna. Talking to her felt easy and energising — it was just very visible that she had great knowledge about her craft. What stood out was how naturally she connected the dots, quickly understanding context and offering thoughtful, relevant strategies on the spot. Kamna brings clarity, sharp thinking, and a strategic lens that makes her someone you genuinely want in your corner if you're serious about growing on LinkedIn!",
  },
  {
    name: 'B Pujita',
    date: 'Dec 2025',
    text: "A 30-minute talk with Kamna was more than enough to set the foundation for my LinkedIn content journey. What felt like a casual, effortless conversation turned out to be a powerful session without me even realising it. Her guidance was clear, comforting, and incredibly effective. Did I ever feel like a 'client' instead of a person? Not even for a moment. That's the magic of Kamna!",
  },
  {
    name: 'Anirudh Agarwal',
    date: 'Jan 2026',
    text: "Kamna was super helpful, and extremely specific with her tips and advice. She takes her time to understand one's specific needs, their strengths and weaknesses to help out with the potential strategy. Cherry on top — she's super friendly, knows her stuff and goes beyond the scope to help people!",
  },
  {
    name: 'Shreya',
    date: 'Dec 2025',
    text: "This session was way more than what it's actually priced at. Kamna is just the most sweetest person and thoughtful creator I have come across and the insights and content ideas I gained from her are massive and totally a game changer. Grab the opportunity while you can!",
  },
  {
    name: 'Gargi Lad',
    date: 'Mar 2026',
    text: 'I just loved the talk-session with Kamna!! It was so real and candid and really, really helpful.',
  },
  {
    name: 'Kashvi Saraf',
    date: 'Jan 2026',
    text: "She is extremely talented yet very humble. She gave me some genuine advice. It's very refreshing to talk to her. Worth every penny and more! Definitely recommend people connect with her!",
  },
  {
    name: 'Pari Arora',
    date: 'Dec 2025',
    text: 'Kamna was super cool and friendly, felt I was talking to my friend. Best call ever, got so many insights in just 30 minutes.',
  },
  {
    name: 'Sourabh Ss',
    date: 'Jun 2025',
    text: "One hour with Kamna felt like talking to a creator bestie who just gets it. She simplified everything, asked the right questions, and left me inspired. If you're ever stuck or curious — talk to her. Worth every minute!",
  },
  {
    name: 'Soniya Agrawal',
    date: 'Dec 2025',
    text: 'It was one of the best sessions I have attended so far. Just loved her energy and everything. She made me so comfortable that I could easily tell her my struggles and problems. So grateful for this session. Highly recommended.',
  },
  {
    name: 'Hira Singh',
    date: 'Dec 2025',
    text: "Kamna is so insightful and full of genuine energy. Our session gave me exactly the clarity I needed on LinkedIn content strategy. She doesn't just give generic advice — she really listens and tailors everything to your situation. One of the best investments I've made for my personal brand!",
  },
  {
    name: 'Tanishka Mehta',
    date: 'Jan 2026',
    text: "Had an amazing session with Kamna! She's incredibly knowledgeable about LinkedIn and content creation. Her advice was practical, personalised, and easy to implement. What I loved most was how she made the whole conversation feel natural — like talking to a mentor who genuinely cares about your growth. Highly recommend!",
  },
  {
    name: 'Riya Sharma',
    date: 'Feb 2026',
    text: "Kamna has this incredible ability to simplify complex ideas. In just 30 minutes, she gave me a clear roadmap for my LinkedIn presence. She's not just knowledgeable — she's also incredibly warm and encouraging. If you're serious about your personal brand, you need to talk to her!",
  },
  {
    name: 'Aditya Kumar',
    date: 'Jan 2026',
    text: "The session with Kamna was an eye-opener. I came in with vague ideas about content creation and left with a concrete strategy. Her understanding of LinkedIn algorithms and engagement tactics is impressive. Plus, she's just a really genuine person who wants to see you succeed!",
  },
  {
    name: 'Priya Nair',
    date: 'Feb 2026',
    text: 'I was skeptical at first, but Kamna completely changed my perspective on LinkedIn content. Her insights are gold. She helped me identify my unique angle and gave me specific content ideas that align with my brand. The session was worth every rupee and more. Thank you, Kamna!',
  },
  {
    name: 'Arjun Verma',
    date: 'Mar 2026',
    text: 'Kamna is the real deal. Her knowledge about LinkedIn content strategy is unmatched, and she delivers it in such a friendly, approachable way. I walked away with actionable steps I could implement immediately. My LinkedIn engagement has already improved after just one session. Highly recommended!',
  },
  {
    name: 'Neha Gupta',
    date: 'Dec 2025',
    text: 'What an incredible session! Kamna has this rare ability to understand exactly where you are in your journey and give you the push in the right direction. Her content advice is practical and her energy is infectious. I left the call feeling motivated and ready to take action!',
  },
  {
    name: 'Vikram Malhotra',
    date: 'Jan 2026',
    text: 'Talking to Kamna was like having a GPS for my LinkedIn strategy. She pinpointed exactly where I was going wrong and gave me a clear path forward. Her expertise in personal branding is evident, and her genuine interest in your success makes the experience even more valuable.',
  },
  {
    name: 'Ananya Bose',
    date: 'Feb 2026',
    text: "Kamna is phenomenal! She doesn't just talk — she listens, understands, and then gives you tailored advice that actually makes sense for your specific situation. The session was packed with value and I'm already implementing her suggestions. Can't wait to see the results!",
  },
  {
    name: 'Rohan Desai',
    date: 'Mar 2026',
    text: "Had a fantastic session with Kamna. She has a deep understanding of what works on LinkedIn and explains it in a way that's easy to understand and implement. Her passion for helping others grow is evident in every word. This was genuinely one of the best investments I've made in my professional development.",
  },
  {
    name: 'Meera Iyer',
    date: 'Jan 2026',
    text: "Kamna's guidance was exactly what I needed to kick-start my LinkedIn journey. She helped me understand my strengths and how to showcase them effectively. The session was conversational, insightful, and incredibly motivating. I left feeling confident and ready to create content that truly represents me.",
  },
  {
    name: 'Karan Chopra',
    date: 'Feb 2026',
    text: 'Exceptional session with Kamna! She has a talent for breaking down complex concepts into simple, actionable steps. Her knowledge of LinkedIn content strategy is vast, and she generously shares it. I particularly appreciated how she tailored her advice to my specific goals. Worth every penny!',
  },
  {
    name: 'Divya Reddy',
    date: 'Mar 2026',
    text: "Kamna is a gem! Her session was transformative for my approach to LinkedIn. She has an incredible understanding of what resonates with audiences and how to tell your story authentically. Her warm, encouraging style made me feel supported throughout. I'm already seeing changes in my engagement!",
  },
  {
    name: 'Siddharth Jain',
    date: 'Dec 2025',
    text: "This was hands down the most valuable 30 minutes I've spent on my personal brand. Kamna's insights are practical, specific, and immediately actionable. She understands the nuances of LinkedIn content better than anyone I've spoken to. If you're serious about building your presence, book a session with her now!",
  },
  {
    name: 'Pooja Singh',
    date: 'Jan 2026',
    text: 'Kamna exceeded all my expectations! Her depth of knowledge about LinkedIn and personal branding is impressive, but what really sets her apart is how she makes you feel heard and understood. She gave me clarity on my content direction and specific strategies to implement. Highly recommend to anyone looking to level up!',
  },
  {
    name: 'Rahul Trivedi',
    date: 'Feb 2026',
    text: "Just had a session with Kamna and I'm blown away by the value she provides. She quickly grasped my situation and gave me tailored advice that I could start using immediately. Her passion for helping people build authentic personal brands really shines through. Definitely booking another session!",
  },
  {
    name: 'Simran Kaur',
    date: 'Mar 2026',
    text: 'Kamna is absolutely brilliant at what she does! In just one session, she helped me see my LinkedIn presence in a completely new light. Her advice was spot-on, practical, and delivered with such genuine care. I walked away feeling empowered and excited about creating content. Thank you, Kamna!',
  },
  {
    name: 'Ayush Pandey',
    date: 'Jan 2026',
    text: 'Had a really productive session with Kamna. She helped me identify my content pillars and gave me a clear framework for consistent posting. What I appreciated most was how she balanced strategy with authenticity — she never suggested anything that felt fake or forced. Great experience overall!',
  },
  {
    name: 'Ishaan Kapoor',
    date: 'Feb 2026',
    text: "Kamna's session was a game-changer for me. I'd been struggling with LinkedIn for months, but in just 30 minutes with her, I got more clarity than in all my previous efforts combined. She has a unique gift for identifying your strengths and showing you how to leverage them. Absolutely worth it!",
  },
  {
    name: 'Aditi Agarwal',
    date: 'Jul 2026',
    text: 'Thankyou so much for guiding me with content creation and with your personal story...it really motivated me a lot and I felt extremely inspired from you..',
  },
  {
    name: 'Samiksha Mishra',
    date: 'Sep 2026',
    text: 'It was helpful.',
  },
  {
    name: 'Anonymous',
    date: 'May 2026',
    text: 'Badhiyaa tha',
  },
]

export const TOPMATE_STATS = [
  { value: '5/5', label: 'Rating' },
  { value: '31', label: 'Ratings' },
  { value: '31', label: 'Testimonials' },
  { value: 'Top 5%', label: 'Creator' },
] as const

export const TOPMATE_SERVICES: TopmateServiceItem[] = [
  { index: '01', name: 'Discovery Call', price: '₹39', duration: '20 min' },
  {
    index: '02',
    name: 'LinkedIn Content Creation',
    price: '₹79',
    duration: '30 min',
  },
  {
    index: '03',
    name: 'Starter Kit',
    price: '₹25',
    duration: 'Discovery Call + Cheat Sheet',
  },
  {
    index: '04',
    name: 'Content Creation Cheat Sheet',
    price: '₹9',
    duration: 'Digital product',
  },
  { index: '05', name: 'Priority DM', price: '₹5', duration: '2-day response' },
]

export const NEWSLETTER_COPY = {
  heading: 'The Newsletter',
  badge: 'Coming Soon',
  sub: "I'm cooking something honest and useful — first issue drops soon. Stay tuned.",
} as const
