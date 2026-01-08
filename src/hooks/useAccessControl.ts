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
 * Access Rules:
 * - Without verified identity: Only Profile module accessible
 * - With verified identity: Access to all modules (subject to future RBAC rules)
 *
 * TODO: Integrate with RBAC smart contract for role-based permissions
 */
export function useAccessControl(userAddress: string | undefined): AccessControl {
  const { data: identity, isLoading } = useIdentity(userAddress)

  const hasVerifiedIdentity = identity?.verified || false

  return {
    hasVerifiedIdentity,
    isLoading,

    // Module access - requires verified identity
    canAccessGovernance: hasVerifiedIdentity,
    canAccessForms: hasVerifiedIdentity,
    canAccessAcc3ss: hasVerifiedIdentity,
    canAccessQuickNav: hasVerifiedIdentity,
    canAccessHelpCenter: hasVerifiedIdentity,

    // Future RBAC permissions (currently based on verified identity only)
    // TODO: Replace with smart contract role checks
    canCreatePoll: hasVerifiedIdentity, // Will be role-based
    canViewFormResults: hasVerifiedIdentity, // Will be creator + specific roles
  }
}
