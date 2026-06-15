import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import type { Deck } from './types'
import { fetchDeck, loadDraft } from './config'
import { DeckViewer } from './DeckViewer'

function StatusScreen({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1917] text-center p-6">
      <div className={muted ? 'text-[#a8a29e]' : 'text-[#fafaf9]'}>{children}</div>
    </div>
  )
}

/** Public viewer — fetches a published deck from Bulletin by CID (no wallet). */
export function PublicDeck() {
  const { cid } = useParams<{ cid: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cid) return
    let active = true
    fetchDeck(cid)
      .then(d => active && setDeck(d))
      .catch(() => active && setError('This presentation could not be loaded.'))
    return () => { active = false }
  }, [cid])

  if (error) return <StatusScreen><p className="text-lg font-serif mb-2">Presentation unavailable</p><p className="text-sm text-[#a8a29e]">{error}</p></StatusScreen>
  if (!deck) return <StatusScreen muted><Loader2 className="w-6 h-6 animate-spin mx-auto" /></StatusScreen>
  return <DeckViewer deck={deck} onExit={() => navigate('/dashboard')} />
}

/** Preview viewer — presents the local draft without publishing. */
export function PreviewDeck() {
  const { localId } = useParams<{ localId: string }>()
  const navigate = useNavigate()
  const deck = localId ? loadDraft(localId) : null

  if (!deck) return <StatusScreen><p className="text-lg font-serif mb-2">Nothing to preview</p><p className="text-sm text-[#a8a29e]">Save a draft first.</p></StatusScreen>
  return <DeckViewer deck={deck} onExit={() => navigate(`/slides/edit/${localId}`)} />
}
