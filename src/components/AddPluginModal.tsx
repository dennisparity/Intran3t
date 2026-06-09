import { X, MessageSquare, LayoutGrid, Code2, Check } from 'lucide-react'
import { useState } from 'react'

interface AddPluginModalProps {
  onClose: () => void
}

export function AddPluginModal({ onClose }: AddPluginModalProps) {
  const [requested, setRequested] = useState(false)

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#e7e5e4]">
          <h2 className="text-base font-semibold text-[#1c1917] font-serif">Add Plugin</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#78716c]" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={() => setRequested(true)}
            className="w-full text-left flex items-start gap-3 p-4 rounded-xl border border-[#e7e5e4] hover:border-[#1c1917] hover:bg-[#fafaf9] transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#f5f5f4] group-hover:bg-[#e7e5e4] flex items-center justify-center flex-shrink-0 transition-colors">
              {requested ? (
                <Check className="w-4 h-4 text-[#1c1917]" />
              ) : (
                <MessageSquare className="w-4 h-4 text-[#1c1917]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1c1917]">
                {requested ? 'Request noted' : 'Request a Feature'}
              </p>
              <p className="text-xs text-[#78716c] mt-0.5">
                {requested
                  ? 'The team will review and prioritise accordingly.'
                  : 'Tell the Intran3t team what functionality you need.'}
              </p>
            </div>
          </button>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-[#e7e5e4] opacity-50">
            <div className="w-9 h-9 rounded-lg bg-[#f5f5f4] flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-4 h-4 text-[#78716c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#1c1917]">Browse Plugins</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f5f4] text-[#78716c] rounded font-medium">Coming soon</span>
              </div>
              <p className="text-xs text-[#78716c] mt-0.5">Choose from available community plugins and add them to your dashboard.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-[#e7e5e4] opacity-50">
            <div className="w-9 h-9 rounded-lg bg-[#f5f5f4] flex items-center justify-center flex-shrink-0">
              <Code2 className="w-4 h-4 text-[#78716c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#1c1917]">Build & Publish</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f5f4] text-[#78716c] rounded font-medium">Coming soon</span>
              </div>
              <p className="text-xs text-[#78716c] mt-0.5">Create a custom plugin or worker and publish it to the Polkadot ecosystem.</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#292524] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
