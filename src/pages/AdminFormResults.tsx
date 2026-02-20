import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Unlock, Download, AlertCircle, BarChart2, Copy, CheckCircle, RefreshCw, ExternalLink, FileText, Database } from 'lucide-react'
import { useTypink } from 'typink'
import { loadForms } from '../modules/forms/config'
import { loadEncryptedResponses } from '../modules/forms/config'
import type { Form, EncryptedResponse } from '../modules/forms/types'
import { getFormKey } from '../lib/form-keys'
import { decryptDocument, fromHex } from '../lib/forms-encryption'
import { useFormsContract } from '../hooks/useFormsContract'
import { fetchFromBulletin } from '../lib/bulletin-storage'

interface DecryptedResponse {
  id: string
  submittedAt: number
  answers: Record<string, string | string[]>
  cid?: string
  rawJson?: string
}

export default function AdminFormResults() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const { connectedAccount } = useTypink()
  const { getResponseCount, getResponseCids } = useFormsContract()

  const [form, setForm] = useState<Form | null>(null)
  const [encryptedResponses, setEncryptedResponses] = useState<EncryptedResponse[]>([])
  const [decryptedResponses, setDecryptedResponses] = useState<DecryptedResponse[]>([])
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState('')
  const [isDecrypted, setIsDecrypted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [onChainLoading, setOnChainLoading] = useState(false)
  const [onChainError, setOnChainError] = useState('')
  const [onChainCount, setOnChainCount] = useState<number | null>(null)

  useEffect(() => {
    if (!formId) return
    const all = loadForms()
    const found = all.find(f => f.id === formId)
    setForm(found || null)
    setEncryptedResponses(loadEncryptedResponses(formId))
  }, [formId])

  const fetchOnChainResponses = useCallback(async () => {
    if (!formId || !form) return

    // Check if form has on-chain ID
    if (!form.onChainId) {
      setOnChainError('This form was not registered on-chain.')
      return
    }

    const formKey = getFormKey(formId)
    if (!formKey) {
      setOnChainError('Encryption key not on this device. Use the device where the form was created.')
      return
    }

    setOnChainLoading(true)
    setOnChainError('')
    try {
      const onChainFormId = Number(form.onChainId)
      const count = Number(await getResponseCount(onChainFormId))
      console.log('[dForms] on-chain response count:', count, 'for onChainId:', form.onChainId)
      setOnChainCount(count)
      if (count === 0) return

      // Get all CIDs at once
      const cids = await getResponseCids(onChainFormId)
      console.log('[dForms] response CIDs:', cids)

      const decrypted: DecryptedResponse[] = []
      for (let i = 0; i < cids.length; i++) {
        try {
          const cid = cids[i].replace(/\0/g, '').trim()
          console.log(`[dForms] response[${i}] CID:`, cid || '(empty)')
          if (!cid) continue
          const manifest = await fetchFromBulletin(cid)
          console.log(`[dForms] response[${i}] manifest fetched`)
          const plaintext = await decryptDocument(fromHex(manifest.ciphertext), formKey, fromHex(manifest.nonce))
          const data = JSON.parse(plaintext)
          decrypted.push({
            id: `onchain-${i}`,
            submittedAt: manifest.submittedAt || data.submittedAt || Date.now(),
            answers: data.answers || {},
            cid: cid,
            rawJson: JSON.stringify({ ...data, cid, manifest }, null, 2)
          })
        } catch (err) {
          console.warn(`[dForms] Failed to load on-chain response ${i}:`, err)
          setOnChainError(prev => prev || `Response ${i} failed: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      if (decrypted.length > 0) {
        setDecryptedResponses(prev => {
          const merged = [...prev]
          for (const r of decrypted) {
            const isDup = prev.some(p => JSON.stringify(p.answers) === JSON.stringify(r.answers))
            if (!isDup) merged.push(r)
          }
          return merged
        })
        setIsDecrypted(true)
      }
    } catch (err) {
      console.error('[dForms] fetchOnChainResponses error:', err)
      setOnChainError(err instanceof Error ? err.message : 'Failed to load on-chain responses')
    } finally {
      setOnChainLoading(false)
    }
  }, [formId, form])

  // Auto-fetch on-chain responses when form is loaded
  useEffect(() => {
    if (form && formId) {
      fetchOnChainResponses()
    }
  }, [form, formId, fetchOnChainResponses])

  const handleDecrypt = async () => {
    if (!formId) return
    setIsDecrypting(true)
    setDecryptError('')

    try {
      const formKey = getFormKey(formId)
      if (!formKey) {
        setDecryptError('Encryption key not found. You must be on the device where the form was created.')
        return
      }

      const decrypted: DecryptedResponse[] = []
      for (const enc of encryptedResponses) {
        try {
          const ciphertext = fromHex(enc.ciphertext)
          const nonce = fromHex(enc.nonce)
          const plaintext = await decryptDocument(ciphertext, formKey, nonce)
          const data = JSON.parse(plaintext)
          decrypted.push({
            id: enc.id,
            submittedAt: enc.submittedAt,
            answers: data.answers || {}
          })
        } catch {
          // Skip corrupted responses
          console.warn('Failed to decrypt response', enc.id)
        }
      }

      setDecryptedResponses(decrypted)
      setIsDecrypted(true)
    } finally {
      setIsDecrypting(false)
    }
  }

  const handleExportCSV = () => {
    if (!form || decryptedResponses.length === 0) return

    const headers = form.fields.map(f => f.label)
    const rows = decryptedResponses.map(r =>
      form.fields.map(f => {
        const v = r.answers[f.id]
        if (!v) return ''
        return Array.isArray(v) ? v.join('; ') : v
      })
    )

    const csv = [
      ['Submitted At', ...headers].join(','),
      ...rows.map((row, i) => [
        new Date(decryptedResponses[i].submittedAt).toISOString(),
        ...row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.title.replace(/\s+/g, '-')}-responses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyFormLink = async () => {
    if (!form || !formId) return
    const { getFormKey: gfk } = await import('../lib/form-keys')
    const { createFormLink } = await import('../lib/form-links')
    const key = gfk(formId)
    if (!key) return
    const link = createFormLink(form, key).url
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!connectedAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#78716c] mx-auto mb-4" />
          <p className="text-[#78716c]">Connect your wallet to view results</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#dc2626] mx-auto mb-4" />
          <p className="text-[#1c1917] font-medium">Form not found</p>
          <button onClick={() => navigate('/admin')} className="mt-4 text-sm text-[#78716c] hover:text-[#1c1917]">
            Back to admin
          </button>
        </div>
      </div>
    )
  }

  const totalResponses = encryptedResponses.length + form.responses.length

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Header */}
      <header className="border-b border-[#e7e5e4] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-[#f5f5f4] rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#78716c]" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#1c1917] font-serif">{form.title}</h1>
              <p className="text-sm text-[#78716c]">
                {totalResponses} response{totalResponses !== 1 ? 's' : ''} •{' '}
                <span className={form.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                  {form.status}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFormLink}
              className="flex items-center gap-2 px-3 py-1.5 text-xs border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] transition-colors"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Share Link'}
            </button>
            {isDecrypted && decryptedResponses.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#1c1917] text-white rounded-lg hover:bg-[#292524] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Form Metadata */}
        {form.bulletinCid && (
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Database className="w-6 h-6 text-[#1c1917] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#1c1917] mb-2 font-serif">Form Definition</h2>
                <p className="text-sm text-[#57534e] mb-3">
                  This form is stored on Polkadot's Bulletin chain as a decentralized, immutable record.
                </p>
                <div className="bg-[#fafaf9] rounded-lg p-3 border border-[#e7e5e4]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[#78716c] mb-1">Form CID (Bulletin Chain)</div>
                      <div className="font-mono text-xs text-[#1c1917] truncate">{form.bulletinCid}</div>
                    </div>
                    <a
                      href={`https://ipfs.dotspark.app/ipfs/${form.bulletinCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1917] text-white rounded-lg hover:bg-[#292524] transition-colors text-xs font-medium whitespace-nowrap"
                    >
                      View on DotSpark
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {form.onChainId && (
                    <div className="mt-3 pt-3 border-t border-[#e7e5e4]">
                      <div className="text-xs text-[#78716c]">On-chain Form ID: <span className="font-mono font-semibold text-[#1c1917]">#{form.onChainId}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Decrypt panel */}
        <div className="bg-white border border-[#e7e5e4] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-[#1c1917]" />
            <h2 className="text-2xl font-bold text-[#1c1917] font-serif">Individual Responses</h2>
          </div>

          {!isDecrypted && encryptedResponses.length > 0 && (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-[#a8a29e] mx-auto mb-4" />
              <p className="text-[#78716c] text-sm mb-4">
                Responses are encrypted. Decrypt using the form key stored on this device.
              </p>
              <button
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                {isDecrypting ? 'Decrypting...' : `Decrypt ${encryptedResponses.length} Response${encryptedResponses.length !== 1 ? 's' : ''}`}
              </button>
              {decryptError && (
                <p className="mt-3 text-sm text-red-600">{decryptError}</p>
              )}
            </div>
          )}

          {encryptedResponses.length === 0 && form.responses.length === 0 && !isDecrypted && (
            <div className="text-center py-8 text-[#a8a29e] text-sm">
              {onChainLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading responses from Polkadot...
                </div>
              ) : onChainCount === 0 ? (
                'No responses yet'
              ) : onChainCount !== null ? (
                <span className="text-orange-500">Found {onChainCount} response{onChainCount !== 1 ? 's' : ''} on-chain but failed to load — check console</span>
              ) : (
                'No responses yet'
              )}
            </div>
          )}

          {isDecrypted && (
            <div className="space-y-6">
              {/* Charts for Select Fields - MOVED ABOVE TABLE */}
              {form.fields.filter(f => f.type === 'select' || f.type === 'multiselect').length > 0 && (
                <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart2 className="w-6 h-6 text-[#1c1917]" />
                    <h3 className="text-lg font-bold text-[#1c1917] font-serif">Response Distribution</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    {form.fields
                      .filter(f => f.type === 'select' || f.type === 'multiselect')
                      .map(field => {
                        // Calculate counts from actual decrypted responses
                        const counts: Record<string, number> = {}
                        decryptedResponses.forEach(response => {
                          const answer = response.answers[field.id]
                          if (answer) {
                            const values = Array.isArray(answer) ? answer : [answer]
                            values.forEach(v => {
                              counts[v] = (counts[v] || 0) + 1
                            })
                          }
                        })
                        const total = Object.values(counts).reduce((a, b) => a + b, 0)
                        const maxCount = Math.max(...Object.values(counts), 0)
                        return (
                          <div key={field.id} className="border border-[#e7e5e4] rounded-xl p-5 bg-[#fafaf9]">
                            <h4 className="text-base font-semibold text-[#1c1917] mb-1 font-serif">{field.label}</h4>
                            <p className="text-sm text-[#78716c] mb-4">{total} response{total !== 1 ? 's' : ''}</p>
                            <div className="space-y-3">
                              {field.options?.map(option => {
                                const count = counts[option] || 0
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                                const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0
                                return (
                                  <div key={option}>
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                      <span className="text-[#1c1917] font-medium">{option}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[#78716c] font-mono text-xs">{count}</span>
                                        <span className="text-[#a8a29e] text-xs">({pct}%)</span>
                                      </div>
                                    </div>
                                    <div className="h-3 bg-white rounded-full overflow-hidden border border-[#e7e5e4]">
                                      <div
                                        className="h-full bg-gradient-to-r from-[#1c1917] to-[#44403c] rounded-full transition-all duration-500"
                                        style={{ width: `${barWidth}%` }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Responses Table */}
              <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#e7e5e4] bg-[#fafaf9]">
                  <h3 className="text-lg font-bold text-[#1c1917] font-serif">All Responses</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f5f5f4] border-b border-[#e7e5e4]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#57534e] uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#57534e] uppercase tracking-wider">Submitted</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#57534e] uppercase tracking-wider">CID</th>
                        {form.fields.map(field => (
                          <th key={field.id} className="px-6 py-3 text-left text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e7e5e4]">
                      {decryptedResponses.map((response, idx) => (
                        <tr key={response.id} className="hover:bg-[#fafaf9] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-6 h-6 rounded-full bg-[#1c1917] text-white flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-[#1c1917]">
                              {new Date(response.submittedAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-[#78716c]">
                              {new Date(response.submittedAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {response.cid ? (
                              <a
                                href={`https://ipfs.dotspark.app/ipfs/${response.cid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-[#1c1917] hover:text-[#ff2867] underline decoration-dotted max-w-xs block truncate"
                                title={response.cid}
                              >
                                {response.cid}
                              </a>
                            ) : (
                              <span className="text-xs text-[#a8a29e]">Local only</span>
                            )}
                          </td>
                          {form.fields.map(field => {
                            const answer = response.answers[field.id]
                            const display = answer
                              ? Array.isArray(answer) ? answer.join(', ') : answer
                              : null
                            return (
                              <td key={field.id} className="px-6 py-4">
                                <div className="text-sm text-[#1c1917] max-w-xs truncate">
                                  {display || <em className="text-[#a8a29e]">—</em>}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* On-chain status */}
          <div className="mt-6 pt-6 border-t border-[#e7e5e4]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[#1c1917]">
                Polkadot storage
                {onChainCount !== null && (
                  <span className="ml-2 text-xs font-normal text-[#78716c]">{onChainCount} response{onChainCount !== 1 ? 's' : ''} on-chain</span>
                )}
              </h3>
              <button
                onClick={fetchOnChainResponses}
                disabled={onChainLoading}
                className="flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${onChainLoading ? 'animate-spin' : ''}`} />
                {onChainLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {onChainError && <p className="text-xs text-[#78716c]">{onChainError}</p>}
            {onChainLoading && (
              <p className="text-xs text-[#78716c]">Loading responses from Polkadot...</p>
            )}
          </div>
        </div>

        {/* Unencrypted responses (legacy) */}
        {form.responses.length > 0 && (
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[#1c1917] mb-4">
              Legacy Responses (unencrypted)
            </h2>
            <div className="space-y-3">
              {form.responses.map((response, idx) => (
                <div key={response.id} className="border border-[#e7e5e4] rounded-xl p-4">
                  <div className="text-xs text-[#a8a29e] mb-3">
                    Response #{idx + 1} — {new Date(response.submittedAt).toLocaleString()}
                  </div>
                  <div className="space-y-2">
                    {form.fields.map(field => {
                      const answer = response.answers[field.id]
                      const display = answer
                        ? Array.isArray(answer) ? answer.join(', ') : answer
                        : null
                      return (
                        <div key={field.id} className="text-sm">
                          <span className="font-medium text-[#1c1917]">{field.label}: </span>
                          <span className="text-[#78716c]">
                            {display || <em className="text-[#a8a29e]">No answer</em>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
