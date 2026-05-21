import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Users, Clock, ChevronDown, X } from 'lucide-react'
import QRCode from 'qrcode'
import { MonthCalendar } from '../components/MonthCalendar'
import { FloorMap } from '../components/FloorMap'
import { OFFICES, formatDate, isWorkingDay, generateSlots, getDeskResourceId, getRoomSlotResourceId } from '../modules/office-booking/config'
import { useBookingReads, useBookingWrites } from '../hooks/useOfficeBookingContract'
import { useSubstrateEVMSigner } from '../hooks/useSubstrateEVMSigner'
import { useDiscoveredUsers } from '../hooks/useDiscoveredUsers'
import { fetchRegistryIdentities } from '../services/dotid-registry'
import type { OfficeConfig, Area, PendingDeskBooking, PendingRoomBooking } from '../modules/office-booking/types'

type Tab = 'desks' | 'rooms' | 'myBookings'

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function nameInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function OfficePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { evmAddress } = useSubstrateEVMSigner()
  const { discoveredUsers } = useDiscoveredUsers()
  const { getBookingsForArea, getBookingsForRooms } = useBookingReads()
  const { bookDesk, bookRoomSlot, cancelBooking, isLoading: isSubmitting } = useBookingWrites()

  // Support ?office=berlin|london|lisbon deep link from dashboard card
  const initialOffice = OFFICES.find(o => o.id === searchParams.get('office')) ?? OFFICES[0]
  const [selectedOffice, setSelectedOffice] = useState<OfficeConfig>(initialOffice)
  const [activeTab, setActiveTab] = useState<Tab>('desks')

  // Desk tab state
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [selectedArea, setSelectedArea] = useState<Area>(initialOffice.areas[0])
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null)
  const [pendingBookings, setPendingBookings] = useState<PendingDeskBooking[]>([])
  const [areaBookings, setAreaBookings] = useState<Map<string, Map<string, string>>>(new Map())
  const [bookingStatus, setBookingStatus] = useState('')

  // Resolved display names: evmAddress → name
  const [resolvedNames, setResolvedNames] = useState<Map<string, string>>(new Map())

  // Room tab state
  const [roomDate, setRoomDate] = useState<string>(formatDate((() => {
    const d = new Date()
    while (!isWorkingDay(d)) d.setDate(d.getDate() + 1)
    return d
  })()))
  const [roomBookings, setRoomBookings] = useState<Map<string, Map<string, string>>>(new Map())

  // My Bookings — store locally after successful submissions
  const [myBookings, setMyBookings] = useState<{ locationId: number; date: string; resourceId: string; label: string; qrCode?: string }[]>([])

  // Collect all unique EVM booker addresses from current area bookings
  const allBookerAddresses = useMemo(() => {
    const addrs = new Set<string>()
    for (const dateMap of areaBookings.values()) {
      for (const addr of dateMap.values()) {
        if (addr && addr !== '0x0000000000000000000000000000000000000000') addrs.add(addr)
      }
    }
    return [...addrs]
  }, [areaBookings])

  // Resolve EVM addresses to display names via discoveredUsers + People Chain registry
  useEffect(() => {
    if (allBookerAddresses.length === 0) return
    let cancelled = false
    const resolve = async () => {
      const identities = await fetchRegistryIdentities().catch(() => [])
      const map = new Map<string, string>()
      for (const evmAddr of allBookerAddresses) {
        const discovered = discoveredUsers.find(u => u.evmAddress?.toLowerCase() === evmAddr.toLowerCase())
        if (discovered) {
          const identity = identities.find(id => id.address === discovered.substrateAddress)
          if (identity?.display) {
            map.set(evmAddr, identity.display)
            continue
          }
        }
        map.set(evmAddr, shortAddr(evmAddr))
      }
      if (!cancelled) setResolvedNames(map)
    }
    resolve()
    return () => { cancelled = true }
  }, [allBookerAddresses.join(','), discoveredUsers])

  // Per-desk booker label (for FloorMap overlay)
  const deskBookerLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const [deskId, dateMap] of areaBookings) {
      for (const addr of dateMap.values()) {
        if (addr && addr !== '0x0000000000000000000000000000000000000000') {
          map.set(deskId, resolvedNames.get(addr) ?? shortAddr(addr))
          break
        }
      }
    }
    return map
  }, [areaBookings, resolvedNames])

  // People in the office on the primary selected date
  const peopleInOfficeToday = useMemo(() => {
    const primaryDate = selectedDates[0] ?? formatDate(new Date())
    const people: { addr: string; name: string }[] = []
    for (const [, dateMap] of areaBookings) {
      const addr = dateMap.get(primaryDate)
      if (addr && addr !== '0x0000000000000000000000000000000000000000') {
        if (!people.find(p => p.addr === addr)) {
          people.push({ addr, name: resolvedNames.get(addr) ?? shortAddr(addr) })
        }
      }
    }
    return people
  }, [areaBookings, selectedDates, resolvedNames])

  const switchOffice = (office: OfficeConfig) => {
    setSelectedOffice(office)
    setSelectedArea(office.areas[0])
    setSelectedDeskId(null)
    setSelectedDates([])
    setPendingBookings([])
    setAreaBookings(new Map())
  }

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    )
    setSelectedDeskId(null)
  }

  const selectDesk = (deskId: string) => {
    setSelectedDeskId(prev => prev === deskId ? null : deskId)
  }

  const addDeskToCart = () => {
    if (!selectedDeskId || selectedDates.length === 0) return
    const desk = selectedArea.desks.find(d => d.id === selectedDeskId)
    if (!desk) return
    setPendingBookings(prev => [...prev, {
      dates: [...selectedDates],
      areaId: selectedArea.id,
      deskId: selectedDeskId,
      deskName: desk.name,
      areaName: selectedArea.name
    }])
    setSelectedDeskId(null)
    setSelectedDates([])
  }

  const removePending = (idx: number) => {
    setPendingBookings(prev => prev.filter((_, i) => i !== idx))
  }

  const submitDeskBookings = async () => {
    // If there's a current selection not yet added to the cart, include it
    const currentSelection: typeof pendingBookings = []
    if (selectedDeskId && selectedDates.length > 0) {
      const desk = selectedArea.desks.find(d => d.id === selectedDeskId)
      if (desk) {
        currentSelection.push({
          dates: [...selectedDates],
          areaId: selectedArea.id,
          deskId: selectedDeskId,
          deskName: desk.name,
          areaName: selectedArea.name
        })
      }
    }
    const toSubmit = [...pendingBookings, ...currentSelection]
    if (toSubmit.length === 0) return
    setBookingStatus('Signing...')
    try {
      for (const booking of toSubmit) {
        await bookDesk(
          selectedOffice.locationId,
          booking.dates,
          booking.areaId,
          booking.deskId,
          stage => setBookingStatus(stage === 'broadcasted' ? 'Submitted, waiting for confirmation...' : 'Confirmed on chain')
        )
        for (const date of booking.dates) {
          const resourceId = getDeskResourceId(booking.areaId, booking.deskId)
          const qrData = JSON.stringify({
            office: selectedOffice.id,
            locationId: selectedOffice.locationId,
            date,
            resourceId,
            desk: booking.deskName,
            area: booking.areaName,
            booker: evmAddress
          })
          const qrCode = await QRCode.toDataURL(qrData, { width: 200, margin: 2, color: { dark: '#1c1917', light: '#ffffff' } }).catch(() => undefined)
          setMyBookings(prev => [...prev, {
            locationId: selectedOffice.locationId,
            date,
            resourceId,
            label: `${selectedOffice.name} — Desk ${booking.deskName}, ${booking.areaName} — ${date}`,
            qrCode
          }])
        }
      }
      setPendingBookings([])
      setSelectedDeskId(null)
      setSelectedDates([])
      setBookingStatus('Bookings confirmed!')
      setTimeout(() => setBookingStatus(''), 3000)
      setActiveTab('myBookings')
      refreshAreaBookings()
    } catch (err) {
      setBookingStatus(err instanceof Error ? err.message : 'Booking failed')
    }
  }

  const refreshAreaBookings = useCallback(async () => {
    if (selectedDates.length === 0 && pendingBookings.length === 0) return
    const datesSet = new Set([...selectedDates, ...pendingBookings.flatMap(b => b.dates)])
    if (datesSet.size === 0) return
    const result = await getBookingsForArea(selectedOffice.locationId, [...datesSet], selectedArea.desks)
    setAreaBookings(result)
  }, [selectedOffice.locationId, selectedArea.desks, selectedDates, pendingBookings, getBookingsForArea])

  useEffect(() => {
    refreshAreaBookings()
  }, [refreshAreaBookings])

  useEffect(() => {
    if (!selectedOffice.rooms.length || !roomDate) return
    getBookingsForRooms(selectedOffice.locationId, roomDate, selectedOffice.rooms)
      .then(setRoomBookings)
  }, [selectedOffice.locationId, selectedOffice.rooms, roomDate, getBookingsForRooms])

  // Compute booked desks for current selection (any date in selectedDates is booked)
  const bookedDeskIds = new Set<string>()
  const myDeskIds = new Set<string>()
  for (const [deskId, dateMap] of areaBookings) {
    for (const [, booker] of dateMap) {
      if (booker.toLowerCase() === evmAddress?.toLowerCase()) {
        myDeskIds.add(deskId)
      } else {
        bookedDeskIds.add(deskId)
      }
    }
  }

  const cancelMyBooking = async (booking: { locationId: number; date: string; resourceId: string; label: string }, idx: number) => {
    try {
      await cancelBooking(booking.locationId, booking.date, booking.resourceId)
      setMyBookings(prev => prev.filter((_, i) => i !== idx))
    } catch (err) {
      console.error('Cancel failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-stone-500 hover:text-[#1c1917] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <span className="text-stone-300">|</span>
          <h1 className="text-lg font-semibold text-[#1c1917]">Office Booking</h1>
          <div className="flex gap-1 ml-auto">
            {OFFICES.map(office => (
              <button
                key={office.id}
                onClick={() => switchOffice(office)}
                className={[
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  selectedOffice.id === office.id
                    ? 'bg-[#1c1917] text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
                ].join(' ')}
              >
                {office.icon} {office.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-stone-200">
          {(['desks', 'rooms', 'myBookings'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-[#1c1917] text-[#1c1917]'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              ].join(' ')}
            >
              {tab === 'desks' ? '🪑 Desks' : tab === 'rooms' ? '🚪 Meeting Rooms' : `📋 My Bookings${myBookings.length > 0 ? ` (${myBookings.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Desks Tab */}
        {activeTab === 'desks' && (
          <>
          {/* Who's in the office */}
          {peopleInOfficeToday.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
              <div className="flex -space-x-1.5">
                {peopleInOfficeToday.map(({ addr, name }) => (
                  <div
                    key={addr}
                    title={name}
                    className="w-7 h-7 rounded-full bg-stone-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-stone-600 uppercase flex-shrink-0"
                  >
                    {nameInitials(name)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-stone-500">
                {peopleInOfficeToday.map(p => p.name).join(', ')} {peopleInOfficeToday.length === 1 ? 'is' : 'are'} in the {selectedOffice.name} office
                {selectedDates[0] ? ` on ${new Date(selectedDates[0] + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}` : ' today'}
              </span>
            </div>
          )}
          <div className="flex gap-6">
            {/* Left panel */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-stone-200 p-4">
                <h2 className="font-semibold text-sm text-[#1c1917] mb-1">🏢 Office Visiting days</h2>
                <p className="text-xs text-stone-500 mb-3">Select desired dates for your visit.</p>
                <MonthCalendar
                  selectedDates={selectedDates}
                  onToggle={toggleDate}
                  maxDaysAhead={selectedOffice.visitsConfig.bookableDays}
                />
              </div>

              {/* Reservation summary */}
              <div className="bg-white rounded-xl border border-stone-200 p-4">
                <h2 className="font-semibold text-sm text-[#1c1917] mb-3">Reservation summary</h2>
                {pendingBookings.length === 0 && !selectedDeskId && (
                  <p className="text-xs text-stone-400">Select dates and a desk to build your reservation.</p>
                )}
                {selectedDeskId && selectedDates.length > 0 && (
                  <div className="mb-3 p-2 bg-stone-50 rounded border border-stone-100 text-xs text-stone-600">
                    <p><span className="font-medium">Dates:</span> {selectedDates.sort().map(d => new Date(d + 'T12:00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' })).join(', ')}</p>
                    <p><span className="font-medium">Desk:</span> {selectedArea.desks.find(d => d.id === selectedDeskId)?.name}, {selectedArea.name}</p>
                  </div>
                )}
                {pendingBookings.map((b, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 mb-2 p-2 bg-stone-50 rounded border border-stone-100 text-xs text-stone-600">
                    <div>
                      <p><span className="font-medium">Dates:</span> {b.dates.sort().map(d => new Date(d + 'T12:00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' })).join(', ')}</p>
                      <p><span className="font-medium">Desk:</span> {b.deskName}, {b.areaName}</p>
                    </div>
                    <button onClick={() => removePending(idx)} className="text-stone-400 hover:text-stone-700 flex-shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {bookingStatus && (
                  <p className="text-xs text-stone-500 mb-2">{bookingStatus}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={addDeskToCart}
                    disabled={!selectedDeskId || selectedDates.length === 0}
                    className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg text-stone-600 hover:border-stone-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Add another desk
                  </button>
                  <button
                    onClick={submitDeskBookings}
                    disabled={isSubmitting || (pendingBookings.length === 0 && (!selectedDeskId || selectedDates.length === 0))}
                    className="flex-1 px-3 py-2 text-xs bg-[#1c1917] text-white rounded-lg hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSubmitting ? 'Signing...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <h2 className="font-semibold text-sm text-[#1c1917] mb-1">🪑 Workplace</h2>
                <p className="text-xs text-stone-500 mb-4">Select a desk by clicking on the floor map.</p>

                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="text-xs text-stone-500 mb-1 block">Area</label>
                    <div className="relative">
                      <select
                        value={selectedArea.id}
                        onChange={e => {
                          const area = selectedOffice.areas.find(a => a.id === e.target.value)
                          if (area) { setSelectedArea(area); setSelectedDeskId(null) }
                        }}
                        className="w-full appearance-none bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-[#1c1917] pr-8 focus:outline-none focus:border-stone-400"
                      >
                        {selectedOffice.areas.map(area => (
                          <option key={area.id} value={area.id}>{area.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-stone-500 mb-1 block">Desk</label>
                    <div className="relative">
                      <select
                        value={selectedDeskId || ''}
                        onChange={e => setSelectedDeskId(e.target.value || null)}
                        className="w-full appearance-none bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-[#1c1917] pr-8 focus:outline-none focus:border-stone-400"
                      >
                        <option value="">Select a desk</option>
                        {selectedArea.desks
                          .filter(d => d.type === 'flexible' && !bookedDeskIds.has(d.id))
                          .map(desk => (
                            <option key={desk.id} value={desk.id}>{desk.name}</option>
                          ))
                        }
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <FloorMap
                  mapSrc={selectedArea.map}
                  desks={selectedArea.desks}
                  bookedDeskIds={bookedDeskIds}
                  myDeskIds={myDeskIds}
                  selectedDeskId={selectedDeskId}
                  onSelectDesk={selectDesk}
                  bookerLabels={deskBookerLabels}
                />

                <div className="flex gap-4 mt-3 text-xs text-stone-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-stone-400 bg-white rounded-sm inline-block" /> Available</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#1c1917] rounded-sm inline-block" /> Selected</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-stone-700 rounded-sm inline-block" /> Yours</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-stone-300 rounded-sm inline-block" /> Booked — initials shown</span>
                </div>
              </div>
            </div>
          </div>
          </>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <div>
            {selectedOffice.roomsPlaceholderMessage ? (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                <p className="text-stone-500 text-sm">{selectedOffice.roomsPlaceholderMessage}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-stone-600">Date:</label>
                  <input
                    type="date"
                    value={roomDate}
                    min={formatDate(new Date())}
                    onChange={e => setRoomDate(e.target.value)}
                    className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-[#1c1917] focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedOffice.rooms.map(room => {
                    const slots = generateSlots(room.workingHours)
                    const roomSlotBookings = roomBookings.get(room.id) || new Map()

                    return (
                      <div key={room.id} className="bg-white rounded-xl border border-stone-200 p-4">
                        <div className="flex gap-3 mb-3">
                          {room.photo && (
                            <img src={room.photo} alt={room.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-[#1c1917]">{room.name}</h3>
                            <p className="text-xs text-stone-500">{room.description}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.capacity}p</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {room.workingHours[0]}–{room.workingHours[1]}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-stone-400 mb-3">{room.equipment}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {slots.map(slot => {
                            const booker = roomSlotBookings.get(slot)
                            const isMine = booker?.toLowerCase() === evmAddress?.toLowerCase()
                            const isBooked = !!booker
                            return (
                              <button
                                key={slot}
                                disabled={isBooked && !isMine || isSubmitting}
                                onClick={() => !isBooked && bookRoomSlot(
                                  selectedOffice.locationId,
                                  roomDate,
                                  room.id,
                                  slot,
                                  stage => console.log('room booking', stage)
                                ).then(() => {
                                  setMyBookings(prev => [...prev, {
                                    locationId: selectedOffice.locationId,
                                    date: roomDate,
                                    resourceId: getRoomSlotResourceId(room.id, slot),
                                    label: `${selectedOffice.name} — ${room.name} ${slot} — ${roomDate}`
                                  }])
                                  return getBookingsForRooms(selectedOffice.locationId, roomDate, selectedOffice.rooms).then(setRoomBookings)
                                }).catch(console.error)}
                                className={[
                                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                                  isMine
                                    ? 'bg-stone-700 text-white'
                                    : isBooked
                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                    : 'bg-stone-50 border border-stone-200 text-[#1c1917] hover:border-stone-400 hover:bg-stone-100'
                                ].join(' ')}
                              >
                                {slot}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Bookings Tab */}
        {activeTab === 'myBookings' && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="font-semibold text-sm text-[#1c1917] mb-1">My Bookings</h2>
            {myBookings.length === 0 ? (
              <p className="text-sm text-stone-400 mt-3">No active bookings. Book a desk or room to receive your access pass.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {myBookings.map((booking, idx) => (
                  <div key={idx} className="border border-stone-200 rounded-xl p-4 flex flex-col gap-3">
                    {booking.qrCode && (
                      <div className="flex justify-center">
                        <img src={booking.qrCode} alt="Access pass QR code" className="w-32 h-32 rounded" />
                      </div>
                    )}
                    <p className="text-xs text-[#1c1917] font-medium text-center leading-snug">{booking.label}</p>
                    <p className="text-xs text-stone-400 text-center">Scan to verify access</p>
                    <button
                      onClick={() => cancelMyBooking(booking, idx)}
                      disabled={isSubmitting}
                      className="text-xs text-stone-500 hover:text-red-600 border border-stone-200 hover:border-red-200 rounded px-2.5 py-1.5 transition-colors disabled:opacity-40 mt-auto"
                    >
                      Cancel booking
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
