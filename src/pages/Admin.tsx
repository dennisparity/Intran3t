import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Plus, ExternalLink } from 'lucide-react'
import { useTypink } from 'typink'
import { loadForms } from '../modules/forms/config'
import { loadEncryptedResponses } from '../modules/forms/config'
import type { Form } from '../modules/forms/types'
import { useFormsContract } from '../hooks/useFormsContract'

export default function Admin() {
  const { connectedAccount } = useTypink()
  const { getResponseCount } = useFormsContract()
  const navigate = useNavigate()
  const [myForms, setMyForms] = useState<Form[]>([])
  const [onChainCounts, setOnChainCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const all = loadForms()
    const filtered = connectedAccount
      ? all.filter(f => f.creator === connectedAccount.address)
      : []
    // Deduplicate by id (keep first occurrence)
    const seen = new Set<string>()
    setMyForms(filtered.filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true }))
  }, [connectedAccount?.address])

  // Fetch on-chain response counts for each form
  useEffect(() => {
    if (myForms.length === 0) return
    const numericForms = myForms.filter(f => !isNaN(Number(f.id)))
    if (numericForms.length === 0) return
    Promise.allSettled(
      numericForms.map(async f => {
        const count = await getResponseCount(Number(f.id))
        return { id: f.id, count: Number(count) }
      })
    ).then(results => {
      const counts: Record<string, number> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') counts[r.value.id] = r.value.count
      }
      setOnChainCounts(counts)
    })
  }, [myForms])

  if (!connectedAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
        <div className="max-w-md w-full text-center">
          <h2 className="text-3xl font-bold text-[#1c1917] mb-4 font-serif">
            Connect Wallet
          </h2>
          <p className="text-[#78716c] mb-8">
            Connect your wallet to access the forms admin panel
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Header */}
      <header className="border-b border-[#e7e5e4] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-[#f5f5f4] rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#78716c]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1c1917] font-serif">Forms Admin</h1>
              <p className="text-sm text-[#78716c]">{myForms.length} form{myForms.length !== 1 ? 's' : ''} created by you</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Form
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {myForms.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-[#a8a29e] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1c1917] font-serif mb-2">No forms yet</h2>
            <p className="text-[#78716c] mb-6">Create your first form from the dashboard</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-[#1c1917] text-white rounded-xl hover:bg-[#292524] transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myForms.map(form => {
              const encryptedCount = loadEncryptedResponses(form.id).length
              const plainCount = form.responses.length
              const localTotal = encryptedCount + plainCount
              const onChain = onChainCounts[form.id]

              return (
                <div
                  key={form.id}
                  className="bg-white border border-[#e7e5e4] rounded-2xl p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-[#1c1917]">{form.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          form.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {form.status}
                        </span>
                      </div>
                      {form.description && (
                        <p className="text-sm text-[#78716c] mb-3 line-clamp-2">{form.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-[#78716c]">
                        <span>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        {onChain !== undefined ? (
                          <span className="text-[#1c1917] font-medium">{onChain} response{onChain !== 1 ? 's' : ''} on-chain</span>
                        ) : (
                          <span>{localTotal} response{localTotal !== 1 ? 's' : ''}</span>
                        )}
                        {encryptedCount > 0 && onChain === undefined && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">🔒 {encryptedCount} encrypted</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <a
                      href={`#/admin/forms/${form.onChainId || form.id}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm border border-[#e7e5e4] text-[#78716c] rounded-lg hover:bg-[#fafaf9] hover:text-[#1c1917] transition-colors ml-4"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Results
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
