/**
 * Address Conversion Utilities for Polkadot Asset Hub
 *
 * Converts between Substrate (32-byte AccountId32) and EVM (20-byte H160) addresses
 * according to Polkadot Asset Hub specifications.
 *
 * References:
 * - https://docs.polkadot.com/polkadot-protocol/smart-contract-basics/accounts/
 * - https://doc.cess.network/developer/advanced-guides/substrate-evm
 */

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto'
import { u8aToHex, hexToU8a } from '@polkadot/util'

/**
 * Convert Substrate address to EVM address using Truncated Mapping method
 *
 * This is the simple, deterministic method where the EVM address is the first 20 bytes
 * of the Substrate public key.
 *
 * @param substrateAddress - The Substrate address (SS58 format)
 * @returns EVM address (0x-prefixed hex string)
 *
 * @example
 * ```ts
 * const evmAddr = substrateToEvm('5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR')
 * console.log(evmAddr) // '0x...' (20 bytes)
 * ```
 */
export function substrateToEvm(substrateAddress: string): string {
  try {
    // Decode Substrate address to get the 32-byte public key
    const publicKey = decodeAddress(substrateAddress)

    // Take first 20 bytes for EVM address (H160)
    const evmBytes = publicKey.slice(0, 20)

    // Convert to hex string with 0x prefix
    return u8aToHex(evmBytes)
  } catch (error) {
    console.error('Failed to convert Substrate to EVM address:', error)
    throw new Error(`Invalid Substrate address: ${substrateAddress}`)
  }
}

/**
 * Convert EVM address to Substrate address using padding method
 *
 * This pads the 20-byte EVM address with 12 bytes of 0xEE to create a 32-byte address,
 * as documented in Polkadot Asset Hub's pallet_revive.
 *
 * @param evmAddress - The EVM address (0x-prefixed hex string)
 * @param ss58Format - SS58 format prefix (0 for Polkadot, 2 for Kusama, 42 for generic)
 * @returns Substrate address (SS58 format)
 *
 * @example
 * ```ts
 * const substrateAddr = evmToSubstrate('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 0)
 * console.log(substrateAddr) // '1...' (Polkadot format)
 * ```
 */
export function evmToSubstrate(evmAddress: string, ss58Format: number = 42): string {
  try {
    // Remove 0x prefix if present
    const cleanAddress = evmAddress.startsWith('0x')
      ? evmAddress.slice(2)
      : evmAddress

    if (cleanAddress.length !== 40) {
      throw new Error('Invalid EVM address length')
    }

    // Convert to bytes
    const evmBytes = hexToU8a('0x' + cleanAddress)

    // Pad with 12 bytes of 0xEE to make 32 bytes (as per pallet_revive spec)
    const padding = new Uint8Array(12).fill(0xEE)
    const accountId32 = new Uint8Array(32)
    accountId32.set(evmBytes, 0)
    accountId32.set(padding, 20)

    // Encode as SS58 address
    return encodeAddress(accountId32, ss58Format)
  } catch (error) {
    console.error('Failed to convert EVM to Substrate address:', error)
    throw new Error(`Invalid EVM address: ${evmAddress}`)
  }
}

/**
 * Check if an address is in EVM format (0x + 40 hex chars)
 *
 * @param address - The address to check
 * @returns True if EVM format, false otherwise
 */
export function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

/**
 * Check if an address is in Substrate format (SS58)
 *
 * @param address - The address to check
 * @returns True if Substrate format, false otherwise
 */
export function isSubstrateAddress(address: string): boolean {
  try {
    decodeAddress(address)
    return true
  } catch {
    return false
  }
}

/**
 * Normalize address to lowercase for comparison
 *
 * @param address - EVM or Substrate address
 * @returns Normalized address
 */
export function normalizeAddress(address: string): string {
  if (isEvmAddress(address)) {
    return address.toLowerCase()
  }
  return address
}

/**
 * Compare two addresses for equality
 *
 * @param addr1 - First address
 * @param addr2 - Second address
 * @returns True if addresses are equal
 */
export function addressesEqual(addr1: string, addr2: string): boolean {
  return normalizeAddress(addr1) === normalizeAddress(addr2)
}
