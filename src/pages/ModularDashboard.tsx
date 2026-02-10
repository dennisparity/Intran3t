import { useTypink } from 'typink'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { IdentityOnboardingModal } from '../components/identity/IdentityOnboardingModal'
import { Acc3ssWidget, defaultAcc3ssConfig } from '../modules/acc3ss'
import { GovernanceWidget, defaultGovernanceConfig } from '../modules/governance'
import { QuickNavWidget, defaultQuickNavConfig } from '../modules/quick-navigation'
import { HelpCenterWidget, defaultHelpCenterConfig } from '../modules/help-center'
import { ProfileWidget, defaultProfileConfig } from '../modules/profile'
import { FormsWidget, defaultFormsConfig } from '../modules/forms'
import { AddressConverterWidget } from '../modules/address-converter'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useUserSearch } from '../hooks/useUserSearch'
import { UserSearchResults } from '../components/UserSearchResults'
import { useAccessControl } from '../hooks/useAccessControl'
import { LockedModule } from '../components/LockedModule'
import { SettingsMenu } from '../components/SettingsMenu'
import { useDiscoveredUsers } from '../hooks/useDiscoveredUsers'
import ConnectWallet from '../components/ConnectWallet'
import PolkadotLogo from '../components/PolkadotLogo'
import { useEVM } from '../providers/EVMProvider'

