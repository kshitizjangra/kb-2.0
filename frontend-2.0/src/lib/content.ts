export const site = {
  name: 'KAMNA BHARDWAJ',
  shortName: 'Kamna',
  discipline: 'Personal Branding & Content Creation',
  firstName: 'KAMNA',
  lastName: 'BHARDWAJ',
  location: 'New Delhi, India',
  email: 'kamnabhardwaj.work@gmail.com',
  copyright: '©2026',
  social: {
    linkedin: 'https://www.linkedin.com/in/kamna-bharadwaj/',
    instagram: 'https://www.instagram.com/thekamnabhardwaj/',
    youtube: 'https://www.youtube.com/@Thekamnabhardwajj',
    medium: 'https://medium.com/@thekamnabhardwaj',
    x: 'https://x.com/KamnaBhardwajj',
    topmate: 'https://topmate.io/kamna_bhardwaj',
  },
} as const

export const nav = [
  { label: 'ABOUT ME', href: '#about' },
  { label: 'SERVICES', href: '#services' },
  { label: 'MY WORK', href: '#work' },
] as const

export const hero = {
  eyebrow: 'Personal Branding & Content Creation',
  name: 'KAMNA BHARDWAJ',
  cta: 'VIEW THE GOODS',
  ctaHref: '#work',
  tagline: 'Building my brand while teaching you to build yours ⭐️',
  subtext: 'Personal brand strategist, content creator, storyteller & ghostwriter.',
} as const

export const whoIAm = {
  label: 'WHO I AM',
  lead: "I'm Kamna — a 21-year-old creator, storyteller and personal branding strategist.",
  emph: 'I build in public, experiment in public, and teach everything I learn about building a brand that sounds like you.',
} as const

export const values = [
  {
    title: 'Build in Public.',
    text: 'No theory, no borrowed playbooks. Every framework I share comes from actually posting, testing and growing, with the receipts to show for it.',
  },
  {
    title: 'Story Over Tactics.',
    text: 'Hooks and templates fade. A point of view that people trust compounds. I start with the story, then make it travel.',
  },
  {
    title: 'Consistency Compounds.',
    text: 'The work that looks overnight took a hundred quiet posts. I help creators and founders build systems they can keep showing up for.',
  },
  {
    title: 'Community First.',
    text: '18K+ people on LinkedIn, 1K+ on Instagram. I treat every comment, DM and client call as a relationship, not a metric.',
  },
] as const

export const aboutCollage = {
  label: 'MORE TO KNOW',
  title: 'More to Know\nABOUT ME',
  paragraphs: [
    "Hi, I'm Kamna, a brand strategist and content creator who is constantly on the move, endlessly inspired by people, culture, and the way one honest story can make a brand unforgettable.",
    'My work spans personal branding, social strategy, content creation, and ghostwriting. I have partnered with brands and founders of all sizes, and what I look for is always the same: authenticity, creativity, and impact that actually lands.',
  ],
  skills: ['Personal Branding', 'LinkedIn Strategy', 'Content Creation', 'Ghostwriting', 'Storytelling'],
  trustedNote: 'TRUSTED BY BRANDS LIKE',
  trustedBrands: 'OPPO, MARS Cosmetics, Minimalist, McDonald’s, Taco Bell, Carvel, Chaayos',
} as const

export const brands = [
  { name: 'OPPO', file: 'oppo.svg' },
  { name: 'MARS Cosmetics', file: 'mars.svg' },
  { name: 'Minimalist', file: 'minimalist.svg' },
  { name: 'McDonald’s', file: 'mcdonalds.svg' },
  { name: 'Taco Bell', file: 'tacobell.svg' },
  { name: 'Carvel', file: 'carvel.png' },
  { name: 'Chaayos', file: 'chaayos.png' },
  { name: 'Me Te Amo', file: 'meteamo.png' },
  { name: 'Kulcha Kulture', file: 'kulchakulture.png' },
  { name: 'Millwize', file: 'millwize.png' },
  { name: 'Swaadly', file: 'swaadly.svg' },
  { name: 'AuliGlow', file: 'auliglow.png' },
  { name: 'KANS India', file: 'kansindia.png' },
  { name: 'Snack Desi', file: 'snackdesi.png' },
  { name: "Moe's Casa", file: 'moescasa.png' },
] as const

export const services = [
  {
    index: '01',
    kicker: 'STRATEGY',
    title: 'Personal Brand\n& LinkedIn Strategy',
    body: 'I help founders, creators and coaches turn what they already know into a personal brand people trust. Positioning, pillars, profile rewrites and a content system you can actually keep up with.',
    tags: ['Personal Branding', 'LinkedIn Strategy', 'Content Pillars', 'Profile Audit', 'Ghostwriting'],
    image: '/assets/portfolio/carousel-01.webp',
    imageAlt: 'Kamna’s LinkedIn content carousel',
  },
  {
    index: '02',
    kicker: 'CREATION',
    title: 'Content Creation\n& Storytelling',
    body: 'I create content that feels natural, useful and platform-ready across reels, carousels, UGC and brand campaigns. Because I understand the strategy behind the post, every asset is built to do a job, not just look good.',
    tags: ['UGC Content', 'Brand Campaigns', 'Reels', 'Carousels', 'Story-led Copy'],
    image: '/assets/portfolio/reel-v2-taco.webp',
    imageAlt: 'Kamna creating a Taco Bell reel',
  },
] as const

