import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Settings',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      defaultValue: 'editor',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
}
