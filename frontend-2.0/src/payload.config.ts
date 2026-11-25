import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { BlogPosts } from './collections/BlogPosts'
import { Inquiries } from './collections/Inquiries'
import { Media } from './collections/Media'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { VideoProjects } from './collections/VideoProjects'
import { SiteContent } from './globals/SiteContent'
import { FALLBACK_BLOG_POSTS } from './lib/blog-data'
import { DEFAULT_CMS_DATA } from './lib/cms-schema'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

try {
  fs.mkdirSync(path.resolve(process.cwd(), 'data'), { recursive: true })
  fs.mkdirSync(path.resolve(process.cwd(), 'public/uploads'), { recursive: true })
} catch {
  // Ignore if filesystem is read-only during static analysis
}

function buildInitialSiteContentData() {
  const d = DEFAULT_CMS_DATA
  return {
    siteName: d.site.name,
    shortName: d.site.shortName,
    discipline: d.site.discipline,
    location: d.site.location,
    email: d.site.email,
    copyright: d.site.copyright,
    headerAvatar: d.site.headerAvatar,
    heroEyebrow: d.hero.eyebrow,
    heroName: d.hero.name,
    heroCta: d.hero.cta,
    heroCtaHref: d.hero.ctaHref,
    heroPolaroidImage: d.hero.polaroidImage,
    heroPolaroidVideo: d.hero.polaroidPreviewVideo,
    heroStampMainImage: d.hero.stampMainImage,
    heroStampSmallImage: d.hero.stampSmallImage,
    heroStampSmallVideo: d.hero.stampSmallPreviewVideo,
    postmarkTop: d.hero.postmarkTop,
    postmarkBottom: d.hero.postmarkBottom,
    social: { ...d.site.social },

    whoLabel: d.whoIAm.label,
    whoLead: d.whoIAm.lead,
    whoEmph: d.whoIAm.emph,
    whoStampImage: d.whoIAm.stampImage,
    whoStampVideo: d.whoIAm.stampPreviewVideo,
    values: d.whoIAm.values.map((v) => ({ title: v.title, text: v.text })),

    aboutTitle: d.aboutCollage.title,
    aboutParagraphs: d.aboutCollage.paragraphs.map((text) => ({ text })),
    aboutSkills: d.aboutCollage.skills.map((skill) => ({ skill })),
    idPhoto: d.aboutCollage.idPhoto,
    idSerial: d.aboutCollage.idSerial,
    idRole: d.aboutCollage.idRole,
    idPlace: d.aboutCollage.idPlace,
    boardingRoute: d.aboutCollage.boardingRoute,
    boardingMeta: d.aboutCollage.boardingMeta,
    polaroidA: d.aboutCollage.polaroidA,
    polaroidAVideo: d.aboutCollage.polaroidAPreviewVideo,
    polaroidB: d.aboutCollage.polaroidB,
    polaroidBVideo: d.aboutCollage.polaroidBPreviewVideo,
    trustedNote: d.aboutCollage.trustedNote,
    trustedBrands: d.aboutCollage.trustedBrands,

    services: d.services.map((s) => ({
      index: s.index,
      kicker: s.kicker,
      title: s.title,
      body: s.body,
      tags: s.tags.map((tag) => ({ tag })),
      imagePath: s.image,
      imageAlt: s.imageAlt,
    })),

    expNoteTitle: d.experience.noteTitle,
    expNoteBody: d.experience.noteBody,
    expStampImage: d.experience.stampImage,
    expHeadingA: d.experience.headingA,
    expHeadingB: d.experience.headingB,
    expBody: d.experience.body,
    expCtaLabel: d.experience.ctaLabel,
    workLabel: d.work.label,
    workLead: d.work.lead,
    workEmph: d.work.emph,
    stickyNote: d.work.stickyNote,
    videoLabel: d.work.videoLabel,
    videoBody: d.work.videoBody,
    campaignLabel: d.work.campaignLabel,
    campaignBody: d.work.campaignBody,
    campaigns: d.work.campaigns.map((c) => ({
      imagePath: c.src,
      alt: c.alt,
    })),

    creatorLabel: d.creatorLife.label,
    creatorLead: d.creatorLife.lead,
    creatorEmph: d.creatorLife.emph,
    creatorColA: d.creatorLife.colA,
    creatorColB: d.creatorLife.colB,
    envelopeLabel: d.creatorLife.envelopeLabel,
    envelopeBrands: d.creatorLife.envelopeBrands,
    portfolioA: d.creatorLife.portfolioA,
    portfolioB: d.creatorLife.portfolioB,
    ribbonText: d.creatorLife.ribbonText,
    envelopeShots: d.creatorLife.shots.map((shot) => ({
      imagePath: shot.image,
      videoPath: shot.previewVideo ?? '',
    })),
    linkedinEyebrow: d.linkedin.eyebrow,
    linkedinHeading: d.linkedin.heading,
    linkedinPosts: d.linkedin.posts.map((p) => ({
      urn: p.urn,
      title: p.title,
      summary: p.summary,
    })),

    freeEyebrow: d.freeResource.eyebrow,
    freeTitle: d.freeResource.title,
    freeDescription: d.freeResource.description,
    freeJoined: d.freeResource.joined,
    freeQuote: d.freeResource.quote,
    freeCta: d.freeResource.cta,
    freePdfPath: d.freeResource.pdfUrl,
    testimonialsEyebrow: d.testimonials.eyebrow,
    testimonialsRating: d.testimonials.rating,
    testimonialsCount: d.testimonials.count,
    testimonialsBadges: d.testimonials.badges.map((badge) => ({ badge })),
    topmateEyebrow: d.topmate.eyebrow,
    topmateHeading: d.topmate.heading,
    topmateBody: d.topmate.body,
    topmateUrl: d.topmate.topmateUrl,
    topmateStats: d.topmate.stats.map((s) => ({ value: s.value, label: s.label })),
    topmateBadges: d.topmate.badges.map((badge) => ({ badge })),
    topmateServices: d.topmate.services.map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.duration,
    })),
    newsletterKicker: d.newsletter.kicker,
    newsletterHeading: d.newsletter.heading,
    newsletterHeadingAccent: d.newsletter.headingAccent,
    newsletterBadge: d.newsletter.badge,
    newsletterSub: d.newsletter.sub,

    contactBig: d.contact.big,
    contactTitleA: d.contact.titleA,
    contactTitleB: d.contact.titleB,
    contactBody: d.contact.body,
    contactListLabel: d.contact.listLabel,
    contactBullets: d.contact.bullets.map((text) => ({ text })),
    contactSubmit: d.contact.submit,
    contactSent: d.contact.sent,
    contactBigPhoto: d.contact.bigPhoto,
    contactBigVideo: d.contact.bigPreviewVideo,
    contactSmallPhotos: d.contact.smallPhotos.map((shot) => ({
      imagePath: shot.image,
      videoPath: shot.previewVideo ?? '',
    })),
    toggles: { ...d.toggles },
  }
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' | Kamna CMS',
    },
  },
  routes: {
    admin: '/cms',
    api: '/api/payload',
  },
  collections: [Users, Media, VideoProjects, BlogPosts, Testimonials, Inquiries],
  globals: [SiteContent],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'kamna-portfolio-payload-secret-2026',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./data/payload.db',
    },
  }),
  sharp,
  onInit: async (payload) => {
    try {
      const users = await payload.find({ collection: 'users', limit: 1 })
      if (users.totalDocs === 0) {
        await payload.create({
          collection: 'users',
          data: {
            email: 'kamna@thekamnabhardwaj.com',
            password: 'kamna2026',
            name: 'Kamna Bhardwaj',
            role: 'owner',
          },
        })
      }

      const existingSite = await payload.findGlobal({ slug: 'site-content' })
      if (!existingSite?.siteName) {
        await payload.updateGlobal({
          slug: 'site-content',
          data: buildInitialSiteContentData(),
        })
      }

      const videos = await payload.find({ collection: 'video-projects', limit: 1 })
      if (videos.totalDocs === 0) {
        for (let i = 0; i < DEFAULT_CMS_DATA.work.projects.length; i += 1) {
          const project = DEFAULT_CMS_DATA.work.projects[i]
          await payload.create({
            collection: 'video-projects',
            data: {
              brand: project.brand,
              category: project.category,
              role: project.role,
              instagramUrl: project.href,
              posterPath: project.poster,
              videoPath: project.src,
              sortOrder: i + 1,
              isActive: true,
            },
          })
        }
      }

      const testimonials = await payload.find({ collection: 'testimonials', limit: 1 })
      if (testimonials.totalDocs === 0) {
        for (let i = 0; i < DEFAULT_CMS_DATA.testimonials.items.length; i += 1) {
          const item = DEFAULT_CMS_DATA.testimonials.items[i]
          await payload.create({
            collection: 'testimonials',
            data: {
              name: item.name,
              date: item.date,
              text: item.text,
              sortOrder: i + 1,
              isVisible: true,
            },
          })
        }
      }

      const posts = await payload.find({ collection: 'blog-posts', limit: 1 })
      if (posts.totalDocs === 0) {
        for (const post of FALLBACK_BLOG_POSTS) {
          await payload.create({
            collection: 'blog-posts',
            data: {
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              coverImage: post.coverImage,
              publishedAt: post.publishedAt
                ? `${post.publishedAt}T00:00:00.000Z`
                : undefined,
              bodyHtml: post.bodyHtml,
              isPublished: true,
            },
          })
        }
      }
    } catch (err) {
      payload.logger.error({ err, msg: 'Payload onInit seeding skipped due to error' })
    }
  },
})
