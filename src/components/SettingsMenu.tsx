import { useState, useRef, useEffect } from 'react'
import { Settings, ShieldCheck, LogOut, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTypink } from 'typink'

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { disconnect } = useTypink()

  const handleDisconnect = () => {
    disconnect()
    setIsOpen(false)
    navigate('/')
  }

  const handleAdminClick = () => {
    setIsOpen(false)
    navigate('/admin')
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white border border-[#e7e5e4] hover:bg-[#fafaf9] rounded-xl transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex-shrink-0"
      >
        <Settings className="w-5 h-5 text-[#78716c]" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e7e5e4] rounded-xl shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e7e5e4] bg-[#fafaf9]">
            <h3 className="text-sm font-semibold text-[#1c1917]">Settings</h3>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Admin Section */}
            <button
              onClick={handleAdminClick}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#fafaf9] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[rgba(255,40,103,0.08)] group-hover:bg-[#ff2867]/10 transition-colors">
                  <ShieldCheck className="w-4 h-4 text-[#ff2867]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#1c1917]">Admin Panel</p>
                  <p className="text-xs text-[#78716c]">Manage organization settings</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#a8a29e] group-hover:text-[#78716c]" />
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-[#e7e5e4]" />

            {/* Disconnect Wallet */}
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
                <LogOut className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-red-600">Disconnect Wallet</p>
                <p className="text-xs text-red-500">Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
