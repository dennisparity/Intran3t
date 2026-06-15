import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Copy,
  Heading, Type, List, Image as ImageIcon, Code, Play, Eye, Share2, Check, Loader2, AlertTriangle
} from 'lucide-react'
import { useWallet } from '../../providers/WalletProvider'
import type { Deck, DeckTheme, BlockType, SlideBlock } from './types'
import {
  loadDraft, saveDraft, upsertDeckEntry, uploadDeck, uploadImage,
  newDeck, newId, newSlide, cacheImage, reorder, cloneBlock, cloneSlide
} from './config'
import { SlideView } from './SlideView'
import { EditableSlide } from './EditableSlide'

const THEME_OPTIONS: DeckTheme[] = ['light', 'dark']

export function SlideEditor() {
  const { localId: routeId } = useParams<{ localId?: string }>()
  const navigate = useNavigate()
  const { selectedAccount, signer } = useWallet()

  const [localId] = useState(() => routeId ?? newId())
  const [deck, setDeck] = useState<Deck>(() =>
    (routeId && loadDraft(routeId)) || newDeck(selectedAccount?.address)
  )
  const [current, setCurrent] = useState(0)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'onchain' | 'local'>('idle')
  const [publishedCid, setPublishedCid] = useState<string | null>(null)
  const [publishedOnChain, setPublishedOnChain] = useState(false)
  const [publishedSigner, setPublishedSigner] = useState<'user' | 'relay-alice' | null>(null)
  const [publishedOwner, setPublishedOwner] = useState<string | null>(null)
  const [editedSincePublish, setEditedSincePublish] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [dragSlide, setDragSlide] = useState<number | null>(null)
  const [overSlide, setOverSlide] = useState<number | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const imageTarget = useRef<string | null>(null)

  // Put a stable URL in the address bar for freshly created decks.
  useEffect(() => {
    if (!routeId) navigate(`/slides/edit/${localId}`, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-persist draft + index entry on every change.
  useEffect(() => {
    saveDraft(localId, deck)
    upsertDeckEntry({ localId, title: deck.title, cid: publishedCid ?? undefined, onChain: publishedOnChain, updatedAt: deck.updatedAt })
  }, [deck, localId, publishedCid, publishedOnChain])

  const slide = deck.slides[current]
  const shareLink = useMemo(
    () => (publishedCid ? `${window.location.origin}${window.location.pathname}#/present/${publishedCid}` : null),
    [publishedCid]
  )

  // ─── Mutators ──────────────────────────────────────────────────────────────

  function patchDeck(patch: Partial<Deck>) {
    setDeck(d => ({ ...d, ...patch, updatedAt: Date.now() }))
    setEditedSincePublish(true)
  }

  function patchSlideBlocks(map: (blocks: SlideBlock[]) => SlideBlock[]) {
    setDeck(d => {
      const slides = d.slides.map((s, i) => i === current ? { ...s, blocks: map(s.blocks) } : s)
      return { ...d, slides, updatedAt: Date.now() }
    })
    setEditedSincePublish(true)
  }

  function addBlock(type: BlockType) {
    const base: SlideBlock = { id: newId(), type }
    if (type === 'heading') { base.level = 2; base.text = 'Heading' }
    if (type === 'text') base.text = 'Text'
    if (type === 'bullets') base.items = ['First point', 'Second point']
    if (type === 'code') { base.text = 'console.log("hello")'; base.lang = '' }
    patchSlideBlocks(blocks => [...blocks, base])
  }

  function updateBlock(id: string, patch: Partial<SlideBlock>) {
    patchSlideBlocks(blocks => blocks.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  function removeBlock(id: string) {
    patchSlideBlocks(blocks => blocks.filter(b => b.id !== id))
  }

  function reorderBlocks(from: number, to: number) {
    patchSlideBlocks(blocks => reorder(blocks, from, to))
  }

  function duplicateBlock(id: string) {
    patchSlideBlocks(blocks => {
      const i = blocks.findIndex(b => b.id === id)
      if (i < 0) return blocks
      return [...blocks.slice(0, i + 1), cloneBlock(blocks[i]), ...blocks.slice(i + 1)]
    })
  }

  function addSlide() {
    setDeck(d => {
      const slides = [...d.slides]
      slides.splice(current + 1, 0, newSlide())
      return { ...d, slides, updatedAt: Date.now() }
    })
    setCurrent(c => c + 1)
    setEditedSincePublish(true)
  }

  function removeSlide(index: number) {
    if (deck.slides.length === 1) return
    setDeck(d => ({ ...d, slides: d.slides.filter((_, i) => i !== index), updatedAt: Date.now() }))
    setCurrent(c => Math.max(0, c >= index ? c - 1 : c))
    setEditedSincePublish(true)
  }

  function reorderSlides(from: number, to: number) {
    if (from === to) return
    setDeck(d => ({ ...d, slides: reorder(d.slides, from, to), updatedAt: Date.now() }))
    setCurrent(to)
    setEditedSincePublish(true)
  }

  function duplicateSlide(index: number) {
    setDeck(d => {
      const slides = [...d.slides]
      slides.splice(index + 1, 0, cloneSlide(d.slides[index]))
      return { ...d, slides, updatedAt: Date.now() }
    })
    setCurrent(index + 1)
    setEditedSincePublish(true)
  }

  // ─── Image upload (triggered from the canvas) ────────────────────────────────

  function pickImage(blockId: string) {
    imageTarget.current = blockId
    fileRef.current?.click()
  }

  async function onFileSelected(file: File) {
    const blockId = imageTarget.current
    if (!blockId) return
    setUploading(u => ({ ...u, [blockId]: true }))
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const cid = await uploadImage(bytes)
      cacheImage(cid, dataUrl)
      updateBlock(blockId, { cid, alt: file.name })
    } catch (e) {
      console.error('Image upload failed:', e)
    } finally {
      setUploading(u => ({ ...u, [blockId]: false }))
      imageTarget.current = null
    }
  }

  // ─── Publish / preview / share ───────────────────────────────────────────────

  async function handlePublish() {
    setPublishState('publishing')
    try {
      const address = selectedAccount?.address
      const publisher = signer && address ? { signer, address } : undefined
      const { cid, onChain, signer: signedBy, owner } = await uploadDeck({ ...deck, author: address ?? deck.author }, publisher)
      setPublishedCid(cid)
      setPublishedOnChain(onChain)
      setPublishedSigner(signedBy)
      setPublishedOwner(owner ?? null)
      setEditedSincePublish(false)
      upsertDeckEntry({ localId, title: deck.title, cid, onChain, owner, updatedAt: Date.now() })
      setPublishState(onChain ? 'onchain' : 'local')
    } catch (e) {
      console.error('Publish failed:', e)
      setPublishState('local')
    }
  }

  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

  function copyLink() {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); e.target.value = '' }} />

      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-[#e7e5e4]">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#1c1917] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <input
          value={deck.title}
          onChange={e => patchDeck({ title: e.target.value })}
          className="flex-1 min-w-0 px-3 py-1.5 text-sm font-medium text-[#1c1917] bg-transparent rounded-lg hover:bg-[#fafaf9] focus:bg-[#fafaf9] focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)] transition-all"
          placeholder="Deck title"
        />
        <select
          value={deck.theme}
          onChange={e => patchDeck({ theme: e.target.value as DeckTheme })}
          className="px-3 py-1.5 text-sm border border-[#e7e5e4] rounded-lg text-[#1c1917] cursor-pointer focus:outline-none focus:ring-4 focus:ring-[rgba(28,25,23,0.08)]"
        >
          {THEME_OPTIONS.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>

        <button
          onClick={() => navigate(`/slides/preview/${localId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[#e7e5e4] text-[#1c1917] rounded-lg hover:bg-[#fafaf9] transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
        {publishedCid && (
          <button
            onClick={() => navigate(`/present/${publishedCid}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[#e7e5e4] text-[#1c1917] rounded-lg hover:bg-[#fafaf9] transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" /> Present
          </button>
        )}
        <button
          onClick={handlePublish}
          disabled={publishState === 'publishing'}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-[#1c1917] text-white rounded-lg hover:bg-[#292524] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishState === 'publishing'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing to Bulletin…</>
            : <><Share2 className="w-4 h-4" />
                {publishedCid ? (editedSincePublish ? 'Publish update' : 'Published') : 'Publish to Bulletin'}</>}
        </button>
      </div>

      {/* Honest publish-status banner */}
      {publishState === 'publishing' && (
        <div className="flex items-center gap-2 px-6 py-2 bg-[#1c1917] text-white text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <span>
            {signer && selectedAccount
              ? <>Authorizing your account, then signing a Bulletin <span className="font-mono">TransactionStorage.store</span> extrinsic as you…</>
              : <>Signing & broadcasting a Bulletin <span className="font-mono">TransactionStorage.store</span> extrinsic via the shared relay account (//Alice)…</>}
          </span>
        </div>
      )}

      {publishedCid && publishState !== 'publishing' && publishedOnChain && (
        <div className="px-6 py-2 bg-[#1c1917] text-white text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-medium text-[#86efac] flex-shrink-0">
              <Check className="w-3.5 h-3.5" /> On-chain · Bulletin (Paseo testnet)
              {publishedSigner === 'user' && publishedOwner && <> · Owned by {shortAddr(publishedOwner)}</>}
            </span>
            <span className="truncate flex-1 font-mono text-[#a8a29e]">{shareLink}</span>
            <button onClick={copyLink} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0">
              {linkCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
          <div className="text-[#a8a29e]">
            {publishedSigner === 'user'
              ? <>Stored and owned by your account ({publishedOwner && shortAddr(publishedOwner)}). Authorized via the testnet sudo relay (interim — users will be authorized by default once live).</>
              : <>Signed by a shared relay account (//Alice) — no wallet connected, so this isn't attributed to you. Open in the Triangle host (or connect a wallet) to publish as yourself.</>}
            {editedSincePublish && ' You’ve edited since publishing — publish again to update the shared link.'}
          </div>
        </div>
      )}

      {publishedCid && publishState !== 'publishing' && !publishedOnChain && (
        <div className="px-6 py-2 bg-[#fffbeb] border-b border-[#fde68a] text-[#92400e] text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-medium flex-shrink-0"><AlertTriangle className="w-3.5 h-3.5" /> Saved to this browser only — not on-chain</span>
            <span className="truncate flex-1 font-mono opacity-70">{shareLink}</span>
            <button onClick={handlePublish} className="flex items-center gap-1 px-2 py-1 rounded border border-[#fcd34d] hover:bg-[#fef3c7] transition-colors cursor-pointer flex-shrink-0">
              Retry
            </button>
          </div>
          <div>Bulletin was unreachable, so the deck wasn't stored on-chain. This link only opens on this device. Retry to publish to Bulletin.</div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Slide rail */}
        <div className="w-48 flex-shrink-0 border-r border-[#e7e5e4] bg-white overflow-y-auto p-3 space-y-2">
          {deck.slides.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => setDragSlide(i)}
              onDragEnd={() => { setDragSlide(null); setOverSlide(null) }}
              onDragOver={e => { if (dragSlide !== null) { e.preventDefault(); setOverSlide(i) } }}
              onDrop={e => {
                e.preventDefault()
                if (dragSlide !== null && dragSlide !== i) reorderSlides(dragSlide, i)
                setDragSlide(null); setOverSlide(null)
              }}
              className="group relative cursor-grab active:cursor-grabbing"
            >
              {dragSlide !== null && overSlide === i && dragSlide !== i && (
                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#1c1917] rounded-full z-10" />
              )}
              <button
                onClick={() => setCurrent(i)}
                className={`block w-full rounded-lg overflow-hidden border-2 transition-all ${
                  i === current ? 'border-[#1c1917]' : 'border-[#e7e5e4] hover:border-[#a8a29e]'
                }`}
              >
                <SlideView slide={s} theme={deck.theme} />
              </button>
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => duplicateSlide(i)} title="Duplicate slide"
                  className="p-1 bg-white/90 rounded text-[#78716c] hover:text-[#1c1917] cursor-pointer">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={() => removeSlide(i)} disabled={deck.slides.length === 1} title="Delete slide"
                  className="p-1 bg-white/90 rounded text-[#78716c] hover:text-[#dc2626] disabled:opacity-30 cursor-pointer">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="absolute bottom-1 left-1 text-[10px] font-medium text-[#a8a29e] bg-white/80 rounded px-1">{i + 1}</div>
            </div>
          ))}
          <button
            onClick={addSlide}
            className="w-full aspect-[16/9] border-2 border-dashed border-[#e7e5e4] rounded-lg flex items-center justify-center text-[#a8a29e] hover:border-[#1c1917] hover:text-[#1c1917] transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Editing canvas */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Add-block toolbar */}
            <div className="flex flex-wrap gap-2">
              {([
                ['heading', Heading, 'Heading'],
                ['text', Type, 'Text'],
                ['bullets', List, 'Bullets'],
                ['image', ImageIcon, 'Image'],
                ['code', Code, 'Code']
              ] as const).map(([type, Icon, label]) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#e7e5e4] text-[#1c1917] rounded-lg hover:bg-[#fafaf9] transition-colors cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* On-canvas editing — click any element to edit in place */}
            <div className="rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              {slide && (
                <EditableSlide
                  slide={slide}
                  theme={deck.theme}
                  uploadingBlocks={uploading}
                  onChangeBlock={updateBlock}
                  onReorderBlocks={reorderBlocks}
                  onDuplicateBlock={duplicateBlock}
                  onRemoveBlock={removeBlock}
                  onPickImage={pickImage}
                />
              )}
            </div>
            <p className="text-center text-xs text-[#a8a29e]">Click any element on the slide to edit it.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
