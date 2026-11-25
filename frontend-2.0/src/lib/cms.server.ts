import config from '@payload-config'
import { getPayload } from 'payload'
import { type BlogPost, FALLBACK_BLOG_POSTS } from './blog-data'
import { DEFAULT_CMS_DATA, type SiteCmsData } from './cms-schema'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickStr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function pickOptionalStr(value: unknown, fallback?: string): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) return value
  return fallback
}

function resolveMedia(upload: unknown, fallbackPath: unknown, defaultValue = ''): string {
  if (isRecord(upload) && typeof upload.url === 'string' && upload.url.trim().length > 0) {
    return upload.url
  }
  if (typeof fallbackPath === 'string' && fallbackPath.trim().length > 0) {
    return fallbackPath
  }
  return defaultValue
}

function resolveOptionalMedia(
  upload: unknown,
  fallbackPath: unknown,
  defaultValue?: string,
): string | undefined {
  const resolved = resolveMedia(upload, fallbackPath, defaultValue ?? '')
  return resolved.length > 0 ? resolved : undefined
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function mapArray<T>(
  raw: unknown,
  mapper: (item: UnknownRecord, index: number) => T | null,
  fallback: T[],
): T[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback
  const mapped = raw
    .filter(isRecord)
    .map((item, idx) => mapper(item, idx))
    .filter((item): item is T => item !== null)
  return mapped.length > 0 ? mapped : fallback
}

function toNumericId(rawId: unknown, index: number): number {
  if (typeof rawId === 'number' && Number.isFinite(rawId)) return rawId
  if (typeof rawId === 'string') {
    const parsed = Number(rawId)
    if (Number.isFinite(parsed)) return parsed
  }
  return index + 1
}

function mapPayloadBlogDoc(doc: UnknownRecord, index: number): BlogPost {
  const publishedRaw = typeof doc.publishedAt === 'string' ? doc.publishedAt : null
  const publishedAt = publishedRaw ? publishedRaw.slice(0, 10) : null
  return {
    id: toNumericId(doc.id, index),
    title: pickStr(doc.title, 'Untitled Post'),
    slug: pickStr(doc.slug, `post-${index + 1}`),
    excerpt: pickStr(doc.excerpt, ''),
    coverImage: resolveMedia(doc.coverUpload, doc.coverImage, '/blog/cover-1.jpg'),
    authorName: 'Kamna Bhardwaj',
    authorPhoto: '/blog/author-kamna.jpg',
    publishedAt,
    bodyHtml: pickStr(doc.bodyHtml, ''),
  }
}

export async function getSiteCmsData(): Promise<SiteCmsData> {
  const d = DEFAULT_CMS_DATA
  try {
    const payload = await getPayload({ config })

    const [globalRaw, videoRes, testimonialRes] = await Promise.all([
      payload.findGlobal({ slug: 'site-content', depth: 1 }),
      payload.find({
        collection: 'video-projects',
        where: { isActive: { equals: true } },
        sort: 'sortOrder',
        limit: 100,
        depth: 1,
      }),
      payload.find({
        collection: 'testimonials',
        where: { isVisible: { equals: true } },
        sort: 'sortOrder',
        limit: 200,
      }),
    ])

    const g: UnknownRecord = isRecord(globalRaw) ? globalRaw : {}
    const socialRaw = isRecord(g.social) ? g.social : {}
    const togglesRaw = isRecord(g.toggles) ? g.toggles : {}

    const projects =
      videoRes.docs.length > 0
        ? videoRes.docs.map((doc) => {
            const rec = doc as unknown as UnknownRecord
            return {
              brand: pickStr(rec.brand, ''),
              category: pickStr(rec.category, ''),
              role: pickStr(rec.role, ''),
              poster: resolveMedia(rec.posterUpload, rec.posterPath),
              src: resolveMedia(rec.videoUpload, rec.videoPath),
              href: pickStr(rec.instagramUrl, '#'),
            }
          })
        : d.work.projects

    const testimonialItems =
      testimonialRes.docs.length > 0
        ? testimonialRes.docs.map((doc) => {
            const rec = doc as unknown as UnknownRecord
            return {
              name: pickStr(rec.name, ''),
              date: pickStr(rec.date, ''),
              text: pickStr(rec.text, ''),
            }
          })
        : d.testimonials.items

    return {
      site: {
        name: pickStr(g.siteName, d.site.name),
        shortName: pickStr(g.shortName, d.site.shortName),
        discipline: pickStr(g.discipline, d.site.discipline),
        location: pickStr(g.location, d.site.location),
        email: pickStr(g.email, d.site.email),
        copyright: pickStr(g.copyright, d.site.copyright),
        headerAvatar: resolveMedia(g.headerAvatarUpload, g.headerAvatar, d.site.headerAvatar),
        social: {
          linkedin: pickStr(socialRaw.linkedin, d.site.social.linkedin),
          instagram: pickStr(socialRaw.instagram, d.site.social.instagram),
          youtube: pickStr(socialRaw.youtube, d.site.social.youtube),
          medium: pickStr(socialRaw.medium, d.site.social.medium),
          x: pickStr(socialRaw.x, d.site.social.x),
          topmate: pickStr(socialRaw.topmate, d.site.social.topmate),
        },
      },
      hero: {
        eyebrow: pickStr(g.heroEyebrow, d.hero.eyebrow),
        name: pickStr(g.heroName, d.hero.name),
        cta: pickStr(g.heroCta, d.hero.cta),
        ctaHref: pickStr(g.heroCtaHref, d.hero.ctaHref),
        polaroidImage: resolveMedia(
          g.heroPolaroidImageUpload,
          g.heroPolaroidImage,
          d.hero.polaroidImage,
        ),
        polaroidPreviewVideo: resolveMedia(
          g.heroPolaroidVideoUpload,
          g.heroPolaroidVideo,
          d.hero.polaroidPreviewVideo,
        ),
        stampMainImage: resolveMedia(
          g.heroStampMainImageUpload,
          g.heroStampMainImage,
          d.hero.stampMainImage,
        ),
        stampSmallImage: resolveMedia(
          g.heroStampSmallImageUpload,
          g.heroStampSmallImage,
          d.hero.stampSmallImage,
        ),
        stampSmallPreviewVideo: resolveMedia(
          g.heroStampSmallVideoUpload,
          g.heroStampSmallVideo,
          d.hero.stampSmallPreviewVideo,
        ),
        postmarkTop: pickStr(g.postmarkTop, d.hero.postmarkTop),
        postmarkBottom: pickStr(g.postmarkBottom, d.hero.postmarkBottom),
      },
      whoIAm: {
        label: pickStr(g.whoLabel, d.whoIAm.label),
        lead: pickStr(g.whoLead, d.whoIAm.lead),
        emph: pickStr(g.whoEmph, d.whoIAm.emph),
        stampImage: resolveMedia(g.whoStampImageUpload, g.whoStampImage, d.whoIAm.stampImage),
        stampPreviewVideo: resolveMedia(
          g.whoStampVideoUpload,
          g.whoStampVideo,
          d.whoIAm.stampPreviewVideo,
        ),
        values: mapArray(
          g.values,
          (item) => ({
            title: pickStr(item.title, ''),
            text: pickStr(item.text, ''),
          }),
          d.whoIAm.values,
        ),
      },
      aboutCollage: {
        title: pickStr(g.aboutTitle, d.aboutCollage.title),
        paragraphs: mapArray(
          g.aboutParagraphs,
          (item) => (typeof item.text === 'string' && item.text.trim() ? item.text : null),
          d.aboutCollage.paragraphs,
        ),
        skills: mapArray(
          g.aboutSkills,
          (item) => (typeof item.skill === 'string' && item.skill.trim() ? item.skill : null),
          d.aboutCollage.skills,
        ),
        idPhoto: resolveMedia(g.idPhotoUpload, g.idPhoto, d.aboutCollage.idPhoto),
        idSerial: pickStr(g.idSerial, d.aboutCollage.idSerial),
        idRole: pickStr(g.idRole, d.aboutCollage.idRole),
        idPlace: pickStr(g.idPlace, d.aboutCollage.idPlace),
        boardingRoute: pickStr(g.boardingRoute, d.aboutCollage.boardingRoute),
        boardingMeta: pickStr(g.boardingMeta, d.aboutCollage.boardingMeta),
        polaroidA: resolveMedia(g.polaroidAUpload, g.polaroidA, d.aboutCollage.polaroidA),
        polaroidAPreviewVideo: resolveMedia(
          g.polaroidAVideoUpload,
          g.polaroidAVideo,
          d.aboutCollage.polaroidAPreviewVideo,
        ),
        polaroidB: resolveMedia(g.polaroidBUpload, g.polaroidB, d.aboutCollage.polaroidB),
        polaroidBPreviewVideo: resolveMedia(
          g.polaroidBVideoUpload,
          g.polaroidBVideo,
          d.aboutCollage.polaroidBPreviewVideo,
        ),
        trustedNote: pickStr(g.trustedNote, d.aboutCollage.trustedNote),
        trustedBrands: pickStr(g.trustedBrands, d.aboutCollage.trustedBrands),
      },
      services: mapArray(
        g.services,
        (item, idx) => {
          const fallback = d.services[idx] ?? d.services[0]
          return {
            index: pickStr(item.index, fallback.index),
            kicker: pickStr(item.kicker, fallback.kicker),
            title: pickStr(item.title, fallback.title),
            body: pickStr(item.body, fallback.body),
            tags: mapArray(
              item.tags,
              (t) => (typeof t.tag === 'string' && t.tag.trim() ? t.tag : null),
              fallback.tags,
            ),
            image: resolveMedia(item.imageUpload, item.imagePath, fallback.image),
            imageAlt: pickStr(item.imageAlt, fallback.imageAlt),
          }
        },
        d.services,
      ),
      experience: {
        noteTitle: pickStr(g.expNoteTitle, d.experience.noteTitle),
        noteBody: pickStr(g.expNoteBody, d.experience.noteBody),
        stampImage: resolveMedia(
          g.expStampImageUpload,
          g.expStampImage,
          d.experience.stampImage,
        ),
        headingA: pickStr(g.expHeadingA, d.experience.headingA),
        headingB: pickStr(g.expHeadingB, d.experience.headingB),
        body: pickStr(g.expBody, d.experience.body),
        ctaLabel: pickStr(g.expCtaLabel, d.experience.ctaLabel),
      },
      work: {
        label: pickStr(g.workLabel, d.work.label),
        lead: pickStr(g.workLead, d.work.lead),
        emph: pickStr(g.workEmph, d.work.emph),
        stickyNote: pickStr(g.stickyNote, d.work.stickyNote),
        videoLabel: pickStr(g.videoLabel, d.work.videoLabel),
        videoBody: pickStr(g.videoBody, d.work.videoBody),
        projects,
        campaignLabel: pickStr(g.campaignLabel, d.work.campaignLabel),
        campaignBody: pickStr(g.campaignBody, d.work.campaignBody),
        campaigns: mapArray(
          g.campaigns,
          (item, idx) => {
            const fallback = d.work.campaigns[idx]
            const src = resolveMedia(item.imageUpload, item.imagePath, fallback?.src ?? '')
            if (!src) return null
            return {
              src,
              alt: pickStr(item.alt, fallback?.alt ?? ''),
            }
          },
          d.work.campaigns,
        ),
      },
      linkedin: {
        eyebrow: pickStr(g.linkedinEyebrow, d.linkedin.eyebrow),
        heading: pickStr(g.linkedinHeading, d.linkedin.heading),
        posts: mapArray(
          g.linkedinPosts,
          (item) => ({
            urn: pickStr(item.urn, ''),
            title: pickStr(item.title, ''),
            summary: pickStr(item.summary, ''),
          }),
          d.linkedin.posts,
        ),
      },
      creatorLife: {
        label: pickStr(g.creatorLabel, d.creatorLife.label),
        lead: pickStr(g.creatorLead, d.creatorLife.lead),
        emph: pickStr(g.creatorEmph, d.creatorLife.emph),
        colA: pickStr(g.creatorColA, d.creatorLife.colA),
        colB: pickStr(g.creatorColB, d.creatorLife.colB),
        envelopeLabel: pickStr(g.envelopeLabel, d.creatorLife.envelopeLabel),
        envelopeBrands: pickStr(g.envelopeBrands, d.creatorLife.envelopeBrands),
        portfolioA: pickStr(g.portfolioA, d.creatorLife.portfolioA),
        portfolioB: pickStr(g.portfolioB, d.creatorLife.portfolioB),
        ribbonText: pickStr(g.ribbonText, d.creatorLife.ribbonText),
        shots: mapArray(
          g.envelopeShots,
          (item, idx) => {
            const fallback = d.creatorLife.shots[idx]
            const image = resolveMedia(item.imageUpload, item.imagePath, fallback?.image ?? '')
            if (!image) return null
            const previewVideo = resolveOptionalMedia(
              item.videoUpload,
              item.videoPath,
              fallback?.previewVideo,
            )
            return { image, ...(previewVideo ? { previewVideo } : {}) }
          },
          d.creatorLife.shots,
        ),
      },
      freeResource: {
        eyebrow: pickStr(g.freeEyebrow, d.freeResource.eyebrow),
        title: pickStr(g.freeTitle, d.freeResource.title),
        description: pickStr(g.freeDescription, d.freeResource.description),
        joined: pickStr(g.freeJoined, d.freeResource.joined),
        quote: pickStr(g.freeQuote, d.freeResource.quote),
        cta: pickStr(g.freeCta, d.freeResource.cta),
        pdfUrl: resolveMedia(g.freePdfUpload, g.freePdfPath, d.freeResource.pdfUrl),
      },
      testimonials: {
        eyebrow: pickStr(g.testimonialsEyebrow, d.testimonials.eyebrow),
        rating: pickStr(g.testimonialsRating, d.testimonials.rating),
        count: pickStr(g.testimonialsCount, d.testimonials.count),
        badges: mapArray(
          g.testimonialsBadges,
          (item) => (typeof item.badge === 'string' && item.badge.trim() ? item.badge : null),
          d.testimonials.badges,
        ),
        topmateUrl: pickStr(g.topmateUrl, d.testimonials.topmateUrl),
        items: testimonialItems,
      },
      topmate: {
        eyebrow: pickStr(g.topmateEyebrow, d.topmate.eyebrow),
        heading: pickStr(g.topmateHeading, d.topmate.heading),
        body: pickStr(g.topmateBody, d.topmate.body),
        topmateUrl: pickStr(g.topmateUrl, d.topmate.topmateUrl),
        stats: mapArray(
          g.topmateStats,
          (item) => ({
            value: pickStr(item.value, ''),
            label: pickStr(item.label, ''),
          }),
          d.topmate.stats,
        ),
        badges: mapArray(
          g.topmateBadges,
          (item) => (typeof item.badge === 'string' && item.badge.trim() ? item.badge : null),
          d.topmate.badges,
        ),
        services: mapArray(
          g.topmateServices,
          (item) => ({
            name: pickStr(item.name, ''),
            price: pickStr(item.price, ''),
            duration: pickStr(item.duration, ''),
          }),
          d.topmate.services,
        ),
      },
      newsletter: {
        kicker: pickStr(g.newsletterKicker, d.newsletter.kicker),
        heading: pickStr(g.newsletterHeading, d.newsletter.heading),
        headingAccent: pickStr(g.newsletterHeadingAccent, d.newsletter.headingAccent),
        badge: pickStr(g.newsletterBadge, d.newsletter.badge),
        sub: pickStr(g.newsletterSub, d.newsletter.sub),
      },
      contact: {
        big: pickStr(g.contactBig, d.contact.big),
        titleA: pickStr(g.contactTitleA, d.contact.titleA),
        titleB: pickStr(g.contactTitleB, d.contact.titleB),
        body: pickStr(g.contactBody, d.contact.body),
        listLabel: pickStr(g.contactListLabel, d.contact.listLabel),
        bullets: mapArray(
          g.contactBullets,
          (item) => (typeof item.text === 'string' && item.text.trim() ? item.text : null),
          d.contact.bullets,
        ),
        submit: pickStr(g.contactSubmit, d.contact.submit),
        sent: pickStr(g.contactSent, d.contact.sent),
        bigPhoto: resolveMedia(g.contactBigPhotoUpload, g.contactBigPhoto, d.contact.bigPhoto),
        bigPreviewVideo: resolveMedia(
          g.contactBigVideoUpload,
          g.contactBigVideo,
          d.contact.bigPreviewVideo,
        ),
        smallPhotos: mapArray(
          g.contactSmallPhotos,
          (item, idx) => {
            const fallback = d.contact.smallPhotos[idx]
            const image = resolveMedia(item.imageUpload, item.imagePath, fallback?.image ?? '')
            if (!image) return null
            const previewVideo = pickOptionalStr(
              resolveOptionalMedia(item.videoUpload, item.videoPath, fallback?.previewVideo),
              fallback?.previewVideo,
            )
            return { image, ...(previewVideo ? { previewVideo } : {}) }
          },
          d.contact.smallPhotos,
        ),
      },
      toggles: {
        showWhoIAm: pickBool(togglesRaw.showWhoIAm, d.toggles.showWhoIAm),
        showAboutCollage: pickBool(togglesRaw.showAboutCollage, d.toggles.showAboutCollage),
        showServices: pickBool(togglesRaw.showServices, d.toggles.showServices),
        showExperience: pickBool(togglesRaw.showExperience, d.toggles.showExperience),
        showWork: pickBool(togglesRaw.showWork, d.toggles.showWork),
        showLinkedIn: pickBool(togglesRaw.showLinkedIn, d.toggles.showLinkedIn),
        showCreatorLife: pickBool(togglesRaw.showCreatorLife, d.toggles.showCreatorLife),
        showFreeResource: pickBool(togglesRaw.showFreeResource, d.toggles.showFreeResource),
        showTestimonials: pickBool(togglesRaw.showTestimonials, d.toggles.showTestimonials),
        showTopmate: pickBool(togglesRaw.showTopmate, d.toggles.showTopmate),
        showNewsletter: pickBool(togglesRaw.showNewsletter, d.toggles.showNewsletter),
        showContact: pickBool(togglesRaw.showContact, d.toggles.showContact),
      },
    }
  } catch {
    return d
  }
}

export async function getCmsBlogPosts(): Promise<BlogPost[]> {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'blog-posts',
      where: { isPublished: { equals: true } },
      sort: '-publishedAt',
      limit: 100,
      depth: 1,
    })
    if (res.docs.length > 0) {
      return res.docs.map((doc, idx) => mapPayloadBlogDoc(doc as unknown as UnknownRecord, idx))
    }
    return FALLBACK_BLOG_POSTS
  } catch {
    return FALLBACK_BLOG_POSTS
  }
}

export async function getCmsBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'blog-posts',
      where: {
        and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }],
      },
      limit: 1,
      depth: 1,
    })
    if (res.docs.length > 0) {
      return mapPayloadBlogDoc(res.docs[0] as unknown as UnknownRecord, 0)
    }
  } catch {
    // Fall back to static blog posts when CMS is unavailable
  }
  return FALLBACK_BLOG_POSTS.find((p) => p.slug === slug) ?? null
}
