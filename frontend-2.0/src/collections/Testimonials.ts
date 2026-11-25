import type { CollectionConfig } from 'payload'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: {
    singular: 'Testimonial',
    plural: 'Testimonials',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'date', 'isVisible', 'sortOrder'],
    group: 'Social Proof',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      label: 'Client / Reviewer Name',
      type: 'text',
      required: true,
    },
    {
      name: 'date',
      label: 'Review Date',
      type: 'text',
    },
    {
      name: 'text',
      label: 'Testimonial Quote',
      type: 'textarea',
      required: true,
    },
    {
      name: 'isVisible',
      label: 'Show on Site',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'sortOrder',
      label: 'Display Order',
      type: 'number',
      defaultValue: 0,
    },
  ],
}
