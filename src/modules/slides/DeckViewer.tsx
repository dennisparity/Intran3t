import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Deck } from './types'
import { SlideView, themeColors } from './SlideView'

/** Fullscreen presentation stage with keyboard + click navigation. */
export function DeckViewer({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const total = deck.slides.length

  const next = useCallback(() => setIndex(i => Math.min(i + 1, total - 1)), [total])
  const prev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev() }
      else if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onExit])

  const c = themeColors(deck.theme)
  const slide = deck.slides[index]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: c.bg }}>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[1280px] shadow-[0_8px_40px_rgba(0,0,0,0.25)] rounded-xl overflow-hidden">
          {slide && <SlideView slide={slide} theme={deck.theme} />}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 pb-6" style={{ color: c.muted }}>
        <button onClick={prev} disabled={index === 0} aria-label="Previous slide"
          className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm tabular-nums">{index + 1} / {total}</span>
        <button onClick={next} disabled={index >= total - 1} aria-label="Next slide"
          className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <button onClick={onExit} aria-label="Exit presentation"
        className="fixed top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" style={{ color: c.muted }}>
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
