import type { CollectionConfig } from 'payload'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  labels: {
    singular: 'Inquiry',
    plural: 'Inquiries',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'source', 'createdAt'],
    group: 'Inbox',
  },
  access: {
    create: () => true,
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'source',
      label: 'Source',
      type: 'text',
      defaultValue: 'portfolio-contact',
    },
  ],
}
