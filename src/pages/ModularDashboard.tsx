import { useTypink } from 'typink'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Acc3ssWidget, defaultAcc3ssConfig } from '../modules/acc3ss'
import { GovernanceWidget, defaultGovernanceConfig } from '../modules/governance'
import { QuickNavWidget, defaultQuickNavConfig } from '../modules/quick-navigation'
import { HelpCenterWidget, defaultHelpCenterConfig } from '../modules/help-center'
import { ProfileWidget, defaultProfileConfig } from '../modules/profile'

export default function ModularDashboard() {
  const { connectedAccount } = useTypink()
  const navigate = useNavigate()

  // Show message if not connected instead of redirecting
  if (!connectedAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white mb-6 shadow-lg overflow-hidden">
            <img src="/logo.png" alt="Intran3t Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-3xl font-bold text-[#1c1917] mb-4 font-serif">
            Connect Your Wallet
          </h2>
          <p className="text-[#78716c] mb-8">
            Please connect your Polkadot wallet to access the dashboard
          </p>
          <Button
            variant="gradient"
            size="lg"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            Go to Landing Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-[#fafaf9]">
      <div className="max-w-[1600px] mx-auto">
        {/* Top Bar with Branding and Settings */}
        <div className="flex items-center justify-between gap-3 mb-6">
          {/* Intran3t Branding */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-md overflow-hidden">
              <img src="/logo.png" alt="Intran3t Logo" className="w-full h-full object-contain p-1.5" />
            </div>
            <h1 className="text-2xl font-bold text-[#1c1917] font-serif">
              Intran<span className="text-gradient">3</span>t
            </h1>
          </div>

          {/* Settings Button */}
          <button className="p-3 bg-white border border-[#e7e5e4] hover:bg-[#fafaf9] rounded-xl transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <Settings className="w-5 h-5 text-[#78716c]" />
          </button>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Profile */}
            <ProfileWidget config={defaultProfileConfig} />

            {/* Quick Navigation */}
            <QuickNavWidget config={defaultQuickNavConfig} />

            {/* Help Center */}
            <HelpCenterWidget config={defaultHelpCenterConfig} />
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            <div className="grid grid-cols-12 gap-6 auto-rows-[250px]">
              {/* Parity DAO - More space */}
              <div className="col-span-12 xl:col-span-8 row-span-2">
                <GovernanceWidget config={defaultGovernanceConfig} />
              </div>

              {/* Acc3ss - More space */}
              <div className="col-span-12 xl:col-span-4 row-span-2">
                <Acc3ssWidget config={defaultAcc3ssConfig} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
