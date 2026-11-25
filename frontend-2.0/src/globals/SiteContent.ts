import type { Field, GlobalConfig } from 'payload'

/**
 * Generates an upload + fallback text-path pair so Kamna can either upload
 * new files in the CMS or keep existing static paths in `/public`.
 */
function mediaPair(
  uploadName: string,
  pathName: string,
  label: string,
  fallbackDescription?: string,
): Field[] {
  return [
    {
      name: uploadName,
      label: `${label} (Upload)`,
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: pathName,
      label: `${label} (Path Fallback)`,
      type: 'text',
      admin: fallbackDescription ? { description: fallbackDescription } : undefined,
    },
  ]
}

function toggleField(name: string, label: string): Field {
  return {
    name,
    label,
    type: 'checkbox',
    defaultValue: true,
  }
}

export const SiteContent: GlobalConfig = {
  slug: 'site-content',
  label: 'Site Content (All Sections)',
  admin: {
    group: 'Website Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero & Header',
          fields: [
            { name: 'siteName', label: 'Site Name', type: 'text' },
            { name: 'shortName', label: 'Short Name / Header Brand', type: 'text' },
            { name: 'discipline', label: 'Discipline / Tagline', type: 'text' },
            { name: 'location', label: 'Location', type: 'text' },
            { name: 'email', label: 'Contact Email', type: 'email' },
            { name: 'copyright', label: 'Footer Copyright', type: 'text' },
            ...mediaPair('headerAvatarUpload', 'headerAvatar', 'Header Avatar Image'),
            { name: 'heroEyebrow', label: 'Hero Eyebrow', type: 'text' },
            { name: 'heroName', label: 'Hero Display Name', type: 'text' },
            { name: 'heroCta', label: 'Hero CTA Label', type: 'text' },
            { name: 'heroCtaHref', label: 'Hero CTA Link', type: 'text' },
            ...mediaPair('heroPolaroidImageUpload', 'heroPolaroidImage', 'Hero Polaroid Image'),
            ...mediaPair('heroPolaroidVideoUpload', 'heroPolaroidVideo', 'Hero Polaroid Video'),
            ...mediaPair('heroStampMainImageUpload', 'heroStampMainImage', 'Hero Main Stamp Image'),
            ...mediaPair('heroStampSmallImageUpload', 'heroStampSmallImage', 'Hero Small Stamp Image'),
            ...mediaPair('heroStampSmallVideoUpload', 'heroStampSmallVideo', 'Hero Small Stamp Video'),
            { name: 'postmarkTop', label: 'Postmark Top Text', type: 'text' },
            { name: 'postmarkBottom', label: 'Postmark Bottom Text', type: 'text' },
            {
              name: 'social',
              label: 'Social Links',
              type: 'group',
              fields: [
                { name: 'linkedin', label: 'LinkedIn URL', type: 'text' },
                { name: 'instagram', label: 'Instagram URL', type: 'text' },
                { name: 'youtube', label: 'YouTube URL', type: 'text' },
                { name: 'medium', label: 'Medium URL', type: 'text' },
                { name: 'x', label: 'X (Twitter) URL', type: 'text' },
                { name: 'topmate', label: 'Topmate URL', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Who I Am & Values',
          fields: [
            { name: 'whoLabel', label: 'Section Label', type: 'text' },
            { name: 'whoLead', label: 'Lead Statement', type: 'textarea' },
            { name: 'whoEmph', label: 'Emphasized Word / Phrase', type: 'text' },
            ...mediaPair('whoStampImageUpload', 'whoStampImage', 'Who I Am Stamp Image'),
            ...mediaPair('whoStampVideoUpload', 'whoStampVideo', 'Who I Am Stamp Video'),
            {
              name: 'values',
              label: 'Core Values',
              type: 'array',
              fields: [
                { name: 'title', label: 'Value Title', type: 'text' },
                { name: 'text', label: 'Value Description', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'About Me Collage',
          fields: [
            { name: 'aboutTitle', label: 'Section Title', type: 'text' },
            {
              name: 'aboutParagraphs',
              label: 'Bio Paragraphs',
              type: 'array',
              fields: [{ name: 'text', label: 'Paragraph', type: 'textarea' }],
            },
            {
              name: 'aboutSkills',
              label: 'Skills / Chips',
              type: 'array',
              fields: [{ name: 'skill', label: 'Skill', type: 'text' }],
            },
            ...mediaPair('idPhotoUpload', 'idPhoto', 'ID Card Photo'),
            { name: 'idSerial', label: 'ID Card Serial', type: 'text' },
            { name: 'idRole', label: 'ID Card Role', type: 'text' },
            { name: 'idPlace', label: 'ID Card Location', type: 'text' },
            { name: 'boardingRoute', label: 'Boarding Pass Route', type: 'text' },
            { name: 'boardingMeta', label: 'Boarding Pass Meta', type: 'text' },
            ...mediaPair('polaroidAUpload', 'polaroidA', 'Polaroid A Image'),
            ...mediaPair('polaroidAVideoUpload', 'polaroidAVideo', 'Polaroid A Video'),
            ...mediaPair('polaroidBUpload', 'polaroidB', 'Polaroid B Image'),
            ...mediaPair('polaroidBVideoUpload', 'polaroidBVideo', 'Polaroid B Video'),
            { name: 'trustedNote', label: 'Trusted By Note', type: 'text' },
            { name: 'trustedBrands', label: 'Trusted Brands Summary', type: 'text' },
          ],
        },
        {
          label: 'Services',
          fields: [
            {
              name: 'services',
              label: 'Service Offerings',
              type: 'array',
              fields: [
                { name: 'index', label: 'Number (e.g. 01)', type: 'text' },
                { name: 'kicker', label: 'Kicker Label', type: 'text' },
                { name: 'title', label: 'Service Title', type: 'text' },
                { name: 'body', label: 'Service Description', type: 'textarea' },
                {
                  name: 'tags',
                  label: 'Tags',
                  type: 'array',
                  fields: [{ name: 'tag', label: 'Tag', type: 'text' }],
                },
                ...mediaPair('imageUpload', 'imagePath', 'Service Image'),
                { name: 'imageAlt', label: 'Image Alt Text', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Experience & Work',
          fields: [
            { name: 'expNoteTitle', label: 'Experience Note Title', type: 'text' },
            { name: 'expNoteBody', label: 'Experience Note Body', type: 'textarea' },
            ...mediaPair('expStampImageUpload', 'expStampImage', 'Experience Stamp Image'),
            { name: 'expHeadingA', label: 'Experience Heading Line 1', type: 'text' },
            { name: 'expHeadingB', label: 'Experience Heading Line 2', type: 'text' },
            { name: 'expBody', label: 'Experience Body', type: 'textarea' },
            { name: 'expCtaLabel', label: 'Experience CTA Label', type: 'text' },
            { name: 'workLabel', label: 'Work Section Label', type: 'text' },
            { name: 'workLead', label: 'Work Lead Headline', type: 'textarea' },
            { name: 'workEmph', label: 'Work Emphasized Text', type: 'text' },
            { name: 'stickyNote', label: 'Work Sticky Note Text', type: 'text' },
            { name: 'videoLabel', label: 'Video Reels Label', type: 'text' },
            { name: 'videoBody', label: 'Video Reels Description', type: 'textarea' },
            { name: 'campaignLabel', label: 'Campaigns Label', type: 'text' },
            { name: 'campaignBody', label: 'Campaigns Description', type: 'textarea' },
            {
              name: 'campaigns',
              label: 'Campaign Stills',
              type: 'array',
              fields: [
                ...mediaPair('imageUpload', 'imagePath', 'Campaign Image'),
                { name: 'alt', label: 'Alt Text', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Creator Life & LinkedIn',
          fields: [
            { name: 'creatorLabel', label: 'Creator Section Label', type: 'text' },
            { name: 'creatorLead', label: 'Creator Lead Headline', type: 'textarea' },
            { name: 'creatorEmph', label: 'Creator Emphasized Text', type: 'text' },
            { name: 'creatorColA', label: 'Column A Copy', type: 'textarea' },
            { name: 'creatorColB', label: 'Column B Copy', type: 'textarea' },
            { name: 'envelopeLabel', label: 'Envelope Label', type: 'text' },
            { name: 'envelopeBrands', label: 'Envelope Brands Text', type: 'text' },
            { name: 'portfolioA', label: 'Portfolio Badge A', type: 'text' },
            { name: 'portfolioB', label: 'Portfolio Badge B', type: 'text' },
            { name: 'ribbonText', label: 'Ribbon Banner Text', type: 'text' },
            {
              name: 'envelopeShots',
              label: 'Envelope Collage Shots',
              type: 'array',
              fields: [
                ...mediaPair('imageUpload', 'imagePath', 'Shot Image'),
                ...mediaPair('videoUpload', 'videoPath', 'Shot Video (Optional)'),
              ],
            },
            { name: 'linkedinEyebrow', label: 'LinkedIn Eyebrow', type: 'text' },
            { name: 'linkedinHeading', label: 'LinkedIn Section Heading', type: 'textarea' },
            {
              name: 'linkedinPosts',
              label: 'Featured LinkedIn Posts',
              type: 'array',
              fields: [
                { name: 'urn', label: 'LinkedIn Post URN', type: 'text' },
                { name: 'title', label: 'Post Title', type: 'text' },
                { name: 'summary', label: 'Post Summary', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'Free PDF & Topmate',
          fields: [
            { name: 'freeEyebrow', label: 'Free Resource Eyebrow', type: 'text' },
            { name: 'freeTitle', label: 'Free Resource Title', type: 'text' },
            { name: 'freeDescription', label: 'Free Resource Description', type: 'textarea' },
            { name: 'freeJoined', label: 'Social Proof Count Text', type: 'text' },
            { name: 'freeQuote', label: 'Free Resource Pull Quote', type: 'textarea' },
            { name: 'freeCta', label: 'Free Resource CTA Label', type: 'text' },
            ...mediaPair('freePdfUpload', 'freePdfPath', 'Free PDF Guide'),
            { name: 'testimonialsEyebrow', label: 'Testimonials Eyebrow', type: 'text' },
            { name: 'testimonialsRating', label: 'Rating Display (e.g. 5/5)', type: 'text' },
            { name: 'testimonialsCount', label: 'Review Count Display', type: 'text' },
            {
              name: 'testimonialsBadges',
              label: 'Testimonials Badges',
              type: 'array',
              fields: [{ name: 'badge', label: 'Badge Text', type: 'text' }],
            },
            { name: 'topmateEyebrow', label: 'Topmate Eyebrow', type: 'text' },
            { name: 'topmateHeading', label: 'Topmate Heading', type: 'text' },
            { name: 'topmateBody', label: 'Topmate Description', type: 'textarea' },
            { name: 'topmateUrl', label: 'Topmate Profile URL', type: 'text' },
            {
              name: 'topmateStats',
              label: 'Topmate Stats',
              type: 'array',
              fields: [
                { name: 'value', label: 'Stat Value', type: 'text' },
                { name: 'label', label: 'Stat Label', type: 'text' },
              ],
            },
            {
              name: 'topmateBadges',
              label: 'Topmate Badges',
              type: 'array',
              fields: [{ name: 'badge', label: 'Badge Text', type: 'text' }],
            },
            {
              name: 'topmateServices',
              label: 'Topmate 1:1 Services',
              type: 'array',
              fields: [
                { name: 'name', label: 'Service Name', type: 'text' },
                { name: 'price', label: 'Price', type: 'text' },
                { name: 'duration', label: 'Duration / Format', type: 'text' },
              ],
            },
            { name: 'newsletterKicker', label: 'Newsletter Kicker', type: 'text' },
            { name: 'newsletterHeading', label: 'Newsletter Heading', type: 'text' },
            { name: 'newsletterHeadingAccent', label: 'Newsletter Heading Accent', type: 'text' },
            { name: 'newsletterBadge', label: 'Newsletter Badge', type: 'text' },
            { name: 'newsletterSub', label: 'Newsletter Subheadline', type: 'textarea' },
          ],
        },
        {
          label: 'Contact & Section Toggles',
          fields: [
            { name: 'contactBig', label: 'Contact Oversized Display Word', type: 'text' },
            { name: 'contactTitleA', label: 'Contact Title Line 1', type: 'text' },
            { name: 'contactTitleB', label: 'Contact Title Line 2', type: 'text' },
            { name: 'contactBody', label: 'Contact Intro Copy', type: 'textarea' },
            { name: 'contactListLabel', label: 'Contact Bullets Heading', type: 'text' },
            {
              name: 'contactBullets',
              label: 'Contact Bullets',
              type: 'array',
              fields: [{ name: 'text', label: 'Bullet Text', type: 'text' }],
            },
            { name: 'contactSubmit', label: 'Submit Button Text', type: 'text' },
            { name: 'contactSent', label: 'Sent Confirmation Text', type: 'text' },
            ...mediaPair('contactBigPhotoUpload', 'contactBigPhoto', 'Contact Feature Photo'),
            ...mediaPair('contactBigVideoUpload', 'contactBigVideo', 'Contact Feature Video'),
            {
              name: 'contactSmallPhotos',
              label: 'Contact Small Polaroids',
              type: 'array',
              fields: [
                ...mediaPair('imageUpload', 'imagePath', 'Polaroid Image'),
                ...mediaPair('videoUpload', 'videoPath', 'Polaroid Video (Optional)'),
              ],
            },
            {
              name: 'toggles',
              label: 'Section Visibility Toggles',
              type: 'group',
              fields: [
                toggleField('showWhoIAm', 'Show Who I Am Section'),
                toggleField('showAboutCollage', 'Show About Collage Section'),
                toggleField('showServices', 'Show Services Section'),
                toggleField('showExperience', 'Show Experience Section'),
                toggleField('showWork', 'Show Work & Reels Section'),
                toggleField('showLinkedIn', 'Show LinkedIn Showcase'),
                toggleField('showCreatorLife', 'Show Creator Life Section'),
                toggleField('showFreeResource', 'Show Free PDF Section'),
                toggleField('showTestimonials', 'Show Testimonials Section'),
                toggleField('showTopmate', 'Show Topmate Section'),
                toggleField('showNewsletter', 'Show Newsletter Section'),
                toggleField('showContact', 'Show Contact Section'),
              ],
            },
          ],
        },
      ],
    },
  ],
}
