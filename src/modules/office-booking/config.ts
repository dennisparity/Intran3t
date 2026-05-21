import type { OfficeConfig } from './types'

export const OFFICE_CONTRACT_ADDRESS = (import.meta.env.VITE_OFFICE_CONTRACT_ADDRESS || '').trim()

export const OFFICE_ABI = [
  {
    name: 'book',
    type: 'function',
    inputs: [
      { name: 'locationId', type: 'uint8' },
      { name: 'date', type: 'string' },
      { name: 'resourceId', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'bookBatch',
    type: 'function',
    inputs: [
      { name: 'locationId', type: 'uint8' },
      { name: 'dates', type: 'string[]' },
      { name: 'resourceId', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'cancelBooking',
    type: 'function',
    inputs: [
      { name: 'locationId', type: 'uint8' },
      { name: 'date', type: 'string' },
      { name: 'resourceId', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getBooker',
    type: 'function',
    inputs: [
      { name: 'locationId', type: 'uint8' },
      { name: 'date', type: 'string' },
      { name: 'resourceId', type: 'string' }
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  }
] as const

export const OFFICES: OfficeConfig[] = [
  {
    id: 'berlin',
    locationId: 0,
    name: 'Berlin',
    icon: '🇩🇪',
    timezone: 'Europe/Berlin',
    address: 'Glogauer Str. 6, 10999 Berlin',
    visitsConfig: { workingDays: [1, 2, 3, 4, 5], bookableDays: 30, maxCapacity: 35 },
    areas: [
      {
        id: 'parity_hq_5l',
        name: '5th floor left',
        capacity: 18,
        map: '/maps/berlin-5l.png',
        desks: [
          { id: 'g', name: 'G', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 59.3, y: 34.1 } },
          { id: 'h', name: 'H', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 59.3, y: 41.6 } },
          { id: 'i', name: 'I', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 59.3, y: 49.0 } },
          { id: 'j', name: 'J', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 59.3, y: 56.5 } },
          { id: 'k', name: 'K', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 59.3, y: 63.8 } },
          { id: 'p1', name: 'P1', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 80.8, y: 35.7 } },
          { id: 'p2', name: 'P2', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 85.7, y: 35.7 } },
          { id: 'p3', name: 'P3', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 90.7, y: 35.7 } },
          { id: 'p4', name: 'P4', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 80.8, y: 43.5 } },
          { id: 'p5', name: 'P5', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 85.7, y: 43.5 } },
          { id: 'p6', name: 'P6', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 90.7, y: 43.5 } },
          { id: 'a', name: 'A', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 80.8, y: 55.7 } },
          { id: 'b', name: 'B', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 85.7, y: 55.7 } },
          { id: 'c', name: 'C', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 90.7, y: 55.7 } },
          { id: 'd', name: 'D', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 80.8, y: 63.8 } },
          { id: 'e', name: 'E', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 85.7, y: 63.8 } },
          { id: 'f', name: 'F', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 90.7, y: 63.8 } },
          { id: 'l', name: 'L', type: 'flexible', areaId: 'parity_hq_5l', position: { x: 90.7, y: 71.5 } }
        ]
      },
      {
        id: 'parity_hq_5r',
        name: '5th floor right',
        capacity: 9,
        map: '/maps/berlin-5r.png',
        desks: [
          { id: 'a', name: 'A', type: 'personal', areaId: 'parity_hq_5r', position: { x: 39, y: 15.5 } },
          { id: 'finance_desk', name: 'Finance', type: 'personal', areaId: 'parity_hq_5r', position: { x: 52, y: 15.5 } },
          { id: 'b', name: 'B', type: 'flexible', areaId: 'parity_hq_5r', position: { x: 64, y: 15.5 } },
          { id: 'c', name: 'C', type: 'flexible', areaId: 'parity_hq_5r', position: { x: 42, y: 24 } },
          { id: 'd', name: 'D', type: 'flexible', areaId: 'parity_hq_5r', position: { x: 51.5, y: 24 } },
          { id: 'e', name: 'E', type: 'flexible', areaId: 'parity_hq_5r', position: { x: 64, y: 24 } },
          { id: 'f', name: 'F', type: 'personal', areaId: 'parity_hq_5r', position: { x: 32.5, y: 45 } },
          { id: 'g', name: 'G', type: 'personal', areaId: 'parity_hq_5r', position: { x: 42.5, y: 45 } },
          { id: 'h', name: 'H', type: 'personal', areaId: 'parity_hq_5r', position: { x: 53, y: 45 } }
        ]
      }
    ],
    rooms: [
      { id: 'berlin_kollwitz', name: 'Kollwitz', description: '5th floor left', capacity: 6, workingHours: ['08:00', '19:00'], equipment: 'Whiteboard, stationary, TV with HDMI cable, charging station on table.', photo: '/meeting-rooms/berlin/kollowitz.jpg', autoConfirm: true },
      { id: 'berlin_humboldt', name: 'Humboldt', description: '5th floor left', capacity: 6, workingHours: ['08:00', '19:00'], equipment: 'Whiteboard, stationary, adjustable height table, charging station extension cable.', photo: '/meeting-rooms/berlin/humboldt.jpg', autoConfirm: true },
      { id: 'berlin_einstein', name: 'Einstein', description: '5th floor right', capacity: 4, workingHours: ['08:00', '19:00'], equipment: 'Whiteboard, stationary, charging station on table.', photo: '/meeting-rooms/berlin/einstein.jpg', autoConfirm: true }
    ]
  },
  {
    id: 'london',
    locationId: 1,
    name: 'London',
    icon: '🇬🇧',
    timezone: 'Europe/London',
    address: 'WeWork, London',
    visitsConfig: { workingDays: [1, 2, 3, 4, 5], bookableDays: 30, maxCapacity: 27 },
    areas: [
      {
        id: 'private_office',
        name: 'Private Office',
        capacity: 27,
        map: '/maps/london-1-1.png',
        desks: [
          { id: '1', name: '1', type: 'flexible', areaId: 'private_office', position: { x: 15.25, y: 30.75 } },
          { id: '2', name: '2', type: 'flexible', areaId: 'private_office', position: { x: 24.5, y: 30.75 } },
          { id: '3', name: '3', type: 'flexible', areaId: 'private_office', position: { x: 33.75, y: 30.75 } },
          { id: '4', name: '4', type: 'flexible', areaId: 'private_office', position: { x: 43.25, y: 30.75 } },
          { id: '5', name: '5', type: 'flexible', areaId: 'private_office', position: { x: 15.25, y: 36.5 } },
          { id: '6', name: '6', type: 'flexible', areaId: 'private_office', position: { x: 24.5, y: 36.5 } },
          { id: '7', name: '7', type: 'flexible', areaId: 'private_office', position: { x: 33.75, y: 36.5 } },
          { id: '8', name: '8', type: 'flexible', areaId: 'private_office', position: { x: 43.25, y: 36.5 } },
          { id: '9', name: '9', type: 'flexible', areaId: 'private_office', position: { x: 62.125, y: 34 } },
          { id: '10', name: '10', type: 'flexible', areaId: 'private_office', position: { x: 58.25, y: 44 } },
          { id: '11', name: '11', type: 'flexible', areaId: 'private_office', position: { x: 58.25, y: 55.5 } },
          { id: '12', name: '12', type: 'flexible', areaId: 'private_office', position: { x: 58.25, y: 67 } },
          { id: '13', name: '13', type: 'flexible', areaId: 'private_office', position: { x: 66, y: 44 } },
          { id: '14', name: '14', type: 'flexible', areaId: 'private_office', position: { x: 66, y: 55.5 } },
          { id: '15', name: '15', type: 'flexible', areaId: 'private_office', position: { x: 66, y: 67 } },
          { id: '16', name: '16', type: 'flexible', areaId: 'private_office', position: { x: 80.5, y: 68.5 } },
          { id: '17', name: '17', type: 'flexible', areaId: 'private_office', position: { x: 80.5, y: 79.5 } },
          { id: '18', name: 'Sec 2', type: 'flexible', areaId: 'private_office', position: { x: 88.25, y: 68.5 } },
          { id: '19', name: 'Sec 1', type: 'flexible', areaId: 'private_office', position: { x: 88.25, y: 79.5 } },
          { id: 'finance_desk_1', name: 'Fin 1', type: 'flexible', areaId: 'private_office', position: { x: 15.25, y: 63 } },
          { id: 'finance_desk_2', name: 'Fin 2', type: 'flexible', areaId: 'private_office', position: { x: 24.5, y: 63 } },
          { id: 'finance_desk_3', name: 'Fin 3', type: 'flexible', areaId: 'private_office', position: { x: 34.25, y: 63 } },
          { id: 'finance_desk_4', name: 'Fin 4', type: 'flexible', areaId: 'private_office', position: { x: 15.25, y: 69 } },
          { id: 'finance_desk_5', name: 'Fin 5', type: 'flexible', areaId: 'private_office', position: { x: 24.5, y: 69 } },
          { id: 'finance_desk_6', name: 'Fin 6', type: 'flexible', areaId: 'private_office', position: { x: 43.5, y: 69 } },
          { id: 'legal_desk_1', name: 'Lgl 1', type: 'flexible', areaId: 'private_office', position: { x: 34.25, y: 69 } },
          { id: 'legal_desk_2', name: 'Lgl 2', type: 'flexible', areaId: 'private_office', position: { x: 43.5, y: 63 } }
        ]
      }
    ],
    rooms: [],
    roomsPlaceholderMessage: 'Meeting rooms in London are managed via WeWork. Please use the WeWork app to book meeting rooms.'
  },
  {
    id: 'lisbon',
    locationId: 2,
    name: 'Lisbon',
    icon: '🇵🇹',
    timezone: 'Europe/Lisbon',
    address: 'Rua Serpa Pinto, 12B 1200-445 Lisboa',
    visitsConfig: { workingDays: [1, 2, 3, 4, 5], bookableDays: 30, maxCapacity: 16 },
    areas: [
      {
        id: 'parity_lisbon_1',
        name: 'Work desks',
        capacity: 10,
        map: '/maps/lisbon-1.png',
        desks: [
          { id: 'a', name: 'A', type: 'personal', areaId: 'parity_lisbon_1', position: { x: 22, y: 85 } },
          { id: 'b', name: 'B', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 28, y: 85 } },
          { id: 'c', name: 'C', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 36, y: 85 } },
          { id: 'd', name: 'D', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 42, y: 85 } },
          { id: 'e', name: 'E', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 75, y: 58 } },
          { id: 'f', name: 'F', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 82, y: 58 } },
          { id: 'g', name: 'G', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 90, y: 58 } },
          { id: 'h', name: 'H', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 75, y: 70 } },
          { id: 'i', name: 'I', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 82, y: 70 } },
          { id: 'k', name: 'K', type: 'flexible', areaId: 'parity_lisbon_1', position: { x: 90, y: 70 } }
        ]
      }
    ],
    rooms: [
      { id: 'lisbon_room_camoes', name: 'Camões', description: '', capacity: 4, workingHours: ['08:00', '19:00'], equipment: 'Post its, pens, pencils, markers.', photo: '/meeting-rooms/lisbon/camoes.jpg', autoConfirm: true },
      { id: 'lisbon_room_pessoa', name: 'Pessoa', description: '', capacity: 12, workingHours: ['08:00', '19:00'], equipment: 'TV screen and whiteboard, post its, pens, pencils, markers.', photo: '/meeting-rooms/lisbon/pessoa.jpg', autoConfirm: true },
      { id: 'lisbon_room_amalia', name: 'Amélia', description: '', capacity: 16, workingHours: ['08:00', '19:00'], equipment: 'TV screen and whiteboard, post its, pens, pencils, markers.', photo: '/meeting-rooms/lisbon/amalia.jpg', autoConfirm: true }
    ]
  }
]

export const defaultOfficeBookingConfig = {
  defaultOffice: 'berlin' as const
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function isWorkingDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

export function generateSlots(workingHours: [string, string], intervalMinutes = 30): string[] {
  const slots: string[] = []
  const [startH, startM] = workingHours[0].split(':').map(Number)
  const [endH, endM] = workingHours[1].split(':').map(Number)
  let current = startH * 60 + startM
  const end = endH * 60 + endM
  while (current < end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0')
    const m = (current % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    current += intervalMinutes
  }
  return slots
}

export function getDeskResourceId(areaId: string, deskId: string): string {
  return `desk:${areaId}:${deskId}`
}

export function getRoomSlotResourceId(roomId: string, slot: string): string {
  return `room:${roomId}:${slot}`
}
