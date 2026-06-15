import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Presentation, Plus, Play, Pencil, Trash2, Copy, Check } from 'lucide-react'
import type { DeckIndexEntry, SlidesConfig } from './types'
import { defaultSlidesConfig, loadDecks, deleteDeckEntry, SLIDES_INDEX_KEY } from './config'

export function SlidesWidget({ config = defaultSlidesConfig }: { config?: SlidesConfig }) {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<DeckIndexEntry[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setDecks(loadDecks())
    refresh()
    const onStorage = (e: StorageEvent) => { if (e.key === SLIDES_INDEX_KEY) refresh() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  function handleDelete(localId: string) {
    deleteDeckEntry(localId)
    setDecks(loadDecks())
  }

  function copyLink(cid: string) {
    const link = `${window.location.origin}${window.location.pathname}#/present/${cid}`
    navigator.clipboard.writeText(link)
    setCopied(cid)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] font-serif">{config.title || 'Sl1des'}</h2>
          <p className="text-xs text-[#78716c] mt-0.5">{config.description || 'Build and share presentations on Polkadot'}</p>
        </div>
        <Presentation className="w-5 h-5 text-[#78716c]" />
      </div>

      <button
        onClick={() => navigate('/slides/new')}
        className="flex items-center justify-center gap-1.5 px-3 py-2 mb-3 text-xs font-medium bg-[#1c1917] text-white rounded-lg hover:bg-[#292524] transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> New deck
      </button>

      {/* Deck list */}
      <div className="flex-1 overflow-y-auto">
        {decks.length === 0 ? (
          <div className="text-center py-8 text-[#a8a29e] text-xs border border-dashed border-[#e7e5e4] rounded-lg">
            No presentations yet. Create your first deck.
          </div>
        ) : (
          <div className="space-y-2">
            {decks.map(deck => (
              <div key={deck.localId} className="flex items-center justify-between p-2.5 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[#1c1917] truncate">{deck.title || 'Untitled deck'}</div>
                  <div className="text-xs text-[#78716c] mt-0.5">
                    {deck.cid ? (deck.onChain ? 'On-chain' : 'Local only') : 'Draft'} · {new Date(deck.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {deck.cid && (
                    <>
                      <button onClick={() => navigate(`/present/${deck.cid}`)} title="Present"
                        className="p-1.5 text-[#78716c] hover:text-[#1c1917] transition-colors cursor-pointer">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => copyLink(deck.cid!)} title="Copy link"
                        className="p-1.5 text-[#78716c] hover:text-[#1c1917] transition-colors cursor-pointer">
                        {copied === deck.cid ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                  <button onClick={() => navigate(`/slides/edit/${deck.localId}`)} title="Edit"
                    className="p-1.5 text-[#78716c] hover:text-[#1c1917] transition-colors cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(deck.localId)} title="Delete"
                    className="p-1.5 text-[#78716c] hover:text-[#dc2626] transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
