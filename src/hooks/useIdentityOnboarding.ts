import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import {
  queryRegistrars,
  calculateDeposits,
  submitSetIdentity,
  submitRequestJudgement,
  buildIdentityInfo,
  type RegistrarInfo,
  type DepositInfo,
  type IdentityFormData,
  type TransactionResult
} from '../modules/profile/identity-transaction-helpers'
import { queryOnChainIdentity } from '../modules/profile/identity-helpers'

/**
 * Hook to query available registrars from People Chain
 * Returns list of registrars with their fees and supported fields
 */
export function useRegistrars() {
  return useQuery({
    queryKey: ['registrars'],
    queryFn: async () => {
      try {
        return await queryRegistrars()
      } catch (error) {
        console.error('Failed to fetch registrars:', error)
        throw error
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (registrars rarely change)
    retry: 2
  })
}

/**
 * Hook to calculate deposits required for identity setup
 * Computes total cost based on form data and selected registrar
 */
export function useDepositCalculation(
  formData: IdentityFormData | null,
  selectedRegistrar: RegistrarInfo | null
) {
  return useQuery({
    queryKey: ['deposits', formData, selectedRegistrar?.index],
    queryFn: async () => {
      if (!formData || !selectedRegistrar) return null

      // Count non-empty fields
      const numFields = Object.values(formData).filter(v => v && v.trim() !== '').length

      try {
        return await calculateDeposits(
          undefined, // Let function get API instance
          numFields,
          selectedRegistrar.fee
        )
      } catch (error) {
        console.error('Failed to calculate deposits:', error)
        throw error
      }
    },
    enabled: !!formData && !!selectedRegistrar,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}

/**
 * Mutation hook to submit setIdentity transaction
 * Sets on-chain identity fields on People Chain
 */
export function useIdentitySubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      account,
      formData
    }: {
      account: InjectedAccountWithMeta
      formData: IdentityFormData
    }): Promise<TransactionResult> => {
      const identityInfo = buildIdentityInfo(formData)
      return await submitSetIdentity(account, identityInfo)
    },
    onSuccess: (data, variables) => {
      console.log('Identity set successfully:', data)

      // Invalidate identity cache to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['identity', variables.account.address] })
    },
    onError: (error) => {
      console.error('Failed to set identity:', error)
    }
  })
}

/**
 * Mutation hook to submit requestJudgement transaction
 * Requests verification from a registrar
 */
export function useJudgementRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      account,
      registrarIndex,
      maxFee
    }: {
      account: InjectedAccountWithMeta
      registrarIndex: number
      maxFee: bigint
    }): Promise<TransactionResult> => {
      return await submitRequestJudgement(account, registrarIndex, maxFee)
    },
    onSuccess: (data, variables) => {
      console.log('Judgement requested successfully:', data)

      // Invalidate identity cache to trigger verification polling
      queryClient.invalidateQueries({ queryKey: ['identity', variables.account.address] })

      // Start polling for verification (will be handled by useVerificationPolling)
    },
    onError: (error) => {
      console.error('Failed to request judgement:', error)
    }
  })
}

/**
 * Hook to poll for identity verification status
 * Automatically checks for positive judgement every 30 seconds
 * Stops polling when verified or manually stopped
 */
export function useVerificationPolling(
  address: string | undefined,
  enabled: boolean = false
) {
  const [isVerified, setIsVerified] = useState(false)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['identity-verification', address],
    queryFn: async () => {
      if (!address) return null

      const result = await queryOnChainIdentity(address)

      if (!result.success || !result.identity) {
        return { verified: false, identity: null }
      }

      return {
        verified: result.identity.verified,
        identity: result.identity
      }
    },
    enabled: enabled && !!address && !isVerified,
    refetchInterval: enabled && !isVerified ? 30000 : false, // Poll every 30 seconds
    retry: 3
  })

  // Track verification state
  useEffect(() => {
    if (query.data?.verified) {
      console.log('🎉 Identity verified! Stopping polling.')
      setIsVerified(true)

      // Invalidate identity cache to refresh UI across the app
      if (address) {
        queryClient.invalidateQueries({ queryKey: ['identity', address] })
      }
    }
  }, [query.data?.verified, address, queryClient])

  return {
    ...query,
    isVerified,
    stopPolling: () => setIsVerified(true) // Allow manual stop
  }
}

/**
 * Combined hook for the complete onboarding flow
 * Provides all hooks and utilities needed for identity setup
 */
export function useIdentityOnboarding(account: InjectedAccountWithMeta | null) {
  const [formData, setFormData] = useState<IdentityFormData | null>(null)
  const [selectedRegistrar, setSelectedRegistrar] = useState<RegistrarInfo | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  // Query hooks
  const registrars = useRegistrars()
  const deposits = useDepositCalculation(formData, selectedRegistrar)
  const verification = useVerificationPolling(account?.address, isPolling)

  // Mutation hooks
  const setIdentityMutation = useIdentitySubmission()
  const requestJudgementMutation = useJudgementRequest()

  // Helper to submit identity
  const submitIdentity = async () => {
    if (!account || !formData) {
      throw new Error('Account and form data are required')
    }

    return await setIdentityMutation.mutateAsync({ account, formData })
  }

  // Helper to request judgement
  const requestJudgement = async () => {
    if (!account || !selectedRegistrar) {
      throw new Error('Account and registrar selection are required')
    }

    const result = await requestJudgementMutation.mutateAsync({
      account,
      registrarIndex: selectedRegistrar.index,
      maxFee: selectedRegistrar.fee
    })

    // Start polling for verification after successful request
    if (result.success) {
      setIsPolling(true)
    }

    return result
  }

  // Combined loading state
  const isLoading = useMemo(() =>
    registrars.isLoading ||
    deposits.isLoading ||
    setIdentityMutation.isPending ||
    requestJudgementMutation.isPending,
    [
      registrars.isLoading,
      deposits.isLoading,
      setIdentityMutation.isPending,
      requestJudgementMutation.isPending
    ]
  )

  // Combined error state
  const error = useMemo(() =>
    registrars.error ||
    deposits.error ||
    setIdentityMutation.error ||
    requestJudgementMutation.error ||
    verification.error,
    [
      registrars.error,
      deposits.error,
      setIdentityMutation.error,
      requestJudgementMutation.error,
      verification.error
    ]
  )

  return {
    // State
    formData,
    setFormData,
    selectedRegistrar,
    setSelectedRegistrar,
    isPolling,
    setIsPolling,

    // Queries
    registrars: registrars.data || [],
    registrarsLoading: registrars.isLoading,
    registrarsError: registrars.error,

    deposits: deposits.data,
    depositsLoading: deposits.isLoading,
    depositsError: deposits.error,

    verification,

    // Actions
    submitIdentity,
    requestJudgement,

    // Mutation states
    isSubmittingIdentity: setIdentityMutation.isPending,
    identitySubmitError: setIdentityMutation.error,

    isRequestingJudgement: requestJudgementMutation.isPending,
    judgementRequestError: requestJudgementMutation.error,

    // Combined states
    isLoading,
    error,

    // Reset functions
    resetIdentitySubmission: setIdentityMutation.reset,
    resetJudgementRequest: requestJudgementMutation.reset
  }
}