export default function ModularDashboard() {
  const { connectedAccount } = useTypink()
  const evm = useEVM()
  const navigate = useNavigate()
  const { address: profileAddress } = useParams<{ address?: string }>()
  const isViewingOtherProfile = !!profileAddress
  const { discoveredUsers } = useDiscoveredUsers()

  // Look up the EVM address for the profile being viewed
  const profileEvmAddress = useMemo(() => {
    if (!profileAddress) return undefined
    // If profileAddress is already EVM format, use it directly
    if (/^0x[a-fA-F0-9]{40}$/i.test(profileAddress)) {
      return profileAddress
    }
    // Otherwise look it up from discovered users
    const user = discoveredUsers.find(u => u.substrateAddress === profileAddress)
    return user?.evmAddress || undefined
  }, [profileAddress, discoveredUsers])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Use search hook
  const { data: searchResults = [], isLoading: isSearching } = useUserSearch(searchQuery)

  // Use access control hook
  const accessControl = useAccessControl(connectedAccount?.address || evm.account || undefined)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handleSelectUser = (address: string) => {
    navigate(`/profile/${address}`)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  // Show/hide search results based on query
  useEffect(() => {
    setShowSearchResults(searchQuery.trim().length >= 2)
  }, [searchQuery])

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show identity onboarding modal if user doesn't have verified identity
  useEffect(() => {
    if (!connectedAccount || isViewingOtherProfile) {
      console.log('🔍 Identity modal check: Not showing (no account or viewing other profile)')
      return
    }

    const dismissed = localStorage.getItem(
      `intran3t_identity_onboarding_dismissed_${connectedAccount.address}`
    )

    console.log('🔍 Identity modal check:', {
      address: connectedAccount.address,
      dismissed: !!dismissed,
      hasVerifiedIdentity: accessControl.hasVerifiedIdentity,
      isLoading: accessControl.isLoading
    })

    // Show modal if: wallet connected + no verified identity + not dismissed
    const shouldShow = !dismissed && !accessControl.hasVerifiedIdentity && !accessControl.isLoading
    console.log('🔍 Should show identity modal:', shouldShow)
    setShowOnboarding(shouldShow)
  }, [connectedAccount, accessControl.hasVerifiedIdentity, accessControl.isLoading, isViewingOtherProfile])

  return (
    <>
    <div className={`min-h-screen p-6 bg-[#fafaf9] transition-filter duration-300 ${!connectedAccount && !evm.connected ? 'blur-md pointer-events-none' : ''}`}>
      <div className="max-w-[1600px] mx-auto">
        {/* Top Bar with Branding, Search, and Settings */}
        <div className="flex items-center justify-between gap-6 mb-6">
          {/* Intran3t Branding */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <PolkadotLogo className="w-8 h-8 text-[#1c1917]" />
            <div>
              <div className="font-serif text-lg text-[#1c1917]">
                Intran<span className="text-[#a8a29e]">3</span>t
              </div>
              <div className="text-xs text-[#78716c] flex items-center gap-1">
                from <PolkadotLogo className="w-3 h-3 text-[#1c1917]" /> Polkadot
              </div>
            </div>
          </div>

          {/* Back to My Dashboard button (only shown when viewing another profile) */}
          {isViewingOtherProfile && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#78716c] hover:text-[#1c1917] hover:bg-white rounded-lg transition-all border border-[#e7e5e4]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Dashboard</span>
            </button>
          )}

          {/* Search Bar */}
          <div ref={searchRef} className="flex-1 max-w-2xl relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#78716c]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for team members..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#e7e5e4] rounded-xl text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/20 focus:border-[#1c1917] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                />
              </div>
            </form>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <UserSearchResults
                results={searchResults}
                isLoading={isSearching}
                onSelectUser={handleSelectUser}
                searchQuery={searchQuery}
              />
            )}
          </div>

          {/* Settings Menu */}
          <SettingsMenu />
        </div>

        {/* Main Layout - Different layout when viewing another profile */}
        <div className="grid grid-cols-12 gap-6">
          {isViewingOtherProfile ? (
            /* PROFILE VIEW LAYOUT - Only show profile module in sidebar position */
            <div className="col-span-12 lg:col-span-3">
              <ProfileWidget
                config={defaultProfileConfig}
                profileAddress={profileAddress}
                profileEvmAddress={profileEvmAddress}
                isOwnProfile={false}
              />
            </div>
          ) : (
            /* NORMAL DASHBOARD LAYOUT - Show all modules */
            <>
            {/* Left Sidebar */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* Profile - Always accessible */}
              <ProfileWidget config={defaultProfileConfig} />

              {/* Quick Navigation - Requires verified identity */}
              {accessControl.canAccessQuickNav ? (
                <QuickNavWidget config={defaultQuickNavConfig} />
              ) : (
                <LockedModule moduleName="Quick Navigation" compact />
              )}

              {/* Help Center - Requires verified identity */}
              {accessControl.canAccessHelpCenter ? (
                <HelpCenterWidget config={defaultHelpCenterConfig} />
              ) : (
                <LockedModule moduleName="Help Center" compact />
              )}
            </div>

            {/* Main Content Area */}
            <div className="col-span-12 lg:col-span-9">
              <div className="grid grid-cols-12 gap-6 auto-rows-[250px]">
                {/* Parity DAO - Requires verified identity */}
                <div className="col-span-12 xl:col-span-8 row-span-2">
                  {accessControl.canAccessGovernance ? (
                    <GovernanceWidget config={defaultGovernanceConfig} />
                  ) : (
                    <LockedModule
                      moduleName="Governance"
                      description="Participate in organization polls and decisions with a verified identity."
                    />
                  )}
                </div>

                {/* Acc3ss - Requires verified identity */}
                <div className="col-span-12 xl:col-span-4 row-span-2">
                  {accessControl.canAccessAcc3ss ? (
                    <Acc3ssWidget config={defaultAcc3ssConfig} />
                  ) : (
                    <LockedModule
                      moduleName="Acc3ss"
                      description="Mint and manage NFT access passes with a verified identity."
                    />
                  )}
                </div>

                {/* Forms - Requires verified identity */}
                <div className="col-span-12 xl:col-span-8 row-span-2">
                  {accessControl.canAccessForms ? (
                    <FormsWidget config={defaultFormsConfig} />
                  ) : (
                    <LockedModule
                      moduleName="Forms"
                      description="Create and submit forms to collect team feedback with a verified identity."
                    />
                  )}
                </div>

                {/* Address Converter - Utility module, always accessible */}
                <div className="col-span-12 xl:col-span-4 row-span-2">
                  <AddressConverterWidget />
                </div>

                {/* Add Plugin - Moved below Forms */}
                <div className="col-span-12 xl:col-span-8 row-span-1">
                  <div className="h-full border-2 border-dashed border-[#e7e5e4] rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#1c1917] hover:bg-[#fafaf9] transition-all duration-200 cursor-pointer group">
                    <div className="w-14 h-14 rounded-xl border border-[#e7e5e4] bg-white group-hover:border-[#1c1917] flex items-center justify-center transition-colors">
                      <span className="text-2xl text-[#a8a29e] group-hover:text-[#1c1917] transition-colors leading-none">+</span>
                    </div>
                    <div className="text-center px-6">
                      <p className="text-sm font-semibold text-[#1c1917] font-serif">Add Plugin</p>
                      <p className="text-xs text-[#78716c] mt-0.5">Build custom functionality for your dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </div>

      {/* Identity Onboarding Modal */}
      <IdentityOnboardingModal
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onDismiss={() => {
          if (connectedAccount) {
            localStorage.setItem(
              `intran3t_identity_onboarding_dismissed_${connectedAccount.address}`,
              'true'
            )
          }
          setShowOnboarding(false)
        }}
      />
    </div>

    {!connectedAccount && !evm.connected && (
      <div className="fixed inset-0 bg-[#0f0f0f]/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl border border-[#e7e5e4] p-10 max-w-sm w-full mx-4 shadow-xl text-center">
          <div className="w-14 h-14 bg-[#fafaf9] rounded-xl border border-[#e7e5e4] flex items-center justify-center mx-auto mb-5">
            <PolkadotLogo className="w-8 h-8 text-[#1c1917]" />
          </div>
          <h2 className="font-serif text-2xl text-[#1c1917] mb-2">Welcome back</h2>
          <p className="text-sm text-[#78716c] mb-6">Connect your wallet to access the dashboard</p>
          <div className="flex justify-center">
            <ConnectWallet />
          </div>
        </div>
      </div>
    )}
    </>
  )
}
