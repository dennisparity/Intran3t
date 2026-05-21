import type { Desk } from '../modules/office-booking/types'

interface FloorMapProps {
  mapSrc: string
  desks: Desk[]
  bookedDeskIds: Set<string>
  myDeskIds?: Set<string>
  selectedDeskId?: string | null
  onSelectDesk: (deskId: string) => void
  bookerLabels?: Map<string, string> // deskId → display name or initials
}

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function FloorMap({ mapSrc, desks, bookedDeskIds, myDeskIds = new Set(), selectedDeskId, onSelectDesk, bookerLabels }: FloorMapProps) {
  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
      <img
        src={mapSrc}
        alt="Floor plan"
        className="w-full h-auto block"
        draggable={false}
      />
      {desks.map(desk => {
        const isSelected = selectedDeskId === desk.id
        const isBooked = bookedDeskIds.has(desk.id)
        const isMine = myDeskIds.has(desk.id)
        const isPersonal = desk.type === 'personal' || desk.type === 'full_area'
        const disabled = isBooked || isPersonal

        const bookerLabel = bookerLabels?.get(desk.id)
        const label = isSelected
          ? desk.name
          : isMine
          ? 'Me'
          : bookerLabel
          ? initials(bookerLabel)
          : desk.name.length <= 2
          ? desk.name
          : desk.name.slice(0, 2)

        const title = isPersonal
          ? `${desk.name} (personal)`
          : isMine
          ? `${desk.name} — your booking`
          : bookerLabel
          ? `${desk.name} — booked by ${bookerLabel}`
          : isBooked
          ? `${desk.name} (booked)`
          : desk.name

        let cls = 'absolute flex items-center justify-center text-[9px] font-bold rounded-sm border transition-colors '
        if (isSelected) {
          cls += 'bg-[#1c1917] text-white border-[#1c1917] z-10 '
        } else if (isMine) {
          cls += 'bg-stone-700 text-white border-stone-700 z-10 '
        } else if (isBooked) {
          cls += 'bg-stone-300 text-stone-600 border-stone-400 cursor-not-allowed '
        } else if (isPersonal) {
          cls += 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed '
        } else {
          cls += 'bg-white text-[#1c1917] border-stone-400 hover:border-[#1c1917] hover:bg-stone-50 cursor-pointer '
        }

        return (
          <button
            key={desk.id}
            className={cls}
            style={{
              left: `${desk.position.x}%`,
              top: `${desk.position.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '22px',
              height: '22px',
              minWidth: '22px',
              minHeight: '22px',
            }}
            onClick={() => !disabled && onSelectDesk(desk.id)}
            disabled={disabled}
            title={title}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
