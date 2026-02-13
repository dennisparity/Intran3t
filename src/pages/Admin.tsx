import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { useTypink } from 'typink'

// RBAC removed - Admin page temporarily simplified
// This page will be refactored to support the new permissionless model

export default function Admin() {
  const { connectedAccount } = useTypink()
  const navigate = useNavigate()

  if (!connectedAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
        <div className="max-w-md w-full text-center">
          <h2 className="text-3xl font-bold text-[#1c1917] mb-4 font-serif">
            Access Denied
          </h2>
          <p className="text-[#78716c] mb-8">
            Please connect your wallet to access the admin panel
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors font-medium"
          >
            Go to Landing Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Header */}
      <header className="border-b border-[#e7e5e4] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-[#f5f5f4] rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#78716c]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1c1917] font-serif">Admin Panel</h1>
              <p className="text-sm text-[#78716c]">Manage your organization</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <Shield className="w-16 h-16 text-[#78716c] mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-[#1c1917] mb-4 font-serif">
            Admin Panel Under Construction
          </h2>
          <p className="text-[#78716c] mb-6 leading-relaxed">
            The admin panel is being refactored to support the new permissionless model.
            RBAC (Role-Based Access Control) has been removed to simplify the system.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">What Changed?</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• RBAC smart contract removed</li>
              <li>• Anyone can now mint access passes (no role checks)</li>
              <li>• Simplified permission model</li>
              <li>• Admin features will be re-introduced with a simpler approach</li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-8 px-6 py-3 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  )
}
