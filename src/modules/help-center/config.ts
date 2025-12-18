import type { HelpCenterConfig } from './types'

export const defaultHelpCenterConfig: HelpCenterConfig = {
  title: 'Help & Resources',
  showSearch: false,
  categories: [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'Rocket',
      articles: [
        {
          id: 'wallet-setup',
          title: 'Setting up your wallet',
          description: 'Learn how to connect your Polkadot wallet',
          icon: 'Wallet',
          content: 'Connect your Polkadot wallet using any compatible extension like Talisman, SubWallet, or Polkadot.js extension.'
        },
        {
          id: 'dashboard-overview',
          title: 'Dashboard overview',
          description: 'Navigate the Intran3t dashboard',
          icon: 'LayoutDashboard',
          content: 'The dashboard provides access to governance, office booking, and other workplace tools.'
        }
      ]
    },
    {
      id: 'workplace',
      title: 'Workplace',
      icon: 'Building',
      articles: [
        {
          id: 'book-desk',
          title: 'How to book a desk',
          description: 'Reserve your workspace',
          icon: 'Calendar',
          content: 'Use the Acc3ss module to view available desks and book your preferred workspace.'
        },
        {
          id: 'meeting-rooms',
          title: 'Booking meeting rooms',
          description: 'Reserve conference spaces',
          icon: 'Users',
          content: 'Access the meeting room booking feature to schedule conference spaces for your team.'
        }
      ]
    },
    {
      id: 'governance',
      title: 'Governance',
      icon: 'Vote',
      articles: [
        {
          id: 'opengov-guide',
          title: 'OpenGov participation',
          description: 'Vote on Polkadot referenda',
          icon: 'CheckSquare',
          content: 'View active referenda and cast your vote on important network decisions.'
        },
        {
          id: 'polkassembly',
          title: 'Polkassembly',
          description: 'Join governance discussions',
          icon: 'MessageSquare',
          url: 'https://polkadot.polkassembly.io',
          external: true
        }
      ]
    },
    {
      id: 'resources',
      title: 'External Resources',
      icon: 'ExternalLink',
      articles: [
        {
          id: 'wiki',
          title: 'Polkadot Wiki',
          description: 'Comprehensive network documentation',
          icon: 'BookOpen',
          url: 'https://wiki.polkadot.network',
          external: true
        },
        {
          id: 'docs',
          title: 'Developer Documentation',
          description: 'Technical guides and API references',
          icon: 'Code',
          url: 'https://docs.polkadot.com',
          external: true
        },
        {
          id: 'support',
          title: 'Community Support',
          description: 'Get help from the community',
          icon: 'HelpCircle',
          url: 'https://support.polkadot.network',
          external: true
        }
      ]
    }
  ]
}
