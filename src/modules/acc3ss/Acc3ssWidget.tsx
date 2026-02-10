import { useState, useEffect, useMemo } from 'react'
import { useTypink } from 'typink'
import { MapPin, Check, CheckCircle2, Download, KeyRound, Lock, Loader2 } from 'lucide-react'
import type { Acc3ssConfig, Location, AccessPass } from './types'
import { loadAccessPasses, saveAccessPasses } from './config'
import QRCode from 'qrcode'
import { useEVM } from '../../providers/EVMProvider'
import { useAccessPassContract } from '../../hooks/useAccessPassContract'
import { queryOnChainIdentity } from '../profile/identity-helpers'
import { ACCESSPASS_CONTRACT_ADDRESS } from '../../contracts/intran3t-accesspass'
import { substrateToEvm } from '../../lib/address-conversion'
import { useSubstrateEvmLink } from '../../hooks/useSubstrateEvmLink'
import { useRBACContract, Role } from '../../hooks/useRBACContract'
import { useAccountMapping } from '../../hooks/useAccountMapping'
import { MapAccountModal } from '../../components/MapAccountModal'
import { useSubstrateEVMSigner } from '../../hooks/useSubstrateEVMSigner'
import { encodeFunctionData } from 'viem'
import { ACCESSPASS_ABI } from '../../contracts/intran3t-accesspass'
import { JsonRpcProvider } from 'ethers'

async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff'
      }
    })
  } catch (e) {
    console.error('Failed to generate QR code:', e)
    return ''
  }
}

