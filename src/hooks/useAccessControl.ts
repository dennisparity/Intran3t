export interface AccessControl {
  hasVerifiedIdentity: boolean
  isLoading: boolean
  canAccessGovernance: boolean
  canAccessForms: boolean
  canAccessQuickNav: boolean
  canAccessHelpCenter: boolean
  canCreatePoll: boolean
  canViewFormResults: boolean
}

export function useAccessControl(_userAddress: string | undefined): AccessControl {
  return {
    hasVerifiedIdentity: true,
    isLoading: false,
    canAccessGovernance: true,
    canAccessForms: true,
    canAccessQuickNav: true,
    canAccessHelpCenter: true,
    canCreatePoll: true,
    canViewFormResults: true,
  }
}
