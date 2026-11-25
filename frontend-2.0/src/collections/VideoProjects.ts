import type { CollectionConfig } from 'payload'

export const VideoProjects: CollectionConfig = {
  slug: 'video-projects',
  labels: {
    singular: 'Video Reel / Project',
    plural: 'Video Reels & Projects',
  },
  admin: {
    useAsTitle: 'brand',
    defaultColumns: ['brand', 'category', 'sortOrder', 'isActive'],
    group: 'Portfolio & Work',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'brand',
      label: 'Brand Name',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      label: 'Category',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      label: 'Your Role',
      type: 'text',
      required: true,
    },
    {
      name: 'instagramUrl',
      label: 'Instagram / Reel Link',
      type: 'text',
    },
    {
      name: 'posterUpload',
      label: 'Poster Image (Upload)',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'posterPath',
      label: 'Poster Image Path (Fallback)',
      type: 'text',
      admin: {
        description: 'Used when no uploaded poster is attached, e.g. /assets/portfolio/reel-02.webp',
      },
    },
    {
      name: 'videoUpload',
      label: 'Video File (Upload)',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'videoPath',
      label: 'Video Path (Fallback)',
      type: 'text',
      admin: {
        description: 'Used when no uploaded video is attached, e.g. /assets/portfolio/reel-02.mp4',
      },
    },
    {
      name: 'sortOrder',
      label: 'Display Order',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'isActive',
      label: 'Show on Portfolio',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
