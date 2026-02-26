import { useState, useEffect, useMemo } from 'react'
import { useWallet } from '../../providers/WalletProvider'
import { MapPin, Check, CheckCircle2, Download, KeyRound, Lock, Loader2, ExternalLink } from 'lucide-react'
import type { Acc3ssConfig, Location, AccessPass } from './types'
import { loadAccessPasses, saveAccessPasses } from './config'
import QRCode from 'qrcode'
import { useEVM } from '../../providers/EVMProvider'
import { useAccessPassContract } from '../../hooks/useAccessPassContract'
import { queryOnChainIdentity } from '../profile/identity-helpers'
import { ACCESSPASS_CONTRACT_ADDRESS } from '../../contracts/intran3t-accesspass'
import { substrateToEvm } from '../../lib/address-conversion'
import { useSubstrateEvmLink } from '../../hooks/useSubstrateEvmLink'
import { MapAccountModal } from '../../components/MapAccountModal'
import { useSubstrateEVMSigner } from '../../hooks/useSubstrateEVMSigner'
import { encodeFunctionData } from 'viem'
import { ACCESSPASS_ABI } from '../../contracts/intran3t-accesspass'

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
  const [qrCode, setQrCode] = useState<string | undefined>(pass.qrCode)
  const expiryDate = pass.expiresAt ? new Date(pass.expiresAt).toLocaleString() : 'Never'

  // Generate QR code if not already present
  useEffect(() => {
    if (!qrCode && pass.onChain && pass.nftId) {
      const generateQR = async () => {
        const qrData = JSON.stringify({
          version: 'v1',
          type: 'smart-contract',
          contract: ACCESSPASS_CONTRACT_ADDRESS,
          tokenId: pass.nftId,
          holder: pass.holder,
          holderIdentity: pass.identityDisplay,
          location: pass.locationId,
          locationName: pass.location,
          expiresAt: Math.floor((pass.expiresAt || 0) / 1000),
          issuedAt: Math.floor((pass.createdAt || 0) / 1000),
          verified: true,
          network: 'polkadot-hub-testnet',
          chainId: 420420417
        })
        const generated = await generateQRCode(qrData)
        setQrCode(generated)
      }
      generateQR()
    }
  }, [qrCode, pass])

  const handleDownload = () => {
    if (!qrCode) return

    const link = document.createElement('a')
    link.download = `access-pass-${pass.location}-${pass.nftId}.png`
    link.href = qrCode
    link.click()
  }

  // txHash from Substrate wallet is a Substrate extrinsic hash, not an EVM tx hash.
  // Use Subscan Paseo AssetHub for extrinsics (always works with Substrate hash).
  // Use Routescan for the contract/NFT page.
  const handleViewExtrinsic = () => {
    if (pass.txHash) {
      window.open(`https://assethub-paseo.subscan.io/extrinsic/${pass.txHash}`, '_blank')
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
            {pass.onChain ? 'Polkadot Hub NFT credential' : 'Valid entry credential'}
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
          {qrCode && (
            <div className="flex justify-center">
              <div className="p-4 bg-white border-2 border-[#e7e5e4] rounded-xl">
                <img src={qrCode} alt="Access QR Code" className="w-64 h-64" />
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
          {pass.onChain && pass.txHash && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleViewExtrinsic}
                className="flex-1 px-3 py-2 border border-[#e7e5e4] text-xs text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors font-medium flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Subscan
              </button>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors font-medium"
            >
              Close
            </button>
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

  // Auto-close PoC message after opening animation completes
  const [showPoCMessage] = useState(true)

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
          <div className={`transition-opacity duration-500 ${doorOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: doorOpen ? '1200ms' : '0ms' }}>
            <h2 className="text-2xl font-bold text-white font-serif mb-1">Access Granted</h2>
            <p className="text-sm text-[#a8a29e] flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" />
              {pass.location}
            </p>
            {showPoCMessage && (
              <p className="text-xs text-[#78716c] mt-3 italic">
                Proof of Concept — Real door unlock system coming soon
              </p>
            )}
          </div>

          {/* Badges + buttons — fades in last */}
          <div className={`transition-opacity duration-500 ${doorOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: doorOpen ? '1600ms' : '0ms' }}>
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
            transitionDuration: '2.8s',
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
            transitionDuration: '2.8s',
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
  const { selectedAccount } = useWallet()
  const accessPassContract = useAccessPassContract(provider, signer)
  const { getEvmAddress, linkAddresses, areLinked } = useSubstrateEvmLink()
  const substrateSigner = useSubstrateEVMSigner()
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [mintingStatus, setMintingStatus] = useState<'idle' | 'checking' | 'mapping' | 'broadcasting' | 'in_block' | 'complete'>('idle')

  // Debug: Log status changes
  useEffect(() => {
    console.log('🎯 Minting status changed:', mintingStatus)
  }, [mintingStatus])
  const [passes, setPasses] = useState<AccessPass[]>([])
  const [showPassModal, setShowPassModal] = useState<AccessPass | null>(null)
  const [identityDisplay, setIdentityDisplay] = useState<string>('')
  const [derivedEvmAddress, setDerivedEvmAddress] = useState<string | null>(null)
  const [showVirtualDoor, setShowVirtualDoor] = useState(false)

  // Account mapping — shared state from WalletProvider (single source of truth)
  const { isMapped, evmAddress: walletEvmAddress, mapAccount, resetMappingCache } = useWallet()
  const accountMapping = { isMapped, evmAddress: walletEvmAddress, mapAccount, resetCache: resetMappingCache }
  const [showMapModal, setShowMapModal] = useState(false)
  const [showPreActionModal, setShowPreActionModal] = useState(false)

  const locations = config.locations || []

  // Derive EVM address from Substrate address
  useEffect(() => {
    if (selectedAccount?.address) {
      try {
        setDerivedEvmAddress(substrateToEvm(selectedAccount.address))
      } catch (error) {
        setDerivedEvmAddress(null)
      }
    } else {
      setDerivedEvmAddress(null)
    }
  }, [selectedAccount?.address])

  // Link Substrate and EVM addresses when both are connected (silently)
  useEffect(() => {
    if (selectedAccount?.address && evmAccount && !areLinked(selectedAccount.address, evmAccount)) {
      linkAddresses(selectedAccount.address, evmAccount, 'Talisman/SubWallet')
    }
  }, [selectedAccount?.address, evmAccount, areLinked, linkAddresses])

  // Smart address priority system:
  // 1. If Substrate wallet is mapped → use mapped address (single wallet UX)
  // 2. If MetaMask connected → use MetaMask (dual wallet mode)
  // 3. Fallback to linked or derived address
  const hasSubstrateWallet = !!selectedAccount?.address
  const hasMetaMask = !!evmAccount
  const isSubstrateMapped = accountMapping.isMapped === true

  const effectiveEvmAddress =
    substrateSigner.evmAddress // Substrate signer's derived address (primary)
    || evmAccount // MetaMask
    || getEvmAddress(selectedAccount?.address || '') // Linked
    || derivedEvmAddress // Derived fallback

  // Debug logs removed - was causing console spam

  // Load passes from localStorage, filtered by current account
  useEffect(() => {
    const allPasses = loadAccessPasses()

    // Filter passes by current account's EVM address
    if (effectiveEvmAddress) {
      const accountPasses = allPasses.filter(p =>
        p.holder.toLowerCase() === effectiveEvmAddress.toLowerCase()
      )
      setPasses(accountPasses)
      console.log(`📋 Loaded ${accountPasses.length} passes for account ${effectiveEvmAddress}`)
    } else {
      setPasses([])
    }
  }, [effectiveEvmAddress])

  // Load passes from contract for current user
  useEffect(() => {
    if (!effectiveEvmAddress || !accessPassContract.contract) return

    const loadOnChainPasses = async () => {
      try {
        const tokenIds = await accessPassContract.getPassesByHolder(effectiveEvmAddress)
        console.log(`📋 Found ${tokenIds.length} on-chain passes for ${effectiveEvmAddress}`)

        // Load existing passes from localStorage
        const existingPasses = loadAccessPasses()
        const existingTokenIds = new Set(existingPasses.map(p => p.nftId).filter(Boolean))

        // Fetch metadata for each new token
        const newPasses: AccessPass[] = []
        for (const tokenId of tokenIds) {
          // Skip if we already have this pass in localStorage
          if (existingTokenIds.has(tokenId)) continue

          try {
            const metadata = await accessPassContract.getPassMetadata(tokenId)
            if (!metadata) continue

            const qrData = JSON.stringify({
              version: 'v1',
              type: 'smart-contract',
              contract: ACCESSPASS_CONTRACT_ADDRESS,
              tokenId: tokenId,
              holder: effectiveEvmAddress,
              holderIdentity: metadata.identityDisplay,
              location: metadata.locationId,
              locationName: metadata.location,
              expiresAt: Number(metadata.expiresAt),
              issuedAt: Number(metadata.issuedAt),
              verified: true,
              network: 'polkadot-hub-testnet',
              chainId: 420420417
            })
            const qrCode = await generateQRCode(qrData)

            newPasses.push({
              id: `pass-${tokenId}`,
              location: metadata.location,
              locationId: metadata.locationId,
              holder: effectiveEvmAddress,
              createdAt: Number(metadata.issuedAt) * 1000,
              expiresAt: Number(metadata.expiresAt) * 1000,
              signature: '',
              nftId: tokenId,
              onChain: true,
              accessLevel: metadata.accessLevel,
              identityDisplay: metadata.identityDisplay,
              qrCode
            })
          } catch (err) {
            console.error(`Failed to load metadata for token ${tokenId}:`, err)
          }
        }

        if (newPasses.length > 0) {
          const updatedPasses = [...newPasses, ...existingPasses]
          setPasses(updatedPasses)
          saveAccessPasses(updatedPasses)
          console.log(`✅ Loaded ${newPasses.length} new passes from contract`)
        }
      } catch (err) {
        console.error('Failed to load on-chain passes:', err)
      }
    }

    loadOnChainPasses()
  }, [effectiveEvmAddress, accessPassContract.contract])

  // Fetch identity for display name from Substrate address
  useEffect(() => {
    if (!selectedAccount?.address) return

    queryOnChainIdentity(selectedAccount.address).then(result => {
      if (result.success && result.identity?.display) {
        setIdentityDisplay(result.identity.display)
      } else {
        setIdentityDisplay('Polkadot User')
      }
    }).catch(() => {
      setIdentityDisplay('Polkadot User')
    })
  }, [selectedAccount?.address])

  // No RBAC checks - anyone can mint to themselves

  const handleMintClick = () => {
    if (!selectedLocation) {
      alert('Please select a location')
      return
    }
    // When Substrate-only and mapping status unknown, warn before triggering wallet popups
    if (hasSubstrateWallet && !hasMetaMask && accountMapping.isMapped === null) {
      setShowPreActionModal(true)
      return
    }
    handleGeneratePass()
  }

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
    setMintingStatus('checking')

    try {
      // First, check if user already has a valid pass for this location
      console.log(`🔍 Checking for existing pass for ${selectedLocation.name}...`)
      const locationPasses = await accessPassContract.getPassesByLocation(selectedLocation.id)
      console.log(`📋 Found ${locationPasses.length} total passes for location ${selectedLocation.name}`)

      for (const tokenId of locationPasses) {
        const metadata = await accessPassContract.getPassMetadata(tokenId)
        if (metadata && metadata.holder.toLowerCase() === effectiveEvmAddress.toLowerCase()) {
          // Check if pass is still valid on-chain (not expired, not revoked)
          const isValid = await accessPassContract.isPassValid(tokenId)
          if (isValid) {
            console.log(`✅ Found valid pass on-chain: #${tokenId}`)
            setActivePassTokenId(tokenId)
            setIsGenerating(false)

            // Find the pass in local state and show it
            const existingPass = passes.find(p => p.nftId === tokenId)
            if (existingPass) {
              setShowPassModal(existingPass)
            }

            alert(`You already have an active pass (#${tokenId}) for ${selectedLocation.name}. Please wait for it to expire before minting a new one.`)
            return
          }
        }
      }

      console.log('✅ No valid pass found, proceeding with mint...')
      setActivePassTokenId(null)
    } catch (err) {
      console.error('Failed to check for existing pass:', err)
      // Continue with minting even if check fails
    }

    try {
      // Calculate expiration (24 hours from now by default)
      const now = Date.now()
      const expiresAt = config.passValidityHours
        ? now + config.passValidityHours * 60 * 60 * 1000
        : now + 24 * 60 * 60 * 1000

      // Mint NFT via smart contract
      console.log('Minting access pass for:', effectiveEvmAddress)

      let tokenId: number
      let txHash: string | undefined

      // Check wallet connection (either Substrate OR MetaMask)
      if (!selectedAccount?.address && !signer) {
        throw new Error('Please connect a wallet (Talisman, SubWallet, or MetaMask)')
      }

      // For Substrate wallet: Use Substrate EVM Signer via pallet_revive
      if (selectedAccount?.address && !signer) {
        console.log('🔗 Using Substrate wallet for EVM transaction')
        console.log('Substrate account:', selectedAccount.address)
        console.log('Mapped EVM address:', effectiveEvmAddress)

        // Auto-map if needed.
        // isMapped === true  → skip (verified on-chain or from cache)
        // isMapped === false → must map (confirmed unmapped)
        // isMapped === null  → on-chain check failed (metadata mismatch); check localStorage directly
        //                      as fallback before triggering an unnecessary re-map
        const localCacheKey = `intran3t_mapped_${selectedAccount.address}`
        const cachedMapped = localStorage.getItem(localCacheKey) === 'true'
        if (accountMapping.isMapped === false || (accountMapping.isMapped === null && !cachedMapped)) {
          console.log('🗺️ [Acc3ss] Mapping account before mint...')
          setMintingStatus('mapping')
          try {
            await accountMapping.mapAccount()
            console.log('✅ [Acc3ss] Account mapped')
          } catch (mapErr) {
            const errMsg = mapErr instanceof Error ? mapErr.message : 'Unknown error'
            throw new Error(`Failed to map account: ${errMsg}`)
          }
        }

        // Get current total before minting (so we can predict the new token ID)
        const totalBeforeMint = await accessPassContract.getTotalMinted()
        console.log(`📊 Total minted before: ${totalBeforeMint}`)

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

        console.log('📝 Encoded call data:', callData)

        // Send transaction via pallet_revive
        // Status: broadcasting (covers signing, sending, and waiting for finalization)
        setMintingStatus('broadcasting')

        // Resolves on finalized. onProgress fires earlier for UI stage updates.
        txHash = await substrateSigner.sendTransaction({
          to: ACCESSPASS_CONTRACT_ADDRESS,
          data: callData,
          value: 0n,
          gasLimit: 500000n,
          onProgress: (stage) => {
            if (stage === 'in_block') setMintingStatus('in_block')
          }
        })

        console.log(`✅ Transaction finalized: ${txHash}`)

        // The new token ID is totalBeforeMint + 1
        // (Contract counter increments atomically during mint)
        tokenId = totalBeforeMint + 1
        console.log(`✅ Minted token ID: ${tokenId}`)
      } else {
        // For MetaMask: Use regular ethers.js
        console.log('🦊 Using MetaMask signer')
        setMintingStatus('broadcasting')

        const result = await accessPassContract.mintAccessPass(
          effectiveEvmAddress,
          selectedLocation.name,
          selectedLocation.id,
          Math.floor(expiresAt / 1000),
          'standard',
          identityDisplay || 'User'
        )

        tokenId = result.tokenId
        txHash = result.txHash
      }

      console.log(`✅ Minted token ID: ${tokenId}${txHash ? `, tx: ${txHash}` : ''}`)

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
        txHash, // Store transaction hash for "Check Transaction" link
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

      // Set active pass so UI updates to show the minted pass
      setActivePassTokenId(tokenId)

      // Show virtual door, then pass modal underneath
      setMintingStatus('complete')
      setShowPassModal(passData)
      setShowVirtualDoor(true)
    } catch (e: any) {
      console.error('Failed to generate pass:', e)
      alert(`Failed to mint access pass: ${e.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
      // Reset status after a short delay
      setTimeout(() => setMintingStatus('idle'), 1000)
    }
  }

  // State for tracking if user has a valid pass (checked on-demand, not automatically)
  const [activePassTokenId, setActivePassTokenId] = useState<number | null>(null)

  // Get active pass from local state (for display)
  const activePass = activePassTokenId !== null
    ? passes.find(p => p.nftId === activePassTokenId)
    : null

  // CRITICAL: Check if active pass matches current location
  const hasActivePassForLocation = activePass && activePass.location === selectedLocation?.name

  // Restore active pass on mount/reload
  useEffect(() => {
    if (passes.length > 0 && activePassTokenId === null) {
      // Set the most recent pass as active
      const mostRecent = passes.sort((a, b) => b.createdAt - a.createdAt)[0]
      setActivePassTokenId(mostRecent.nftId)
      console.log('🎫 Restored active pass:', mostRecent.nftId, 'for location:', mostRecent.location)
    }
  }, [passes, activePassTokenId])

  return (
    <>
      <div className="relative bg-white border border-[#e7e5e4] rounded-2xl p-6 h-full flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.02)]">
        {/* Minting overlay — covers widget while transaction is in progress */}
        {isGenerating && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#1c1917]" />
            <div className="text-center px-8">
              <p className="text-sm font-semibold text-[#1c1917]">
                {mintingStatus === 'checking' && 'Checking for existing pass...'}
                {mintingStatus === 'mapping' && 'Mapping account...'}
                {mintingStatus === 'broadcasting' && 'Broadcasting transaction...'}
                {mintingStatus === 'in_block' && 'Transaction in block...'}
                {mintingStatus === 'complete' && 'Complete!'}
              </p>
              <p className="text-xs text-[#78716c] mt-1.5">
                {mintingStatus === 'mapping' && 'One-time setup — approve in your wallet'}
                {mintingStatus === 'broadcasting' && 'Approve in your wallet to continue'}
                {mintingStatus === 'in_block' && 'Waiting for finalization (~12s)'}
              </p>
            </div>
          </div>
        )}
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
            {hasActivePassForLocation && (
              <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-[#1c1917]" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-[#1c1917]">Active Pass</p>
                  <p className="text-xs text-[#57534e]">
                    You have an active pass for {selectedLocation?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowPassModal(activePass)}
                  className="text-xs text-[#1c1917] hover:text-[#292524] font-medium underline"
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
            ) : hasSubstrateWallet && hasMetaMask && accountMapping.isMapped === false ? (
              /* Optional info banner: Both wallets connected but Substrate not mapped */
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

                <button
                  onClick={handleMintClick}
                  disabled={
                    !selectedLocation ||
                    isGenerating ||
                    !accessPassContract.contract ||
                    hasActivePassForLocation
                  }
                  className="w-full py-3 px-4 bg-[#1c1917] text-white text-sm font-medium rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {mintingStatus === 'checking' && 'Checking for existing pass...'}
                      {mintingStatus === 'broadcasting' && 'Processing transaction...'}
                      {mintingStatus === 'complete' && 'Minting complete!'}
                    </>
                  ) : hasActivePassForLocation ? (
                    <>
                      <Check className="w-4 h-4" />
                      Active Pass for {selectedLocation?.name}
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
            ) : (
              /* No mapping required (or MetaMask fallback) — show mint button */
              <>
                <button
                  onClick={handleMintClick}
                  disabled={
                    !selectedLocation ||
                    isGenerating ||
                    !accessPassContract.contract ||
                    hasActivePassForLocation
                  }
                  className="w-full py-3 px-4 bg-[#1c1917] text-white text-sm font-medium rounded-xl hover:bg-[#292524] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {mintingStatus === 'checking' && 'Checking for existing pass...'}
                      {mintingStatus === 'broadcasting' && 'Processing transaction...'}
                      {mintingStatus === 'complete' && 'Minting complete!'}
                    </>
                  ) : hasActivePassForLocation ? (
                    <>
                      <Check className="w-4 h-4" />
                      Active Pass for {selectedLocation?.name}
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

      {/* Pre-action notice: account needs to be mapped first */}
      {showPreActionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#fafaf9] border border-[#e7e5e4] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#1c1917]">i</div>
              <div>
                <p className="text-sm font-semibold text-[#1c1917]">Account needs to be mapped first</p>
                <p className="text-xs text-[#78716c] mt-1">
                  Minting an access pass requires your account to be mapped for smart contract access. Up to 2 wallet signatures will be requested:
                </p>
              </div>
            </div>
            <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg px-4 py-3 mb-4 space-y-1">
              <p className="text-xs text-[#57534e]"><span className="font-semibold">1.</span> Map account <span className="text-[#a8a29e]">(one-time setup)</span></p>
              <p className="text-xs text-[#57534e]"><span className="font-semibold">2.</span> Mint access pass on-chain</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreActionModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowPreActionModal(false); handleGeneratePass() }}
                className="flex-1 px-4 py-2 text-sm bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
