/**
 * Address Converter Widget
 *
 * Converts between H160 (EVM), SS58 Generic, and SS58 Polkadot address formats
 * Shows on-chain account mapping status via pallet_revive.OriginalAccount
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from 'polkadot-api'
import { getWsProvider } from 'polkadot-api/ws-provider/web'
import { paseo } from '../.papi/descriptors'
import { Binary } from 'polkadot-api'
import { keccak256 } from 'viem'
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto'
import { Copy, Check, ArrowDownUp } from 'lucide-react'

export function AddressConverter() {
  const [inputAddress, setInputAddress] = useState('')
  const [outputAddress, setOutputAddress] = useState('')
  const [fromFormat, setFromFormat] = useState('ss58-generic')
  const [toFormat, setToFormat] = useState('h160')
  const [error, setError] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [copiedField, setCopiedField] = useState('')
  const [chainStatus, setChainStatus] = useState('connecting')
  const clientRef = useRef<any>(null)
  const apiRef = useRef<any>(null)

  const formats = [
    { key: 'h160', label: 'H160', placeholder: '0x742d35Cc6634C0532925a3b844...' },
    { key: 'ss58-generic', label: 'SS58 Generic', placeholder: '5GrwvaEF5zXb26Fz9rcQpDWS57...' },
    { key: 'ss58-polkadot', label: 'SS58 Polkadot', placeholder: '1zugcaDHwA9JTUhWUdBtHoFdh...' }
  ]

  // ── Chain connection ─────────────────────────────────
  useEffect(() => {
    const connect = async () => {
      try {
        const wsProvider = getWsProvider('wss://sys.ibp.network/asset-hub-paseo')
        const client = createClient(wsProvider)
        clientRef.current = client
        apiRef.current = client.getUnsafeApi()
        setChainStatus('connected')
      } catch {
        setChainStatus('error')
      }
    }
    connect()
    return () => {
      if (clientRef.current) {
        clientRef.current.destroy()
        clientRef.current = null
        apiRef.current = null
      }
    }
  }, [])

  // ── Conversion helpers ───────────────────────────────
  const ss58ToH160Address = (ss58Address: string) => {
    const decoded = decodeAddress(ss58Address)
    const hash = keccak256(decoded)
    return ('0x' + hash.slice(-40)) as string
  }

  const toGenericSS58Address = (address: string) => {
    try {
      const decoded = decodeAddress(address)
      return encodeAddress(decoded, 42)
    } catch {
      return null
    }
  }

  const toPolkadotSS58Address = (address: string) => {
    try {
      const decoded = decodeAddress(address)
      return encodeAddress(decoded, 0)
    } catch {
      return null
    }
  }

  const h160ToSS58 = async (h160Address: string, targetFormat: string) => {
    const api = apiRef.current
    if (!api) throw new Error('Chain not connected')

    const originalAccount = await api.query.Revive.OriginalAccount.getValue(
      Binary.fromHex(h160Address)
    )

    if (!originalAccount) {
      throw new Error('No SS58 mapping found on-chain for this H160 address')
    }

    // OriginalAccount returns the SS58 address
    if (targetFormat === 'ss58-polkadot') {
      return originalAccount
    }
    // Convert to generic SS58 (prefix 42)
    const decoded = decodeAddress(originalAccount)
    return encodeAddress(decoded, 42)
  }

  // ── Input validation ───────────────────────────────────
  const isValidH160 = (addr: string) => /^0x[0-9a-fA-F]{40}$/i.test(addr)
  const detectInputFormat = (addr: string) => {
    if (/^0x[0-9a-fA-F]+$/i.test(addr)) return 'h160'
    if (/^[1-9A-HJ-NP-Za-km-z]{20,}$/.test(addr)) return 'ss58'
    return null
  }

  // ── Conversion ─────────────────────────────────────────
  const convertAddress = useCallback(async () => {
    const addr = inputAddress.trim()
    if (!addr) {
      setOutputAddress('')
      setError('')
      return
    }

    if (fromFormat === toFormat) {
      setOutputAddress(addr)
      setError('')
      return
    }

    // Validate input matches selected format
    const detected = detectInputFormat(addr)
    if (fromFormat === 'h160') {
      if (detected === 'ss58') {
        setError('This looks like an SS58 address — select SS58 or Polkadot above')
        setOutputAddress('')
        return
      }
      if (!isValidH160(addr)) {
        setError('Invalid H160 — expected 0x followed by 40 hex characters')
        setOutputAddress('')
        return
      }
    } else {
      if (detected === 'h160') {
        setError('This looks like an H160 address — select H160 above')
        setOutputAddress('')
        return
      }
    }

    setIsConverting(true)
    setError('')

    try {
      let result = null
      if (fromFormat === 'h160') {
        result = await h160ToSS58(addr, toFormat)
      } else if (toFormat === 'h160') {
        result = ss58ToH160Address(addr)
      } else if (toFormat === 'ss58-polkadot') {
        result = toPolkadotSS58Address(addr)
      } else {
        result = toGenericSS58Address(addr)
      }

      if (result) {
        setOutputAddress(result)
      } else {
        throw new Error('Conversion failed')
      }
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
      setOutputAddress('')
    } finally {
      setIsConverting(false)
    }
  }, [inputAddress, fromFormat, toFormat])

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 2000)
  }, [])

  const handleSwapFormats = useCallback(() => {
    setFromFormat(toFormat)
    setToFormat(fromFormat)
    setInputAddress(outputAddress)
    setOutputAddress('')
    setError('')
  }, [fromFormat, toFormat, outputAddress])

  const handleClear = useCallback(() => {
    setInputAddress('')
    setOutputAddress('')
    setError('')
  }, [])

  useEffect(() => {
    if (inputAddress.trim()) {
      const timer = setTimeout(() => convertAddress(), 300)
      return () => clearTimeout(timer)
    } else {
      setOutputAddress('')
      setError('')
    }
  }, [inputAddress, fromFormat, toFormat, convertAddress])

  const currentPlaceholder = formats.find((f) => f.key === fromFormat)?.placeholder || ''

  return (
    <div className='h-full flex flex-col bg-white p-6'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <h2 className='text-lg font-serif text-[#1c1917]'>Address Converter</h2>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              chainStatus === 'connected'
                ? 'bg-[#22c55e]'
                : chainStatus === 'connecting'
                  ? 'bg-[#eab308] animate-pulse'
                  : 'bg-[#ef4444]'
            }`}
            title={
              chainStatus === 'connected'
                ? 'Connected'
                : chainStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'
            }
          />
        </div>
        {inputAddress && (
          <button
            onClick={handleClear}
            className='text-xs text-[#78716c] hover:text-[#1c1917] transition-colors'
          >
            Clear
          </button>
        )}
      </div>

      {/* Converter Card */}
      <div className='flex-1 space-y-4'>
        {/* From Section */}
        <div>
          <label className='block text-xs font-medium text-[#1c1917] mb-2'>From</label>
          <div className='flex gap-2 mb-3'>
            {formats.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFromFormat(f.key)
                  if (f.key === toFormat) {
                    const firstValid = formats.find((fmt) => fmt.key !== f.key)
                    if (firstValid) setToFormat(firstValid.key)
                  }
                  setError('')
                  setOutputAddress('')
                }}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  fromFormat === f.key
                    ? 'bg-[#1c1917] text-white border-[#1c1917]'
                    : 'bg-white text-[#78716c] border-[#e7e5e4] hover:border-[#1c1917] hover:text-[#1c1917]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className='relative'>
            <input
              type='text'
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder={currentPlaceholder}
              className='w-full px-3 py-2 text-sm font-mono border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all duration-200 pr-10'
            />
            {inputAddress && (
              <button
                onClick={() => handleCopy(inputAddress, 'input')}
                className='absolute top-1/2 right-2 -translate-y-1/2 p-1 text-[#78716c] hover:text-[#1c1917] transition-colors'
              >
                {copiedField === 'input' ? (
                  <Check className='w-4 h-4 text-[#22c55e]' />
                ) : (
                  <Copy className='w-4 h-4' />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <div className='flex justify-center'>
          <button
            onClick={handleSwapFormats}
            className='p-2 text-[#78716c] hover:text-[#1c1917] hover:bg-white rounded-lg border border-[#e7e5e4] transition-all duration-200'
            title='Swap formats'
          >
            <ArrowDownUp className='w-4 h-4' />
          </button>
        </div>

        {/* To Section */}
        <div>
          <label className='block text-xs font-medium text-[#1c1917] mb-2'>To</label>
          <div className='flex gap-2 mb-3'>
            {formats.map((f) => (
              <button
                key={f.key}
                disabled={f.key === fromFormat}
                onClick={() => {
                  setToFormat(f.key)
                  setError('')
                  setOutputAddress('')
                }}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  f.key === fromFormat
                    ? 'cursor-not-allowed bg-[#fafaf9] text-[#d6d3d1] border-[#e7e5e4]'
                    : toFormat === f.key
                      ? 'bg-[#1c1917] text-white border-[#1c1917]'
                      : 'bg-white text-[#78716c] border-[#e7e5e4] hover:border-[#1c1917] hover:text-[#1c1917]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className='relative'>
            <input
              type='text'
              value={isConverting ? '' : outputAddress}
              readOnly
              placeholder={isConverting ? 'Converting...' : 'Converted address'}
              className={`w-full px-3 py-2 text-sm font-mono border rounded-lg transition-all duration-200 pr-10 ${
                outputAddress && !isConverting
                  ? 'bg-[#fafaf9] border-[#e7e5e4] text-[#1c1917]'
                  : 'bg-white border-[#e7e5e4] text-[#a8a29e]'
              } ${isConverting ? 'animate-pulse' : ''}`}
            />
            {outputAddress && !isConverting && (
              <button
                onClick={() => handleCopy(outputAddress, 'output')}
                className='absolute top-1/2 right-2 -translate-y-1/2 p-1 text-[#78716c] hover:text-[#1c1917] transition-colors'
              >
                {copiedField === 'output' ? (
                  <Check className='w-4 h-4 text-[#22c55e]' />
                ) : (
                  <Copy className='w-4 h-4' />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className='p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-sm text-[#991b1b]'>
          {error}
        </div>
      )}

      {/* Status Message */}
      {fromFormat === 'h160' && toFormat !== 'h160' && !isConverting && outputAddress && !error && (
        <div className='text-center'>
          <p className='text-xs text-[#22c55e] font-medium'>✓ Account mapped on-chain</p>
        </div>
      )}
    </div>
  )
}
