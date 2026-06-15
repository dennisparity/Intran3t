import { useWallet } from '../providers/WalletProvider'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, ArrowLeft } from 'lucide-react'
import { GovernanceWidget, defaultGovernanceConfig } from '../modules/governance'
import { QuickNavWidget, defaultQuickNavConfig } from '../modules/quick-navigation'
import { HelpCenterWidget, defaultHelpCenterConfig } from '../modules/help-center'
import { ProfileWidget, defaultProfileConfig } from '../modules/profile'
import { FormsWidget, defaultFormsConfig } from '../modules/forms'
import { SlidesWidget, defaultSlidesConfig } from '../modules/slides'
import { OfficeBookingCard } from '../modules/office-booking'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useUserSearch } from '../hooks/useUserSearch'
import { UserSearchResults } from '../components/UserSearchResults'
import { SettingsMenu } from '../components/SettingsMenu'
import { useDiscoveredUsers } from '../hooks/useDiscoveredUsers'
import ConnectWallet from '../components/ConnectWallet'
import PolkadotLogo from '../components/PolkadotLogo'
import { useEVM } from '../providers/EVMProvider'
import { AddPluginModal } from '../components/AddPluginModal'

export default function ModularDashboard() {
  const { selectedAccount, isReconnecting } = useWallet()
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
  const [showPluginModal, setShowPluginModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  // Use search hook
  const { data: searchResults = [], isLoading: isSearching } = useUserSearch(searchQuery)

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

  return (
    <>
    <div className="min-h-screen p-6 bg-[#fafaf9] transition-filter duration-300">
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

              <QuickNavWidget config={defaultQuickNavConfig} />

              <HelpCenterWidget config={defaultHelpCenterConfig} />
            </div>

            {/* Main Content Area */}
            <div className="col-span-12 lg:col-span-9">
              <div className="grid grid-cols-12 gap-6 auto-rows-[250px]">
                <div className="col-span-12 xl:col-span-8 row-span-2">
                  <FormsWidget config={defaultFormsConfig} />
                </div>

                <div className="col-span-12 xl:col-span-4 row-span-1">
                  <OfficeBookingCard />
                </div>

                {/* Add Plugin — right rail, below Office Booking */}
                <div className="col-span-12 xl:col-span-4 row-span-1">
                  <button
                    onClick={() => setShowPluginModal(true)}
                    className="h-full w-full border-2 border-dashed border-[#e7e5e4] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#1c1917] hover:bg-[#fafaf9] transition-all duration-200 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl border border-[#e7e5e4] bg-white group-hover:border-[#1c1917] flex items-center justify-center transition-colors">
                      <span className="text-xl text-[#a8a29e] group-hover:text-[#1c1917] transition-colors leading-none">+</span>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-semibold text-[#1c1917] font-serif">Add Plugin</p>
                      <p className="text-xs text-[#78716c] mt-0.5">Build custom functionality</p>
                    </div>
                  </button>
                </div>

                <div className="col-span-12 xl:col-span-8 row-span-2">
                  <GovernanceWidget config={defaultGovernanceConfig} />
                </div>

                <div className="col-span-12 xl:col-span-4 row-span-2">
                  <SlidesWidget config={defaultSlidesConfig} />
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </div>

    </div>

    {/* Wallet gate disabled for local testing — re-enable before Triangle deploy */}
    {/* {!selectedAccount && !evm.connected && ( ... )} */}

    {showPluginModal && <AddPluginModal onClose={() => setShowPluginModal(false)} />}
    </>
  )
}
