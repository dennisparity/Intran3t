import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { isWorkingDay, formatDate } from '../modules/office-booking/config'

interface MonthCalendarProps {
  selectedDates: string[]
  onToggle: (dateStr: string) => void
  maxDaysAhead?: number
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export function MonthCalendar({ selectedDates, onToggle, maxDaysAhead = 30 }: MonthCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + maxDaysAhead)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthLabel = viewDate.toLocaleString('en', { month: 'long', year: 'numeric' })

  // First day of month (0=Sun, shift to Mon-first)
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const startOffset = (firstDayOfMonth + 6) % 7  // Mon=0 offset
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm text-[#1c1917]">{monthLabel}</span>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-stone-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-stone-500" />
          </button>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-stone-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-stone-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAY_HEADERS.map(d => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${d === 'Sa' || d === 'Su' ? 'text-stone-300' : 'text-stone-500'}`}>
            {d}
          </div>
        ))}

        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const date = new Date(year, month, day)
          date.setHours(0, 0, 0, 0)
          const dateStr = formatDate(date)
          const isSelected = selectedDates.includes(dateStr)
          const isPast = date < today
          const isTooFar = date > maxDate
          const isWeekend = !isWorkingDay(date)
          const isToday = date.getTime() === today.getTime()
          const disabled = isPast || isTooFar || isWeekend

          return (
            <button
              key={idx}
              onClick={() => !disabled && onToggle(dateStr)}
              disabled={disabled}
              className={[
                'w-full aspect-square flex items-center justify-center text-xs rounded transition-colors',
                isSelected
                  ? 'bg-[#1c1917] text-white font-semibold'
                  : isToday && !disabled
                  ? 'ring-1 ring-[#1c1917] text-[#1c1917] font-medium hover:bg-stone-100'
                  : disabled
                  ? 'text-stone-300 cursor-not-allowed'
                  : 'text-[#1c1917] hover:bg-stone-100 cursor-pointer'
              ].join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
