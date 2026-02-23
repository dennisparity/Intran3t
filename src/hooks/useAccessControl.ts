import { useIdentity } from '../modules/profile/use-identity'

export interface AccessControl {
  hasVerifiedIdentity: boolean
  isLoading: boolean
  canAccessGovernance: boolean
  canAccessForms: boolean
  canAccessAcc3ss: boolean
  canAccessQuickNav: boolean
  canAccessHelpCenter: boolean
  canCreatePoll: boolean // For future RBAC
  canViewFormResults: boolean // For future RBAC
}

/**
 * Hook to check user access control based on on-chain identity verification
 *
 * Access Rules (TEMPORARILY DISABLED FOR TESTING):
 * - All modules accessible to everyone (for beta testing)
 * - Identity verification still tracked but not enforced
 *
 * TODO: Re-enable access control after testing phase
 * TODO: Integrate with RBAC smart contract for role-based permissions
 * TODO: Add @parity.io matrix handle verification
 */
export function useAccessControl(userAddress: string | undefined): AccessControl {
  const { data: identity, isLoading } = useIdentity(userAddress)

  const hasVerifiedIdentity = identity?.verified || false

  return {
    hasVerifiedIdentity,
    isLoading,

    // TESTING MODE: All modules accessible to everyone
    // To re-enable restrictions, change these back to: hasVerifiedIdentity
    canAccessGovernance: true,
    canAccessForms: true,
    canAccessAcc3ss: true,
    canAccessQuickNav: true,
    canAccessHelpCenter: true,

    // Future RBAC permissions
    canCreatePoll: true, // Will be role-based
    canViewFormResults: true, // Will be creator + specific roles
  }
}
