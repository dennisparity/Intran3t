import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { OFFICES } from './config'

export function OfficeBookingCard() {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-[#1c1917]" />
        </div>
      </div>
      <h3 className="font-semibold text-sm text-[#1c1917] mb-1">Office Booking</h3>
      <p className="text-xs text-stone-500 mb-4">
        Berlin, London &amp; Lisbon — book a desk or meeting room, on-chain.
      </p>
      <div className="flex gap-2 mt-auto">
        {OFFICES.map(office => (
          <button
            key={office.id}
            onClick={() => navigate(`/office?office=${office.id}`)}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-colors"
          >
            <span className="text-base leading-none">{office.icon}</span>
            <span className="text-[10px] font-medium text-stone-600">{office.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