function LocationCard({
  location,
  isSelected,
  onClick
}: {
  location: Location
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
        isSelected
          ? 'bg-[#f5f5f4] border-[#1c1917] shadow-lg'
          : 'bg-white border-[#e7e5e4] hover:border-[#d6d3d1] hover:shadow-md'
      }`}
    >
      <div className="text-4xl">{location.icon}</div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-[#1c1917]">
          {location.name}
        </h3>
        {location.address && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-[#78716c]" />
            <span className="text-xs text-[#78716c]">{location.address}</span>
          </div>
        )}
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Check className="w-5 h-5 text-[#1c1917]" />
        </div>
      )}
    </button>
  )
}

function AccessPassModal({
  pass,
  onClose
}: {
  pass: AccessPass
  onClose: () => void
}) {
  const expiryDate = pass.expiresAt ? new Date(pass.expiresAt).toLocaleString() : 'Never'

  const handleDownload = () => {
    if (!pass.qrCode) return

    const link = document.createElement('a')
    link.download = `access-pass-${pass.location}-${pass.nftId}.png`
    link.href = pass.qrCode
    link.click()
  }

  const handleViewOnChain = () => {
    if (pass.nftId && ACCESSPASS_CONTRACT_ADDRESS) {
      // Open contract on explorer
      window.open(
        `https://polkadot.testnet.routescan.io/address/${ACCESSPASS_CONTRACT_ADDRESS}`,
        '_blank'
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-[#1c1917] p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold font-serif">
              {pass.onChain ? 'NFT Access Pass' : 'Access Pass'}
            </h2>
            <KeyRound className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90">
            {pass.onChain ? 'ERC-721 smart contract credential' : 'Valid entry credential'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* On-Chain Badge */}
          {pass.onChain && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">Minted on Polkadot Hub TestNet</p>
                <p className="text-xs text-green-600">NFT #{pass.nftId}</p>
              </div>
            </div>
          )}

          {/* QR Code */}
          {pass.qrCode && (
            <div className="flex justify-center">
              <div className="p-4 bg-white border-2 border-[#e7e5e4] rounded-xl">
                <img src={pass.qrCode} alt="Access QR Code" className="w-64 h-64" />
              </div>
            </div>
          )}

          {/* Pass Details */}
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-[#e7e5e4]">
              <span className="text-sm text-[#78716c]">Location</span>
              <span className="text-sm font-semibold text-[#1c1917]">{pass.location}</span>
            </div>
            {pass.onChain && pass.nftId && (
              <div className="flex justify-between items-center py-2 border-b border-[#e7e5e4]">
                <span className="text-sm text-[#78716c]">NFT ID</span>
                <span className="text-xs font-mono text-[#1c1917]">
                  #{pass.nftId}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-[#e7e5e4]">
              <span className="text-sm text-[#78716c]">Pass ID</span>
              <span className="text-xs font-mono text-[#1c1917]">{pass.id.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#e7e5e4]">
              <span className="text-sm text-[#78716c]">Expires</span>
              <span className="text-sm text-[#1c1917]">{expiryDate}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors font-medium"
            >
              Close
            </button>
            {pass.onChain && pass.nftId && (
              <button
                onClick={handleViewOnChain}
                className="flex-1 px-4 py-2 border border-[#e7e5e4] text-[#1c1917] rounded-lg hover:bg-[#fafaf9] transition-colors font-medium flex items-center justify-center gap-2"
              >
                View Contract
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors duration-200 font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VirtualDoor({
  pass,
  onClose,
  onViewPass
}: {
  pass: AccessPass
  onClose: () => void
  onViewPass: () => void
}) {
  const [doorOpen, setDoorOpen] = useState(false)

  useEffect(() => {
    // Trigger door open on next frame so the initial closed state renders first
    const frame = requestAnimationFrame(() => setDoorOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-md h-80 rounded-2xl overflow-hidden shadow-2xl">
        {/* Background: Access Granted content (revealed as doors open) */}
        <div className="absolute inset-0 bg-[#1c1917] flex flex-col items-center justify-center px-8 text-center">
          {/* Check icon — fades in after door opens */}
          <div className={`transition-opacity duration-500 ${doorOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: doorOpen ? '500ms' : '0ms' }}>
            <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
          </div>

          {/* Heading + location — fades in slightly later */}
          <div className={`transition-opacity duration-500 ${doorOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: doorOpen ? '700ms' : '0ms' }}>
            <h2 className="text-2xl font-bold text-white font-serif mb-1">Access Granted</h2>
            <p className="text-sm text-[#a8a29e] flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" />
              {pass.location}
            </p>
          </div>

          {/* Badges + buttons — fades in last */}
          <div className={`transition-opacity duration-500 ${doorOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: doorOpen ? '1000ms' : '0ms' }}>
            <div className="flex gap-2 mt-4 mb-5 justify-center">
              {pass.onChain && (
                <span className="text-xs bg-green-900/60 text-green-300 px-2.5 py-1 rounded-full">
                  On-Chain NFT
                </span>
              )}
              <span className="text-xs bg-[#292524] text-[#a8a29e] px-2.5 py-1 rounded-full">
                #{pass.nftId}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[#52524b] text-[#a8a29e] rounded-lg hover:bg-[#292524] transition-colors text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={onViewPass}
                className="flex-1 px-4 py-2 bg-[#78716c] text-white rounded-lg hover:bg-[#87827c] transition-colors text-sm font-medium"
              >
                View Pass
              </button>
            </div>
          </div>
        </div>

        {/* Keyhole — fades out as door opens */}
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-[#1c1917] border-2 border-[#d4a853] transition-opacity duration-300 ${doorOpen ? 'opacity-0' : 'opacity-100'}`} />

        {/* Left door panel */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 bg-[#78716c] z-20 transition-transform ease-in-out"
          style={{
            transitionDuration: '1.4s',
            transform: doorOpen ? 'translateX(-100%)' : 'translateX(0%)'
          }}
        >
          {/* Brass handle — right side of left panel */}
          <div className="absolute top-1/2 right-3 -translate-y-1/2 w-2 h-12 bg-[#d4a853] rounded-full shadow-md" />
        </div>

        {/* Right door panel */}
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-[#78716c] z-20 transition-transform ease-in-out"
          style={{
            transitionDuration: '1.4s',
            transform: doorOpen ? 'translateX(100%)' : 'translateX(0%)'
          }}
        >
          {/* Brass handle — left side of right panel */}
          <div className="absolute top-1/2 left-3 -translate-y-1/2 w-2 h-12 bg-[#d4a853] rounded-full shadow-md" />
        </div>
      </div>
    </div>
  )
}

export function Acc3ssWidget({ config }: { config: Acc3ssConfig }) {
  const { provider, signer, account: evmAccount } = useEVM()
  const { connectedAccount } = useTypink()
  const accessPassContract = useAccessPassContract(provider, signer)
  const { getEvmAddress, linkAddresses, areLinked } = useSubstrateEvmLink()
  const substrateSigner = useSubstrateEVMSigner()
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [passes, setPasses] = useState<AccessPass[]>([])
  const [showPassModal, setShowPassModal] = useState<AccessPass | null>(null)
  const [identityDisplay, setIdentityDisplay] = useState<string>('')
  const [derivedEvmAddress, setDerivedEvmAddress] = useState<string | null>(null)
  const [showVirtualDoor, setShowVirtualDoor] = useState(false)

  // Account mapping check
  const accountMapping = useAccountMapping(connectedAccount?.address)
  const [showMapModal, setShowMapModal] = useState(false)

  // Create stable read-only provider for RBAC queries when no MetaMask
  const readOnlyProvider = useMemo(() => {
    if (provider) return null
    return new JsonRpcProvider(
      import.meta.env.VITE_ASSETHUB_EVM_RPC || 'https://eth-rpc-testnet.polkadot.io'
    )
  }, [provider])

  // RBAC membership gate (use fallback provider if no MetaMask)
  const rbac = useRBACContract(provider || readOnlyProvider, signer)
  const orgId = localStorage.getItem('intran3t_org_id') || import.meta.env.VITE_DEFAULT_ORG_ID
  const [isMember, setIsMember] = useState<boolean | null>(null)

  // DEBUG: Log state changes
  useEffect(() => {
    console.log('🎯 Acc3ss isMember state:', isMember, '| orgId:', orgId)
  }, [isMember, orgId])

  const locations = config.locations || []

  // Derive EVM address from Substrate address
  useEffect(() => {
    if (connectedAccount?.address) {
      try {
        setDerivedEvmAddress(substrateToEvm(connectedAccount.address))
      } catch (error) {
        setDerivedEvmAddress(null)
      }
    } else {
      setDerivedEvmAddress(null)
    }
  }, [connectedAccount?.address])

  // Link Substrate and EVM addresses when both are connected (silently)
  useEffect(() => {
    if (connectedAccount?.address && evmAccount && !areLinked(connectedAccount.address, evmAccount)) {
      linkAddresses(connectedAccount.address, evmAccount, 'Talisman/SubWallet')
    }
  }, [connectedAccount?.address, evmAccount, areLinked, linkAddresses])

  // Smart address priority system:
  // 1. If Substrate wallet is mapped → use mapped address (single wallet UX)
  // 2. If MetaMask connected → use MetaMask (dual wallet mode)
  // 3. Fallback to linked or derived address
  const hasSubstrateWallet = !!connectedAccount?.address
  const hasMetaMask = !!evmAccount
  const isSubstrateMapped = accountMapping.isMapped === true

  const effectiveEvmAddress =
    substrateSigner.evmAddress // Substrate signer's derived address (primary)
    || evmAccount // MetaMask
    || getEvmAddress(connectedAccount?.address || '') // Linked
    || derivedEvmAddress // Derived fallback

  // DEBUG: Log address resolution
  useEffect(() => {
    console.log('🔍 Acc3ss Address Debug:', {
      substrateSignerAddress: substrateSigner.evmAddress,
      evmAccount,
      linkedAddress: getEvmAddress(connectedAccount?.address || ''),
      derivedEvmAddress,
      effectiveEvmAddress,
      substrateAddress: connectedAccount?.address
    })
  }, [substrateSigner.evmAddress, evmAccount, connectedAccount?.address, derivedEvmAddress, effectiveEvmAddress])

  useEffect(() => {
    setPasses(loadAccessPasses())
  }, [])

  // Fetch identity for display name from Substrate address
  useEffect(() => {
    if (!connectedAccount?.address) return

    queryOnChainIdentity(connectedAccount.address).then(result => {
      if (result.success && result.identity?.display) {
        setIdentityDisplay(result.identity.display)
      } else {
        setIdentityDisplay('Polkadot User')
      }
    }).catch(() => {
      setIdentityDisplay('Polkadot User')
    })
  }, [connectedAccount?.address])

  // RBAC membership check — smart dual-wallet support
  // Modes:
  //   1. Substrate only + mapped → Check RBAC with mapped address
  //   2. Substrate only + not mapped → Blocked (will show map prompt)
  //   3. MetaMask only → Check RBAC with MetaMask address
  //   4. Both connected + Substrate mapped → Check RBAC with mapped address
  //   5. Both connected + Substrate not mapped → Check RBAC with MetaMask address
  useEffect(() => {
    console.log('🔐 RBAC Check:', {
      orgId,
      hasContract: !!rbac.contract,
      effectiveEvmAddress,
      hasSubstrateWallet,
      hasMetaMask,
      isSubstrateMapped,
      isMapped: accountMapping.isMapped
    })

    // Skip if missing required dependencies
    if (!orgId || !rbac.contract || !effectiveEvmAddress) {
      console.log('⏭️ Skipping RBAC check (missing deps)')
      setIsMember(null)
      return
    }

    // Note: We have an effectiveEvmAddress (linked/derived), so we can check RBAC
    // Even if account mapping status is unknown, we'll use the available address
    // The effectiveEvmAddress comes from linkedAddress or derivedEvmAddress
    if (hasSubstrateWallet && !hasMetaMask && accountMapping.isMapped === null && !effectiveEvmAddress) {
      console.log('⏳ Waiting for address resolution...')
      return
    }

    // Proceed with RBAC check
    let cancelled = false

    console.log('📞 Calling getUserRole...', { orgId, address: effectiveEvmAddress })
    rbac.getUserRole(orgId, effectiveEvmAddress).then(({ role, hasRole }) => {
      console.log('✅ getUserRole result:', { role, hasRole, isMember: hasRole && (role === Role.Admin || role === Role.Member) })
      if (!cancelled) {
        setIsMember(hasRole && (role === Role.Admin || role === Role.Member))
      }
    }).catch((err) => {
      console.error('❌ getUserRole error:', err)
      if (!cancelled) setIsMember(null)
    })

    return () => { cancelled = true }
  }, [orgId, rbac.contract, effectiveEvmAddress, accountMapping.isMapped, hasSubstrateWallet, hasMetaMask, isSubstrateMapped])

  const handleGeneratePass = async () => {
    if (!selectedLocation || !effectiveEvmAddress || !accessPassContract.contract) {
      alert('Please connect your Polkadot wallet and select a location')
      return
    }

    if (!ACCESSPASS_CONTRACT_ADDRESS) {
      alert('AccessPass contract not deployed. Please check configuration.')
      return
    }

    setIsGenerating(true)

    try {
      // Calculate expiration (24 hours from now by default)
      const now = Date.now()
      const expiresAt = config.passValidityHours
        ? now + config.passValidityHours * 60 * 60 * 1000
        : now + 24 * 60 * 60 * 1000

      // Mint NFT via smart contract
      console.log('Minting access pass for:', effectiveEvmAddress)

      let tokenId: number

      // Use Substrate signer if no MetaMask signer available
      if (!signer && substrateSigner.isMapped) {
        console.log('🔗 Using Substrate EVM Signer (mapped account)')

        // Encode the contract call data
        const callData = encodeFunctionData({
          abi: ACCESSPASS_ABI,
          functionName: 'mintAccessPass',
          args: [
            effectiveEvmAddress as `0x${string}`,
            selectedLocation.name,
            selectedLocation.id,
            BigInt(Math.floor(expiresAt / 1000)),
            'standard',
            identityDisplay || 'User'
          ]
        })

        // Send transaction via pallet_revive
        const txHash = await substrateSigner.sendTransaction({
          to: ACCESSPASS_CONTRACT_ADDRESS,
          data: callData,
          value: 0n,
          gasLimit: 500000n
        })

        console.log(`✅ Transaction submitted: ${txHash}`)

        // TODO: Extract token ID from transaction events
        // For now, query the contract to get the latest token ID
        tokenId = await accessPassContract.getTotalMinted()
      } else if (signer) {
        console.log('🦊 Using MetaMask signer')

        // Use regular ethers.js contract
        tokenId = await accessPassContract.mintAccessPass(
          effectiveEvmAddress,
          selectedLocation.name,
          selectedLocation.id,
          Math.floor(expiresAt / 1000),
          'standard',
          identityDisplay || 'User'
        )
      } else {
        throw new Error('No signer available. Please connect MetaMask or map your Substrate account.')
      }

      console.log(`✅ Minted token ID: ${tokenId}`)

      // Create access pass data
      const passData: AccessPass = {
        id: `pass-${tokenId}`,
        location: selectedLocation.name,
        locationId: selectedLocation.id,
        holder: effectiveEvmAddress,
        createdAt: now,
        expiresAt,
        signature: '', // Not needed for smart contract
        nftId: tokenId,
        collectionId: undefined,
        onChain: true,
        accessLevel: 'standard',
        identityDisplay: identityDisplay || 'User'
      }

      // Generate QR code with contract data
      const qrData = JSON.stringify({
        version: 'v1',
        type: 'smart-contract',
        contract: ACCESSPASS_CONTRACT_ADDRESS,
        tokenId: tokenId,
        holder: effectiveEvmAddress,
        holderIdentity: identityDisplay,
        location: selectedLocation.id,
        locationName: selectedLocation.name,
        expiresAt: Math.floor(expiresAt / 1000),
        issuedAt: Math.floor(now / 1000),
        verified: true,
        network: 'polkadot-hub-testnet',
        chainId: 420420417
      })
      const qrCode = await generateQRCode(qrData)
      passData.qrCode = qrCode

      // Save pass
      const updatedPasses = [passData, ...passes]
      setPasses(updatedPasses)
      saveAccessPasses(updatedPasses)

      // Show virtual door, then pass modal underneath
      setShowPassModal(passData)
      setShowVirtualDoor(true)
    } catch (e: any) {
      console.error('Failed to generate pass:', e)
      alert(`Failed to mint access pass: ${e.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Get active pass for selected location
  const activePass = selectedLocation
    ? passes.find(
        p =>
          (p.locationId === selectedLocation.id || p.location === selectedLocation.name) &&
          p.holder === effectiveEvmAddress &&
          (!p.expiresAt || p.expiresAt > Date.now())
      )
    : null

  return (
    <>
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 h-full flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#1c1917] font-serif mb-1">
            {config.title || 'Acc3ss'}
          </h2>
          <p className="text-xs text-[#78716c]">
            {config.description || 'Generate NFT access passes for Parity locations'}
          </p>
        </div>

        {/* Location Selection */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          <h3 className="text-sm font-semibold text-[#1c1917] mb-2">
            Choose Location
          </h3>
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isSelected={selectedLocation?.id === location.id}
              onClick={() => setSelectedLocation(location)}
            />
          ))}
        </div>

        {/* CTA Section */}
        {effectiveEvmAddress ? (
          <div className="space-y-3">
            {activePass && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-700">Active Pass</p>
                  <p className="text-xs text-green-600">
                    You have an active pass for {selectedLocation?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowPassModal(activePass)}
                  className="text-xs text-green-700 hover:text-green-800 font-medium"
                >
                  View
                </button>
              </div>
            )}

            {/* Account mapping gate: only block if Substrate-only (no MetaMask) and not mapped */}
            {hasSubstrateWallet && !hasMetaMask && accountMapping.isMapped === false ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Account Mapping Required</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Map your Substrate account to enable smart contract interactions, or connect MetaMask.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Map Account
                </button>
              </div>
            ) :
            /* Optional info banner: Both wallets connected but Substrate not mapped */
            hasSubstrateWallet && hasMetaMask && accountMapping.isMapped === false ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                  <div className="text-xs text-blue-700">
                    💡 <strong>Tip:</strong> Map your Substrate account for single-wallet convenience.{' '}
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="underline font-medium hover:text-blue-800"
                    >
                      Map now
                    </button>
                  </div>
                </div>
                {/* Show normal mint flow below */}
                {/* RBAC gate: locked card when orgId is set but user is not a member */}
                {orgId && isMember === false ? (
                  <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-4 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-[#78716c] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#1c1917]">Membership Required</p>
                      <p className="text-xs text-[#78716c] mt-0.5">
                        You must be a Member or Admin of this organization to mint an access pass.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleGeneratePass}
                      disabled={
                        !selectedLocation ||
                        isGenerating ||
                        !accessPassContract.contract ||
                        accountMapping.isLoading ||
                        (!!orgId && isMember === null)
                      }
                      className="w-full py-3 px-4 bg-[#1c1917] text-white text-sm font-medium rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Minting NFT...
                        </>
                      ) : accountMapping.isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking account...
                        </>
                      ) : (!!orgId && isMember === null) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking membership...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          Get Your Access Pass
                        </>
                      )}
                    </button>

                    {selectedLocation && (
                      <p className="text-xs text-center text-[#78716c]">
                        Sign to get your access pass for {selectedLocation.name}
                      </p>
                    )}
                  </>
                )}
              </>
            ) : /* RBAC gate: locked card when orgId is set but user is not a member */
            orgId && isMember === false ? (
              <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#78716c] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1c1917]">Membership Required</p>
                  <p className="text-xs text-[#78716c] mt-0.5">
                    You must be a Member or Admin of this organization to mint an access pass.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={handleGeneratePass}
                  disabled={
                    !selectedLocation ||
                    isGenerating ||
                    !accessPassContract.contract ||
                    accountMapping.isLoading ||
                    (!!orgId && isMember === null)
                  }
                  className="w-full py-3 px-4 bg-[#1c1917] text-white text-sm font-medium rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Minting NFT...
                    </>
                  ) : accountMapping.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking account...
                    </>
                  ) : (!!orgId && isMember === null) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking membership...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Get Your Access Pass
                    </>
                  )}
                </button>

                {selectedLocation && (
                  <p className="text-xs text-center text-[#78716c]">
                    Sign to get your access pass for {selectedLocation.name}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-4 text-center">
            <p className="text-sm text-[#78716c]">
              Connect your Polkadot wallet to generate access passes
            </p>
          </div>
        )}
      </div>

      {showPassModal && showVirtualDoor && (
        <VirtualDoor
          pass={showPassModal}
          onClose={() => { setShowPassModal(null); setShowVirtualDoor(false) }}
          onViewPass={() => setShowVirtualDoor(false)}
        />
      )}
      {showPassModal && !showVirtualDoor && (
        <AccessPassModal pass={showPassModal} onClose={() => setShowPassModal(null)} />
      )}

      {/* Account Mapping Modal */}
      {showMapModal && accountMapping.evmAddress && (
        <MapAccountModal
          evmAddress={accountMapping.evmAddress}
          onClose={() => setShowMapModal(false)}
          onSuccess={() => {
            setShowMapModal(false)
            // Mapping state will auto-update via useAccountMapping hook
          }}
          onMap={accountMapping.mapAccount}
        />
      )}
    </>
  )
}
