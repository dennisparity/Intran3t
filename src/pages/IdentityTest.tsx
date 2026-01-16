import { useState } from 'react'
import { useTypink } from 'typink'
import { Button } from '../components/ui/Button'
import {
  queryRegistrars,
  calculateDeposits,
  buildIdentityInfo,
  encodeIdentityField,
  type IdentityFormData
} from '../modules/profile/identity-transaction-helpers'
import { getPeopleChainApi } from '../modules/profile/identity-helpers'

export default function IdentityTest() {
  const { connectedAccount } = useTypink()
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    console.log(message)
  }

  const clearLogs = () => {
    setLogs([])
  }

  // Test 1: People Chain Connection
  const testConnection = async () => {
    setIsLoading(true)
    addLog('🔄 Testing People Chain connection...')
    try {
      const api = await getPeopleChainApi()
      addLog('✅ Connected to People Chain successfully')
      addLog(`📊 Chain: ${(await api.rpc.system.chain()).toString()}`)
      addLog(`🔢 Block height: ${(await api.query.system.number()).toString()}`)
    } catch (error) {
      addLog(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setIsLoading(false)
  }

  // Test 2: Query Registrars
  const testRegistrars = async () => {
    setIsLoading(true)
    addLog('🔄 Querying registrars from People Chain...')
    try {
      const registrars = await queryRegistrars()
      addLog(`✅ Found ${registrars.length} registrars`)

      registrars.forEach((reg, idx) => {
        addLog(`  Registrar ${idx}:`)
        addLog(`    - Index: ${reg.index}`)
        addLog(`    - Account: ${reg.account.slice(0, 10)}...${reg.account.slice(-8)}`)
        addLog(`    - Fee: ${reg.fee.toString()} (${Number(reg.fee) / 1e10} DOT)`)
        addLog(`    - Fields: ${reg.fields}`)
      })
    } catch (error) {
      addLog(`❌ Registrar query failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setIsLoading(false)
  }

  // Test 3: Deposit Calculation
  const testDeposits = async () => {
    setIsLoading(true)
    addLog('🔄 Testing deposit calculation...')
    try {
      const api = await getPeopleChainApi()
      const testRegistrarFee = BigInt(100000000000) // 10 DOT example fee

      // Test with 3 fields
      const deposits3 = await calculateDeposits(api, 3, testRegistrarFee)
      addLog('✅ Deposit calculation (3 fields):')
      addLog(`  - Basic deposit: ${deposits3.basic.toString()} (${Number(deposits3.basic) / 1e10} DOT)`)
      addLog(`  - Field deposit: ${deposits3.field.toString()} (${Number(deposits3.field) / 1e10} DOT per field)`)
      addLog(`  - Registrar fee: ${deposits3.registrar.toString()} (${Number(deposits3.registrar) / 1e10} DOT)`)
      addLog(`  - Total: ${deposits3.total.toString()} (${Number(deposits3.total) / 1e10} DOT)`)

      // Test with 8 fields
      const deposits8 = await calculateDeposits(api, 8, testRegistrarFee)
      addLog('✅ Deposit calculation (8 fields):')
      addLog(`  - Total: ${deposits8.total.toString()} (${Number(deposits8.total) / 1e10} DOT)`)

    } catch (error) {
      addLog(`❌ Deposit calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setIsLoading(false)
  }

  // Test 4: Identity Encoding
  const testEncoding = () => {
    addLog('🔄 Testing identity field encoding...')

    try {
      // Test with value
      const encoded1 = encodeIdentityField('Alice Smith')
      addLog('✅ Encoded "Alice Smith":')
      addLog(`  - Type: ${encoded1.Raw ? 'Raw' : 'None'}`)
      if (encoded1.Raw) {
        addLog(`  - Bytes: ${new Uint8Array(encoded1.Raw).length} bytes`)
        addLog(`  - Decoded: ${new TextDecoder().decode(encoded1.Raw)}`)
      }

      // Test with empty value
      const encoded2 = encodeIdentityField('')
      addLog('✅ Encoded empty string:')
      addLog(`  - Type: ${encoded2.None !== undefined ? 'None' : 'Raw'}`)

      // Test with undefined
      const encoded3 = encodeIdentityField(undefined)
      addLog('✅ Encoded undefined:')
      addLog(`  - Type: ${encoded3.None !== undefined ? 'None' : 'Raw'}`)

    } catch (error) {
      addLog(`❌ Encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Test 5: Build Identity Info
  const testBuildIdentityInfo = () => {
    addLog('🔄 Testing buildIdentityInfo...')

    try {
      const formData: IdentityFormData = {
        display: 'Test User',
        legal: 'Test Legal Name',
        email: 'test@example.com',
        web: 'https://example.com',
        twitter: '@testuser',
        matrix: '@test:matrix.org',
        github: 'testuser',
        discord: 'testuser#1234'
      }

      const identityInfo = buildIdentityInfo(formData)
      addLog('✅ Built identity info:')
      addLog(`  - Display: ${identityInfo.display.Raw ? 'Set' : 'None'}`)
      addLog(`  - Legal: ${identityInfo.legal.Raw ? 'Set' : 'None'}`)
      addLog(`  - Email: ${identityInfo.email.Raw ? 'Set' : 'None'}`)
      addLog(`  - Web: ${identityInfo.web.Raw ? 'Set' : 'None'}`)
      addLog(`  - Twitter: ${identityInfo.twitter.Raw ? 'Set' : 'None'}`)
      addLog(`  - Riot (Matrix): ${identityInfo.riot.Raw ? 'Set' : 'None'}`)
      addLog(`  - Image: ${identityInfo.image.None !== undefined ? 'None' : 'Set'}`)
      addLog(`  - Additional fields: ${identityInfo.additional.length}`)

      identityInfo.additional.forEach((field: any, idx: number) => {
        const keyDecoded = new TextDecoder().decode(field[0].Raw)
        const valueDecoded = new TextDecoder().decode(field[1].Raw)
        addLog(`    ${idx + 1}. ${keyDecoded}: ${valueDecoded}`)
      })

    } catch (error) {
      addLog(`❌ buildIdentityInfo failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Test 6: Full Integration Test
  const runFullTest = async () => {
    clearLogs()
    addLog('🚀 Starting full integration test...')
    addLog('')

    await testConnection()
    addLog('')

    await testRegistrars()
    addLog('')

    await testDeposits()
    addLog('')

    testEncoding()
    addLog('')

    testBuildIdentityInfo()
    addLog('')

    addLog('✅ All tests completed!')
  }

  return (
    <div className="min-h-screen p-6 bg-[#fafaf9]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#1c1917] mb-2 font-serif">
            Identity Infrastructure Test
          </h1>
          <p className="text-[#78716c]">
            Test Phase 1: Transaction helpers and People Chain integration
          </p>
        </div>

        {/* Wallet Status */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-[#1c1917] mb-2">Wallet Status</h2>
          {connectedAccount ? (
            <div>
              <p className="text-sm text-[#57534e]">
                Connected: <span className="font-mono text-accent">{connectedAccount.address.slice(0, 10)}...{connectedAccount.address.slice(-8)}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#a8a29e]">No wallet connected</p>
          )}
        </div>

        {/* Test Buttons */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1c1917] mb-4">Test Functions</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              onClick={testConnection}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              1. Test Connection
            </Button>

            <Button
              onClick={testRegistrars}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              2. Query Registrars
            </Button>

            <Button
              onClick={testDeposits}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              3. Calculate Deposits
            </Button>

            <Button
              onClick={testEncoding}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              4. Test Encoding
            </Button>

            <Button
              onClick={testBuildIdentityInfo}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              5. Build Identity Info
            </Button>

            <Button
              onClick={clearLogs}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              Clear Logs
            </Button>
          </div>

          <Button
            onClick={runFullTest}
            disabled={isLoading}
            variant="gradient"
            className="w-full"
          >
            {isLoading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>

        {/* Logs */}
        <div className="bg-[#1c1917] border border-[#292524] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Console Logs</h2>
            <span className="text-xs text-[#a8a29e]">{logs.length} entries</span>
          </div>

          <div className="bg-black rounded-lg p-3 h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-[#78716c]">No logs yet. Run a test to see output.</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="text-[#d6d3d1] mb-1 whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Click "Run All Tests" to verify Phase 1 infrastructure</li>
            <li>Each test validates a different piece of functionality</li>
            <li>Check console logs for detailed output</li>
            <li>All tests should pass before proceeding to Phase 2</li>
            <li>Connection test verifies People Chain RPC access</li>
            <li>Registrar test checks if we can query validators</li>
            <li>Deposit test confirms cost calculation works</li>
            <li>Encoding tests verify data transformation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