export const experience = {
  noteTitle: 'Experience',
  noteBody:
    'My background in content and personal branding lets me work with brands and founders around the world, from first idea to final execution, while collaborating across different industries.',
  label: 'LET’S CONNECT',
  headingA: 'Creative Work',
  headingB: 'THAT DRIVES GROWTH',
  body: 'With 2+ years of experience in personal branding, content and brand campaigns, you can expect a thoughtful approach, clear communication and creative solutions tailored to your brand.',
} as const

export const marketingExperience = {
  label: 'CREATOR EXPERIENCE',
  lead: 'I’ve worked as a content creator and personal branding strategist',
  emph:
    'across consumer, food & beverage, beauty, lifestyle, and travel brands, from short-form UGC and graphic design to full-scale campaign productions.',
  videoLabel: 'VIDEO PROJECTS',
  videoBody:
    'I move easily between strategy and shoot days, making sure ideas look good, feel authentic, and actually work.',
  projects: [
    {
      brand: 'McDonald’s',
      category: 'food & beverage',
      role: 'CONTENT CREATOR, STORYTELLER',
      poster: '/assets/portfolio/reel-02.webp',
      src: '/assets/portfolio/reel-02.mp4',
      href: 'https://www.instagram.com/reel/Db-M5EzJsQA/',
    },
    {
      brand: 'Taco Bell',
      category: 'food & lifestyle',
      role: 'CONTENT CREATOR, PRESENTER',
      poster: '/assets/portfolio/reel-v2-taco.webp',
      src: '/assets/portfolio/reel-v2-taco.mp4',
      href: 'https://www.instagram.com/reel/DdDqdTiBFcP/',
    },
    {
      brand: 'OPPO',
      category: 'technology',
      role: 'CREATOR, BRAND CONTENT',
      poster: '/assets/portfolio/reel-03.webp',
      src: '/assets/portfolio/reel-03.mp4',
      href: 'https://www.instagram.com/reel/Dd09bwQhmgc/',
    },
    {
      brand: 'MARS Cosmetics',
      category: 'beauty & personal care',
      role: 'CREATOR, MAKEUP STORY',
      poster: '/assets/portfolio/reel-01.webp',
      src: '/assets/portfolio/reel-01.mp4',
      href: 'https://www.instagram.com/reel/DYpMyXuNiTF/',
    },
  ],
  campaignLabel: 'BRAND CAMPAIGNS',
  campaignBody:
    'A look at integrated campaigns across digital, social, and creator-led marketing, built to drive visibility and engagement.',
  campaigns: [
    { src: '/assets/portfolio/carousel-02.webp', alt: 'Brand campaign carousel, slide one' },
    { src: '/assets/portfolio/carousel-03.webp', alt: 'Brand campaign carousel, slide two' },
    { src: '/assets/portfolio/feed-DXvzWqTMfIp.webp', alt: 'Instagram feed campaign frame' },
    { src: '/assets/portfolio/feed-DZ10LkGNC-0.webp', alt: 'Instagram feed campaign frame' },
  ],
} as const

export const creatorExperience = {
  label: 'CONTENT CREATION EXPERIENCE',
  lead: 'I’ve been part of lifestyle campaigns, product launches, UGC and brand shoots,',
  emph: 'creating assets designed for modern platforms.',
  colA:
    'Alongside my strategy work, I create for lifestyle, food, beauty and consumer brands with a natural, story-driven approach.',
  colB:
    'With 30+ pieces of content behind me, I have learned how to move naturally on camera, take direction with ease, and bring a calm, positive energy to every shoot. I understand timing, angles and storytelling through subtle expression.',
  envelopeLabel: 'TRUSTED BY BRANDS LIKE',
  envelopeBrands: 'OPPO · MARS · Minimalist · McDonald’s · Taco Bell · Carvel · Chaayos',
  portfolioA: 'On Camera:',
  portfolioB: 'CONTENT PORTFOLIO',
  shots: [
    '/assets/portfolio/reel-01.webp',
    '/assets/portfolio/hero-selected.webp',
    '/assets/portfolio/reel-04.webp',
    '/assets/portfolio/carousel-01-02.webp',
    '/assets/portfolio/carousel-02-02.webp',
    '/assets/portfolio/carousel-03-03.webp',
    '/assets/portfolio/reel-02.webp',
    '/assets/portfolio/reel-03.webp',
  ],
} as const

export const contact = {
  big: 'HIT ME UP NOW',
  titleA: 'Ready to Start?',
  titleB: 'LET’S TALK',
  body:
    'Have a brand, campaign, or idea in mind? I’d love to hear about it. Whether you are looking for personal branding, content, or full creative support, let’s connect and build something that actually moves the needle.',
  listLabel: 'DROP A MESSAGE BELOW AND I’LL GET BACK TO YOU SHORTLY',
  bullets: [
    'Personal brand strategy',
    'Content & UGC creation',
    'LinkedIn profile & systems',
    'Ghostwriting & storytelling',
  ],
  fields: { name: 'Name', email: 'Email', text: 'Text' },
  submit: 'SEND REQUEST',
  sent: 'Message sent, talk soon',
} as const

export const footer = {
  links: [
    { label: 'Email', href: 'mailto:kamnabhardwaj.work@gmail.com' },
    { label: 'LinkedIn', href: site.social.linkedin },
    { label: 'Instagram', href: site.social.instagram },
    { label: 'YouTube', href: site.social.youtube },
    { label: 'Topmate', href: site.social.topmate },
  ],
  location: 'New Delhi, India',
  rights: 'All rights reserved.',
  credit: 'Design v2 · 2026',
} as const
