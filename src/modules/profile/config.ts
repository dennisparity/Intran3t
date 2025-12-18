import type { ProfileConfig, UserProfile } from './types'

export const defaultProfileConfig: ProfileConfig = {
  title: 'Profile',
  description: 'Your identity and details',
  showTags: true,
  showDescription: true,
  useOnChainIdentity: true // Query People Chain for on-chain identity
}

// Mock profile data - in production, this would come from People Chain
export const mockUserProfile: UserProfile = {
  address: '',
  name: 'Account',
  description: 'Product Owner at Parity Technologies',
  tags: ['Developer', 'Governance', 'Core Team']
}
