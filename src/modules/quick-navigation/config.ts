import type { QuickNavConfig } from './types'

export const defaultQuickNavConfig: QuickNavConfig = {
  title: 'Quick Access',
  showIcons: true,
  sections: [
    {
      id: 'workplace',
      title: 'Workplace',
      links: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          url: '/dashboard',
          icon: 'Grid3x3',
          description: 'Your main workspace'
        },
        {
          id: 'office',
          label: 'Office Booking',
          url: '/dashboard#access',
          icon: 'Building',
          description: 'Book desks and meeting rooms'
        }
      ]
    },
    {
      id: 'governance',
      title: 'Governance',
      links: [
        {
          id: 'opengov',
          label: 'OpenGov',
          url: '/dashboard#governance',
          icon: 'Vote',
          description: 'View and vote on referenda'
        },
        {
          id: 'polkassembly',
          label: 'Polkassembly',
          url: 'https://polkadot.polkassembly.io',
          icon: 'ExternalLink',
          external: true,
          description: 'Governance discussion platform'
        }
      ]
    },
    {
      id: 'resources',
      title: 'Resources',
      links: [
        {
          id: 'wiki',
          label: 'Polkadot Wiki',
          url: 'https://wiki.polkadot.network',
          icon: 'BookOpen',
          external: true,
          description: 'Learn about Polkadot'
        },
        {
          id: 'docs',
          label: 'Developer Docs',
          url: 'https://docs.polkadot.com',
          icon: 'Code',
          external: true,
          description: 'Technical documentation'
        }
      ]
    }
  ]
}
