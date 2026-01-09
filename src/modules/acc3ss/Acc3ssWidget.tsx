import { useState, useEffect } from 'react'
import { useTypink } from 'typink'
import { MapPin, QrCode, Check, Download, KeyRound, Loader2, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import type { Acc3ssConfig, Location, AccessPass } from './types'
import { loadAccessPasses, saveAccessPasses } from './config'
import QRCode from 'qrcode'
import { mintAccessPassNFT, createAccessPassCollection, type NFTMetadata } from './nft-helpers'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

async function generateSignature(message: string, account: any): Promise<string> {
  // TODO: Implement actual wallet signing with PAPI
  // For now, create a mock signature
  const mockSignature = `0x${Math.random().toString(16).substring(2)}`
  console.log('Signing message:', message)
  console.log('With account:', account.address)
  return mockSignature
}

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
          ? 'bg-gradient-to-br from-[#ff2867]/10 to-[#e6007a]/5 border-[#ff2867] shadow-lg'
          : 'bg-white border-[#e7e5e4] hover:border-[#d6d3d1] hover:shadow-md'
      }`}
    >
      <div className="text-4xl">{location.icon}</div>
      <div className="flex-1">
        <h3 className={`text-sm font-semibold ${isSelected ? 'text-[#ff2867]' : 'text-[#1c1917]'}`}>
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
          <Check className="w-5 h-5 text-[#ff2867]" />
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
    link.download = `access-pass-${pass.location}-${pass.id}.png`
    link.href = pass.qrCode
    link.click()
  }

  const handleViewOnChain = () => {
    if (pass.txHash) {
      // Open Subscan for Paseo Polkadot Hub
      window.open(`https://assethub-paseo.subscan.io/extrinsic/${pass.txHash}`, '_blank')
    } else if (pass.nftId && pass.collectionId) {
      // Open Polkadot Hub NFT explorer
      window.open(
        `https://assethub-paseo.subscan.io/nft/${pass.collectionId}/${pass.nftId}`,
        '_blank'
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-grey-900 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold font-serif">
              {pass.onChain ? 'NFT Access Pass' : 'Access Pass'}
            </h2>
            <KeyRound className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90">
            {pass.onChain ? 'On-chain NFT credential' : 'Valid entry credential'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* On-Chain Badge */}
          {pass.onChain && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">Minted on Paseo Polkadot Hub</p>
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
            {pass.onChain && pass.collectionId && (
              <div className="flex justify-between items-center py-2 border-b border-[#e7e5e4]">
                <span className="text-sm text-[#78716c]">Collection</span>
                <span className="text-xs font-mono text-[#1c1917]">
                  #{pass.collectionId}
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
            {pass.onChain && (pass.txHash || pass.nftId) && (
              <button
                onClick={handleViewOnChain}
                className="flex-1 px-4 py-2 border border-[#e7e5e4] text-[#1c1917] rounded-lg hover:bg-[#fafaf9] transition-colors font-medium flex items-center justify-center gap-2"
              >
                View on Subscan
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 bg-grey-900 text-white rounded-xl hover:bg-grey-800 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
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

export function Acc3ssWidget({ config }: { config: Acc3ssConfig }) {
  const { connectedAccount } = useTypink()
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [passes, setPasses] = useState<AccessPass[]>([])
  const [showPassModal, setShowPassModal] = useState<AccessPass | null>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [createdCollectionId, setCreatedCollectionId] = useState<number | null>(null)

  const locations = config.locations || []

  useEffect(() => {
    setPasses(loadAccessPasses())
  }, [])

  const handleCreateCollection = async () => {
    if (!connectedAccount) {
      alert('No wallet connected. Please connect your wallet first.')
      return
    }

    console.log('Starting collection creation with account:', connectedAccount)
    console.log('Wallet info:', connectedAccount.wallet)
    setIsCreatingCollection(true)

    try {
      // Get the wallet source - Talisman uses 'talisman' as the source
      const walletSource = connectedAccount.wallet?.extensionName || 'talisman'
      console.log('Using wallet source:', walletSource)

      // Convert Typink account to InjectedAccountWithMeta format
      const injectedAccount: InjectedAccountWithMeta = {
        address: connectedAccount.address,
        meta: {
          name: connectedAccount.name || 'Account',
          source: walletSource
        }
      }

      console.log('Injected account:', injectedAccount)
      console.log('Calling createAccessPassCollection...')

      // Create collection with current user as admin
      const result = await createAccessPassCollection(injectedAccount, connectedAccount.address)

      console.log('Collection creation result:', result)

      if (result.success && result.collectionId) {
        setCreatedCollectionId(result.collectionId)
        alert(
          `Collection created successfully!\n\nCollection ID: ${result.collectionId}\n\nPlease update the nftCollectionId in your config to use this collection ID.`
        )
      } else {
        throw new Error(result.error || 'Failed to create collection')
      }
    } catch (e: any) {
      console.error('Failed to create collection:', e)
      alert(`Failed to create NFT collection: ${e.message || 'Unknown error'}`)
    } finally {
      setIsCreatingCollection(false)
    }
  }

  const handleGeneratePass = async () => {
    if (!selectedLocation || !connectedAccount) return

    setIsGenerating(true)

    try {
      // Create message to sign
      const message = JSON.stringify({
        location: selectedLocation.id,
        holder: connectedAccount.address,
        timestamp: Date.now(),
        purpose: 'access-pass'
      })

      // Sign with wallet
      const signature = await generateSignature(message, connectedAccount)

      // Create access pass data
      const now = Date.now()
      const expiresAt = config.passValidityHours
        ? now + config.passValidityHours * 60 * 60 * 1000
        : undefined

      let passData: AccessPass = {
        id: `pass-${Date.now()}`,
        location: selectedLocation.name,
        locationId: selectedLocation.id,
        holder: connectedAccount.address,
        createdAt: now,
        expiresAt,
        signature
      }

      // Mint NFT if enabled
      if (config.generateNFT && config.nftCollectionId) {
        // Prepare NFT metadata
        const nftMetadata: NFTMetadata = {
          location: selectedLocation.name,
          locationId: selectedLocation.id,
          holder: connectedAccount.address,
          expiresAt,
          createdAt: now,
          accessLevel: 'standard'
        }

        // Get the wallet source - Talisman uses 'talisman' as the source
        const walletSource = connectedAccount.wallet?.extensionName || 'talisman'
        console.log('Minting NFT with wallet source:', walletSource)

        // Convert Typink account to InjectedAccountWithMeta format
        const injectedAccount: InjectedAccountWithMeta = {
          address: connectedAccount.address,
          meta: {
            name: connectedAccount.name || 'Account',
            source: walletSource
          }
        }

        // Mint NFT on Polkadot Hub
        const nftResult = await mintAccessPassNFT(
          injectedAccount,
          nftMetadata,
          config.nftCollectionId
        )

        if (nftResult.success && nftResult.nftId) {
          passData.nftId = nftResult.nftId
          passData.collectionId = config.nftCollectionId
          passData.txHash = nftResult.txHash
          passData.onChain = true
        } else {
          // NFT minting failed - stop here and don't save the pass
          throw new Error(nftResult.error || 'Failed to mint NFT on Polkadot Hub')
        }
      }

      // Generate QR code (includes NFT ID if minted)
      const qrData = JSON.stringify({
        passId: passData.id,
        location: selectedLocation.id,
        holder: connectedAccount.address,
        signature,
        expiresAt,
        nftId: passData.nftId,
        collectionId: passData.collectionId
      })
      const qrCode = await generateQRCode(qrData)
      passData.qrCode = qrCode

      // Save pass only if we reached this point (NFT minting succeeded or was not required)
      const updatedPasses = [passData, ...passes]
      setPasses(updatedPasses)
      saveAccessPasses(updatedPasses)

      // Show pass modal
      setShowPassModal(passData)
    } catch (e: any) {
      console.error('Failed to generate pass:', e)
      alert(`Failed to generate access pass: ${e.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Get active pass for selected location
  const activePass = selectedLocation
    ? passes.find(
        p =>
          (p.locationId === selectedLocation.id || p.location === selectedLocation.name) &&
          p.holder === connectedAccount?.address &&
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
            {config.description || 'Generate access passes for Parity locations'}
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
        {connectedAccount ? (
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

            <button
              onClick={handleGeneratePass}
              disabled={!selectedLocation || isGenerating}
              className="w-full py-3 px-4 bg-grey-900 text-white text-sm font-medium rounded-xl hover:bg-grey-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {config.generateNFT ? 'Minting NFT...' : 'Generating...'}
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  {config.generateNFT ? 'Mint NFT Access Pass' : 'Generate QR Code Pass'}
                </>
              )}
            </button>

            {selectedLocation && (
              <p className="text-xs text-center text-[#78716c]">
                {config.generateNFT
                  ? `Mint an NFT access pass for ${selectedLocation.name} on Paseo Polkadot Hub`
                  : `Sign with your wallet to generate an access pass for ${selectedLocation.name}`}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-4 text-center">
            <p className="text-sm text-[#78716c]">
              Connect your wallet to generate access passes
            </p>
          </div>
        )}

        {/* Admin Panel */}
        {connectedAccount && config.generateNFT && (
          <div className="mt-4 border-t border-[#e7e5e4] pt-4">
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="w-full flex items-center justify-between text-xs text-[#78716c] hover:text-[#1c1917] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-3 h-3" />
                Admin: NFT Collection Setup
              </span>
              {showAdminPanel ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showAdminPanel && (
              <div className="mt-3 space-y-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-3">
                <div className="text-xs text-[#78716c] space-y-2">
                  <p>
                    <strong>Current Collection ID:</strong> {config.nftCollectionId || 'Not set'}
                  </p>
                  {createdCollectionId && (
                    <p className="text-green-700">
                      <strong>Last Created:</strong> {createdCollectionId}
                    </p>
                  )}
                  <p className="text-[#a8a29e]">
                    Create a new NFT collection on Paseo Polkadot Hub. This is a one-time setup required before minting access passes.
                  </p>
                </div>

                <button
                  onClick={handleCreateCollection}
                  disabled={isCreatingCollection}
                  className="w-full py-2 px-3 bg-[#1c1917] text-white text-xs font-medium rounded-lg hover:bg-[#292524] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingCollection ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Creating Collection...
                    </>
                  ) : (
                    <>
                      <Settings className="w-3 h-3" />
                      Create NFT Collection
                    </>
                  )}
                </button>

                {createdCollectionId && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
                    <p className="font-medium mb-1">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-green-600">
                      <li>Copy the Collection ID: <code className="font-mono font-bold">{createdCollectionId}</code></li>
                      <li>Update <code className="font-mono">nftCollectionId</code> in your config</li>
                      <li>Refresh the app to start minting access passes</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showPassModal && (
        <AccessPassModal pass={showPassModal} onClose={() => setShowPassModal(null)} />
      )}
    </>
  )
}
