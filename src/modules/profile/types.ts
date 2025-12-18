export interface ProfileConfig {
  title?: string
  description?: string
  showTags?: boolean
  showDescription?: boolean
  useOnChainIdentity?: boolean
}

export interface UserProfile {
  address: string
  name: string
  avatar?: string
  description?: string
  tags?: string[]
  onChainIdentity?: {
    display?: string
    legal?: string
    web?: string
    twitter?: string
    email?: string
  }
}
