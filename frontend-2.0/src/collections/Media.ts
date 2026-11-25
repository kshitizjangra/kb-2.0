import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    group: 'Media Library',
  },
  access: {
    read: () => true,
  },
  upload: {
    staticDir: 'public/uploads',
    mimeTypes: ['image/*', 'video/*', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      label: 'Alt Text / Description',
      type: 'text',
    },
  ],
}
