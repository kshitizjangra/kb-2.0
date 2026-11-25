import {
  aboutCollage,
  brands,
  contact,
  creatorExperience,
  experience,
  footer,
  hero,
  marketingExperience,
  nav,
  services,
  site,
  values,
  whoIAm,
} from '@/lib/content'
import {
  LEAD_MAGNET,
  LINKEDIN_POSTS,
  NEWSLETTER_COPY,
  TESTIMONIALS,
  TOPMATE_SERVICES,
  TOPMATE_STATS,
  TOPMATE_SUMMARY,
} from '@/lib/kamna-data'

export interface CmsValueItem {
  title: string
  text: string
}

export interface CmsServiceItem {
  index: string
  kicker: string
  title: string
  body: string
  tags: string[]
  image: string
  imageAlt: string
}

export interface CmsVideoProject {
  brand: string
  category: string
  role: string
  poster: string
  src: string
  href: string
}

export interface CmsCampaignShot {
  src: string
  alt: string
}

export interface CmsLinkedInPost {
  urn: string
  title: string
  summary: string
}

export interface CmsTestimonial {
  name: string
  date: string
  text: string
}

export interface CmsTopmateService {
  name: string
  price: string
  duration: string
}

export interface CmsSectionToggles {
  showWhoIAm: boolean
  showAboutCollage: boolean
  showServices: boolean
  showExperience: boolean
  showWork: boolean
  showLinkedIn: boolean
  showCreatorLife: boolean
  showFreeResource: boolean
  showTestimonials: boolean
  showTopmate: boolean
  showNewsletter: boolean
  showContact: boolean
}

export interface SiteCmsData {
  site: {
    name: string
    shortName: string
    discipline: string
    location: string
    email: string
    copyright: string
    headerAvatar: string
    social: {
      linkedin: string
      instagram: string
      youtube: string
      medium: string
      x: string
      topmate: string
    }
  }
  hero: {
    eyebrow: string
    name: string
    cta: string
    ctaHref: string
    polaroidImage: string
    polaroidPreviewVideo: string
    stampMainImage: string
    stampSmallImage: string
    stampSmallPreviewVideo: string
    postmarkTop: string
    postmarkBottom: string
  }
  whoIAm: {
    label: string
    lead: string
    emph: string
    stampImage: string
    stampPreviewVideo: string
    values: CmsValueItem[]
  }
  aboutCollage: {
    title: string
    paragraphs: string[]
    skills: string[]
    idPhoto: string
    idSerial: string
    idRole: string
    idPlace: string
    boardingRoute: string
    boardingMeta: string
    polaroidA: string
    polaroidAPreviewVideo: string
    polaroidB: string
    polaroidBPreviewVideo: string
    trustedNote: string
    trustedBrands: string
  }
  services: CmsServiceItem[]
  experience: {
    noteTitle: string
    noteBody: string
    stampImage: string
    headingA: string
    headingB: string
    body: string
    ctaLabel: string
  }
  work: {
    label: string
    lead: string
    emph: string
    stickyNote: string
    videoLabel: string
    videoBody: string
    projects: CmsVideoProject[]
    campaignLabel: string
    campaignBody: string
    campaigns: CmsCampaignShot[]
  }
  linkedin: {
    eyebrow: string
    heading: string
    posts: CmsLinkedInPost[]
  }
  creatorLife: {
    label: string
    lead: string
    emph: string
    colA: string
    colB: string
    envelopeLabel: string
    envelopeBrands: string
    portfolioA: string
    portfolioB: string
    ribbonText: string
    shots: { image: string; previewVideo?: string }[]
  }
  freeResource: {
    eyebrow: string
    title: string
    description: string
    joined: string
    quote: string
    cta: string
    pdfUrl: string
  }
  testimonials: {
    eyebrow: string
    rating: string
    count: string
    badges: string[]
    topmateUrl: string
    items: CmsTestimonial[]
  }
  topmate: {
    eyebrow: string
    heading: string
    body: string
    topmateUrl: string
    stats: { value: string; label: string }[]
    badges: string[]
    services: CmsTopmateService[]
  }
  newsletter: {
    kicker: string
    heading: string
    headingAccent: string
    badge: string
    sub: string
  }
  contact: {
    big: string
    titleA: string
    titleB: string
    body: string
    listLabel: string
    bullets: string[]
    submit: string
    sent: string
    bigPhoto: string
    bigPreviewVideo: string
    smallPhotos: { image: string; previewVideo?: string }[]
  }
  toggles: CmsSectionToggles
}

