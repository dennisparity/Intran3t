import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { encodeFunctionData } from 'viem'
import { getProvider } from '@/lib/contracts/provider'
import { useSubstrateEVMSigner } from './useSubstrateEVMSigner'
import {
  OFFICE_CONTRACT_ADDRESS,
  OFFICE_ABI,
  getDeskResourceId,
  getRoomSlotResourceId
} from '../modules/office-booking/config'
import type { Desk, Room } from '../modules/office-booking/types'

function getContract() {
  return new ethers.Contract(OFFICE_CONTRACT_ADDRESS, OFFICE_ABI as any, getProvider())
}

export function useBookingReads() {
  const [isLoading, setIsLoading] = useState(false)

  const getBookingsForArea = useCallback(async (
    locationId: number,
    dates: string[],
    desks: Desk[]
  ): Promise<Map<string, Map<string, string>>> => {
    // Returns: deskId -> date -> bookerAddress
    if (!OFFICE_CONTRACT_ADDRESS || dates.length === 0 || desks.length === 0) {
      return new Map()
    }
    setIsLoading(true)
    try {
      const contract = getContract()
      const result = new Map<string, Map<string, string>>()
      const calls = desks.flatMap(desk =>
        dates.map(date => ({
          deskId: desk.id,
          date,
          resourceId: getDeskResourceId(desk.areaId, desk.id),
          promise: contract.getBooker(locationId, date, getDeskResourceId(desk.areaId, desk.id))
        }))
      )
      const responses = await Promise.all(calls.map(c => c.promise.catch(() => ethers.ZeroAddress)))
      responses.forEach((booker, i) => {
        const { deskId, date } = calls[i]
        if (booker && booker !== ethers.ZeroAddress) {
          if (!result.has(deskId)) result.set(deskId, new Map())
          result.get(deskId)!.set(date, booker as string)
        }
      })
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getBookingsForRooms = useCallback(async (
    locationId: number,
    date: string,
    rooms: Room[]
  ): Promise<Map<string, Map<string, string>>> => {
    // Returns: roomId -> slot -> bookerAddress
    if (!OFFICE_CONTRACT_ADDRESS || !date) return new Map()
    setIsLoading(true)
    try {
      const contract = getContract()
      const result = new Map<string, Map<string, string>>()
      const calls: { roomId: string; slot: string; promise: Promise<string> }[] = []
      for (const room of rooms) {
        const [startH, startM] = room.workingHours[0].split(':').map(Number)
        const [endH, endM] = room.workingHours[1].split(':').map(Number)
        let cur = startH * 60 + startM
        while (cur < endH * 60 + endM) {
          const h = Math.floor(cur / 60).toString().padStart(2, '0')
          const m = (cur % 60).toString().padStart(2, '0')
          const slot = `${h}:${m}`
          calls.push({
            roomId: room.id,
            slot,
            promise: contract.getBooker(locationId, date, getRoomSlotResourceId(room.id, slot))
          })
          cur += 30
        }
      }
      const responses = await Promise.all(calls.map(c => c.promise.catch(() => ethers.ZeroAddress)))
      responses.forEach((booker, i) => {
        const { roomId, slot } = calls[i]
        if (booker && booker !== ethers.ZeroAddress) {
          if (!result.has(roomId)) result.set(roomId, new Map())
          result.get(roomId)!.set(slot, booker as string)
        }
      })
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { getBookingsForArea, getBookingsForRooms, isLoading }
}

export function useBookingWrites() {
  const substrateEVM = useSubstrateEVMSigner()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bookDesk = useCallback(async (
    locationId: number,
    dates: string[],
    areaId: string,
    deskId: string,
    onProgress?: (stage: 'broadcasted' | 'in_block') => void
  ) => {
    if (!OFFICE_CONTRACT_ADDRESS) throw new Error('Office contract not configured')
    setIsLoading(true)
    setError(null)
    try {
      const resourceId = getDeskResourceId(areaId, deskId)
      const calldata = encodeFunctionData({
        abi: OFFICE_ABI,
        functionName: 'bookBatch',
        args: [locationId, dates, resourceId]
      })
      await substrateEVM.sendTransaction({
        to: OFFICE_CONTRACT_ADDRESS,
        data: calldata,
        value: 0n,
        onProgress
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Booking failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [substrateEVM])

  const bookRoomSlot = useCallback(async (
    locationId: number,
    date: string,
    roomId: string,
    slot: string,
    onProgress?: (stage: 'broadcasted' | 'in_block') => void
  ) => {
    if (!OFFICE_CONTRACT_ADDRESS) throw new Error('Office contract not configured')
    setIsLoading(true)
    setError(null)
    try {
      const resourceId = getRoomSlotResourceId(roomId, slot)
      const calldata = encodeFunctionData({
        abi: OFFICE_ABI,
        functionName: 'book',
        args: [locationId, date, resourceId]
      })
      await substrateEVM.sendTransaction({
        to: OFFICE_CONTRACT_ADDRESS,
        data: calldata,
        value: 0n,
        onProgress
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Booking failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [substrateEVM])

  const cancelBooking = useCallback(async (
    locationId: number,
    date: string,
    resourceId: string,
    onProgress?: (stage: 'broadcasted' | 'in_block') => void
  ) => {
    if (!OFFICE_CONTRACT_ADDRESS) throw new Error('Office contract not configured')
    setIsLoading(true)
    setError(null)
    try {
      const calldata = encodeFunctionData({
        abi: OFFICE_ABI,
        functionName: 'cancelBooking',
        args: [locationId, date, resourceId]
      })
      await substrateEVM.sendTransaction({
        to: OFFICE_CONTRACT_ADDRESS,
        data: calldata,
        value: 0n,
        onProgress
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cancel failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [substrateEVM])

  return {
    bookDesk,
    bookRoomSlot,
    cancelBooking,
    isLoading: isLoading || substrateEVM.isLoading,
    error
  }
}
