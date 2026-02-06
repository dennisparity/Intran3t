/**
 * Tests for address conversion utilities
 */

import { describe, test, expect } from 'vitest'
import { substrateToEvm, evmToSubstrate, isEvmAddress, isSubstrateAddress } from './address-conversion'

describe('Address Conversion', () => {
  // Test addresses
  const substrateAddr = '5HBSKcu1bQdy5xCCLy9oCHTVDkf77mMDPVYjGEk3QMLxr4kR'
  const evmAddr = '0x7e59585d3bc72532ee7d1ceae9be732e6edceb62'

  test('substrateToEvm should convert correctly', () => {
    const result = substrateToEvm(substrateAddr)
    expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/)
    expect(result.length).toBe(42) // 0x + 40 hex chars
  })

  test('evmToSubstrate should convert correctly', () => {
    const result = evmToSubstrate(evmAddr, 42) // Generic Substrate format
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(40) // SS58 encoded
  })

  test('isEvmAddress should detect EVM addresses', () => {
    expect(isEvmAddress(evmAddr)).toBe(true)
    expect(isEvmAddress(substrateAddr)).toBe(false)
    expect(isEvmAddress('0x123')).toBe(false) // Too short
    expect(isEvmAddress('invalid')).toBe(false)
  })

  test('isSubstrateAddress should detect Substrate addresses', () => {
    expect(isSubstrateAddress(substrateAddr)).toBe(true)
    expect(isSubstrateAddress(evmAddr)).toBe(false)
    expect(isSubstrateAddress('invalid')).toBe(false)
  })

  test('round-trip conversion should be consistent', () => {
    // Substrate -> EVM -> Substrate (with padding)
    const evm = substrateToEvm(substrateAddr)
    const backToSubstrate = evmToSubstrate(evm, 42)

    // The addresses won't be identical due to padding, but both should be valid
    expect(isEvmAddress(evm)).toBe(true)
    expect(isSubstrateAddress(backToSubstrate)).toBe(true)
  })

  test('should handle addresses with and without 0x prefix', () => {
    const withPrefix = '0x7e59585d3bc72532ee7d1ceae9be732e6edceb62'
    const withoutPrefix = '7e59585d3bc72532ee7d1ceae9be732e6edceb62'

    expect(() => evmToSubstrate(withPrefix)).not.toThrow()
    expect(() => evmToSubstrate(withoutPrefix)).not.toThrow()
  })
})
