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
import { useState, useRef, useEffect } from 'react'
import { useUserSearch } from '../hooks/useUserSearch'
import { UserSearchResults } from '../components/UserSearchResults'
import { useAccessControl } from '../hooks/useAccessControl'
import { LockedModule } from '../components/LockedModule'
import { SettingsMenu } from '../components/SettingsMenu'

export default function ModularDashboard() {
  const { connectedAccount } = useTypink()
  const navigate = useNavigate()
  const { address: profileAddress } = useParams<{ address?: string }>()
  const isViewingOtherProfile = !!profileAddress
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Use search hook
  const { data: searchResults = [], isLoading: isSearching } = useUserSearch(searchQuery)

  // Use access control hook
  const accessControl = useAccessControl(connectedAccount?.address)

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

  // Redirect to /start if not connected
  if (!connectedAccount) {
    navigate('/start')
    return null
  }

  return (
    <div className="min-h-screen p-6 bg-[#fafaf9]">
      <div className="max-w-[1600px] mx-auto">
        {/* Top Bar with Branding, Search, and Settings */}
        <div className="flex items-center justify-between gap-6 mb-6">
          {/* Intran3t Branding */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-md overflow-hidden">
              <img src="/logo.png" alt="Intran3t Logo" className="w-full h-full object-contain p-1.5" />
            </div>
            <h1 className="text-2xl font-bold text-[#1c1917] font-serif">
              Intran<span className="text-accent">3</span>t
            </h1>
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
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#e7e5e4] rounded-xl text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
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
                <LockedModule moduleName="Quick Navigation" />
              )}

              {/* Help Center - Requires verified identity */}
              {accessControl.canAccessHelpCenter ? (
                <HelpCenterWidget config={defaultHelpCenterConfig} />
              ) : (
                <LockedModule moduleName="Help Center" />
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
  )
}
