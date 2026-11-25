import type { CollectionConfig } from 'payload'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  labels: {
    singular: 'Blog Post',
    plural: 'Blog Posts',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'isPublished'],
    group: 'Editorial',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'URL Slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Lowercase URL path, e.g. building-in-public-on-linkedin',
      },
    },
    {
      name: 'excerpt',
      label: 'Short Excerpt',
      type: 'textarea',
    },
    {
      name: 'coverUpload',
      label: 'Cover Image (Upload)',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'coverImage',
      label: 'Cover Image Path (Fallback)',
      type: 'text',
      admin: {
        description: 'Used when no uploaded cover image is attached, e.g. /blog/cover-1.jpg',
      },
    },
    {
      name: 'publishedAt',
      label: 'Published Date',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'bodyHtml',
      label: 'Article Body (HTML)',
      type: 'textarea',
      admin: {
        description: 'HTML body paragraphs, headings, lists, and blockquotes.',
      },
    },
    {
      name: 'isPublished',
      label: 'Published',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