export const DEFAULT_CMS_DATA: SiteCmsData = {
  site: {
    name: site.name,
    shortName: site.shortName,
    discipline: site.discipline,
    location: site.location,
    email: site.email,
    copyright: site.copyright,
    headerAvatar: '/kamna.jpg',
    social: { ...site.social },
  },
  hero: {
    eyebrow: hero.eyebrow,
    name: hero.name,
    cta: hero.cta,
    ctaHref: hero.ctaHref,
    polaroidImage: '/assets/portfolio/carousel-01.webp',
    polaroidPreviewVideo: '/assets/portfolio/intro-v2.mp4',
    stampMainImage: '/assets/portfolio/carousel-01-02.webp',
    stampSmallImage: '/assets/portfolio/reel-01.webp',
    stampSmallPreviewVideo: '/assets/portfolio/reel-01.mp4',
    postmarkTop: 'NEW DELHI',
    postmarkBottom: 'INDIA',
  },
  whoIAm: {
    label: whoIAm.label,
    lead: whoIAm.lead,
    emph: whoIAm.emph,
    stampImage: '/assets/portfolio/reel-01.webp',
    stampPreviewVideo: '/assets/portfolio/reel-01.mp4',
    values: values.map((v) => ({ title: v.title, text: v.text })),
  },
  aboutCollage: {
    title: aboutCollage.title,
    paragraphs: [...aboutCollage.paragraphs],
    skills: [...aboutCollage.skills],
    idPhoto: '/kamna.jpg',
    idSerial: 'Identification Card No. KB-2026',
    idRole: 'Personal Brand Strategist',
    idPlace: 'New Delhi, India',
    boardingRoute: 'DEL → BOM',
    boardingMeta: 'Gate 04 · Seat 21A · 12:05',
    polaroidA: '/assets/portfolio/carousel-01.webp',
    polaroidAPreviewVideo: '/assets/portfolio/intro-v2.mp4',
    polaroidB: '/assets/portfolio/reel-01.webp',
    polaroidBPreviewVideo: '/assets/portfolio/reel-01.mp4',
    trustedNote: aboutCollage.trustedNote,
    trustedBrands: aboutCollage.trustedBrands,
  },
  services: services.map((s) => ({
    index: s.index,
    kicker: s.kicker,
    title: s.title,
    body: s.body,
    tags: [...s.tags],
    image: s.image,
    imageAlt: s.imageAlt,
  })),
  experience: {
    noteTitle: experience.noteTitle,
    noteBody: experience.noteBody,
    stampImage: '/assets/portfolio/reel-04.webp',
    headingA: experience.headingA,
    headingB: experience.headingB,
    body: experience.body,
    ctaLabel: experience.label,
  },
  work: {
    label: marketingExperience.label,
    lead: marketingExperience.lead,
    emph: marketingExperience.emph,
    stickyNote: 'PERSONAL BRANDING · LINKEDIN · UGC',
    videoLabel: marketingExperience.videoLabel,
    videoBody: marketingExperience.videoBody,
    projects: marketingExperience.projects.map((p) => ({ ...p })),
    campaignLabel: marketingExperience.campaignLabel,
    campaignBody: marketingExperience.campaignBody,
    campaigns: marketingExperience.campaigns.map((c) => ({ ...c })),
  },
  linkedin: {
    eyebrow: 'LINKEDIN · 18K+ COMMUNITY',
    heading: 'Thoughts on content, personal branding and figuring things out in public.',
    posts: LINKEDIN_POSTS.map((p) => ({
      urn: p.urn,
      title: p.title,
      summary: p.summary,
    })),
  },
  creatorLife: {
    label: creatorExperience.label,
    lead: creatorExperience.lead,
    emph: creatorExperience.emph,
    colA: creatorExperience.colA,
    colB: creatorExperience.colB,
    envelopeLabel: creatorExperience.envelopeLabel,
    envelopeBrands: creatorExperience.envelopeBrands,
    portfolioA: creatorExperience.portfolioA,
    portfolioB: creatorExperience.portfolioB,
    ribbonText: 'SELECTED WORK',
    shots: [
      { image: '/assets/portfolio/reel-01.webp', previewVideo: '/assets/portfolio/reel-01.mp4' },
      { image: '/assets/portfolio/hero.webp', previewVideo: '/assets/portfolio/hero.mp4' },
      { image: '/assets/portfolio/carousel-01.webp', previewVideo: '/assets/portfolio/intro-v2.mp4' },
      { image: '/assets/portfolio/intro-v2.webp', previewVideo: '/assets/portfolio/intro-v2.mp4' },
      { image: '/assets/portfolio/carousel-02.webp' },
      { image: '/assets/portfolio/carousel-03.webp' },
      { image: '/assets/portfolio/reel-02.webp', previewVideo: '/assets/portfolio/reel-02.mp4' },
      { image: '/assets/portfolio/reel-03.webp', previewVideo: '/assets/portfolio/reel-03.mp4' },
    ],
  },
  freeResource: {
    eyebrow: LEAD_MAGNET.eyebrow,
    title: LEAD_MAGNET.title,
    description: LEAD_MAGNET.description,
    joined: LEAD_MAGNET.joined,
    quote: LEAD_MAGNET.quote,
    cta: LEAD_MAGNET.cta,
    pdfUrl: LEAD_MAGNET.pdfUrl,
  },
  testimonials: {
    eyebrow: 'WHAT THEY SAY',
    rating: TOPMATE_SUMMARY.rating,
    count: TOPMATE_SUMMARY.count,
    badges: [...TOPMATE_SUMMARY.badges],
    topmateUrl: TOPMATE_SUMMARY.url,
    items: TESTIMONIALS.map((t) => ({ ...t })),
  },
  topmate: {
    eyebrow: 'TOPMATE · TOP 5% CREATOR',
    heading: 'Work With Me 1:1',
    body: 'Have a story to tell, a LinkedIn presence to sharpen, or a creator roadmap to build? Book a focused 1:1 session or grab the cheat sheet on Topmate.',
    topmateUrl: TOPMATE_SUMMARY.url,
    stats: TOPMATE_STATS.map((s) => ({ ...s })),
    badges: ["People's Choice", 'Community Care'],
    services: TOPMATE_SERVICES.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.duration,
    })),
  },
  newsletter: {
    kicker: 'DISPATCH · NEW DELHI',
    heading: NEWSLETTER_COPY.heading,
    headingAccent: NEWSLETTER_COPY.badge,
    badge: NEWSLETTER_COPY.badge,
    sub: NEWSLETTER_COPY.sub,
  },
  contact: {
    big: contact.big,
    titleA: contact.titleA,
    titleB: contact.titleB,
    body: contact.body,
    listLabel: contact.listLabel,
    bullets: [...contact.bullets],
    submit: contact.submit,
    sent: contact.sent,
    bigPhoto: '/assets/portfolio/hero.webp',
    bigPreviewVideo: '/assets/portfolio/hero.mp4',
    smallPhotos: [
      { image: '/assets/portfolio/reel-01.webp', previewVideo: '/assets/portfolio/reel-01.mp4' },
      { image: '/assets/portfolio/carousel-02-02.webp' },
      { image: '/assets/portfolio/reel-v2-taco.webp', previewVideo: '/assets/portfolio/reel-v2-taco.mp4' },
    ],
  },
  toggles: {
    showWhoIAm: true,
    showAboutCollage: true,
    showServices: true,
    showExperience: true,
    showWork: true,
    showLinkedIn: true,
    showCreatorLife: true,
    showFreeResource: true,
    showTestimonials: true,
    showTopmate: true,
    showNewsletter: true,
    showContact: true,
  },
}

export const ALL_BRANDS = [...brands, { name: 'Cafe Hawkers', file: 'cafehawkers.svg' }]
export const NAV_LINKS = [...nav]
export const FOOTER_DEFAULTS = footer
