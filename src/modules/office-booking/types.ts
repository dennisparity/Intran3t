export type OfficeLocation = 'berlin' | 'london' | 'lisbon'

export interface DeskPosition {
  x: number
  y: number
}

export type DeskType = 'flexible' | 'personal' | 'multi' | 'full_area'

export interface Desk {
  id: string
  name: string
  type: DeskType
  areaId: string
  position: DeskPosition
  allowMultipleBookings?: boolean
}

export interface Area {
  id: string
  name: string
  capacity: number
  map: string
  desks: Desk[]
}

export interface Room {
  id: string
  name: string
  description: string
  capacity: number
  workingHours: [string, string]
  equipment: string
  photo?: string
  autoConfirm: boolean
}

export interface OfficeConfig {
  id: OfficeLocation
  locationId: number
  name: string
  icon: string
  timezone: string
  address: string
  areas: Area[]
  rooms: Room[]
  roomsPlaceholderMessage?: string
  visitsConfig: {
    workingDays: number[]
    bookableDays: number
    maxCapacity: number
  }
}

export interface PendingDeskBooking {
  dates: string[]
  areaId: string
  deskId: string
  deskName: string
  areaName: string
}

export interface PendingRoomBooking {
  date: string
  roomId: string
  roomName: string
  slot: string
}
