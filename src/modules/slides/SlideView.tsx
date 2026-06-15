import type { CSSProperties } from 'react'
import type { DeckTheme, Slide, SlideBlock } from './types'
import { BulletinImage } from './BulletinImage'
import PolkadotLogo from '../../components/PolkadotLogo'

interface ThemeColors {
  bg: string
  fg: string
  muted: string
  heading: string
  codeBg: string
}

const THEMES: Record<DeckTheme, ThemeColors> = {
  light: { bg: '#ffffff', fg: '#1c1917', muted: '#78716c', heading: '#1c1917', codeBg: '#f5f5f4' },
  dark: { bg: '#1c1917', fg: '#fafaf9', muted: '#a8a29e', heading: '#fafaf9', codeBg: '#292524' },
  polkadot: { bg: '#1a0a1a', fg: '#f5e9f1', muted: '#c9a6bd', heading: '#E6007A', codeBg: '#2a1424' }
}

export function themeColors(theme: DeckTheme): ThemeColors {
  return THEMES[theme] ?? THEMES.light
}

/** Container-query font sizes shared by the renderer and the editable canvas. */
export const SIZE = { h1: '7cqw', h2: '5cqw', h3: '4cqw', text: '3.2cqw', bullets: '3cqw', code: '2.4cqw' }

export function headingSize(level?: number): string {
  return level === 1 ? SIZE.h1 : level === 3 ? SIZE.h3 : SIZE.h2
}

/** Apply a per-block size multiplier to a container-query base size. */
export function scaledSize(base: string, scale?: number): string {
  return scale && scale !== 1 ? `calc(${base} * ${scale})` : base
}

function Block({ block, c }: { block: SlideBlock; c: ThemeColors }) {
  switch (block.type) {
    case 'heading': {
      const size = scaledSize(headingSize(block.level), block.scale)
      return (
        <h2 style={{ fontSize: size, lineHeight: 1.15, fontWeight: 600, color: c.heading }} className="font-serif">
          {block.text}
        </h2>
      )
    }
    case 'text':
      return <p style={{ fontSize: scaledSize(SIZE.text, block.scale), lineHeight: 1.4, color: c.fg }}>{block.text}</p>
    case 'bullets':
      return (
        <ul style={{ fontSize: scaledSize(SIZE.bullets, block.scale), lineHeight: 1.5, color: c.fg }} className="list-disc pl-[5cqw] space-y-[1cqw]">
          {(block.items ?? []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )
    case 'code':
      return (
        <pre
          style={{ fontSize: scaledSize(SIZE.code, block.scale), lineHeight: 1.45, color: c.fg, background: c.codeBg }}
          className="rounded-[1.5cqw] p-[2.5cqw] overflow-hidden font-mono whitespace-pre-wrap"
        >
          <code>{block.text}</code>
        </pre>
      )
    case 'image':
      return block.cid
        ? (
          <div className="mx-auto" style={{ width: `${block.width ?? 100}%` }}>
            <BulletinImage cid={block.cid} alt={block.alt} className="w-full max-h-[55cqh] object-contain rounded-[1.5cqw]" />
          </div>
        )
        : null
    default:
      return null
  }
}

/**
 * Pure renderer for a single slide on a 16:9 canvas.
 * Font sizes use container-query units (cqw/cqh) so the same component scales
 * perfectly for full-screen presenting, the editor canvas, and tiny thumbnails.
 */
export function SlideView({ slide, theme, className, style }: {
  slide: Slide
  theme: DeckTheme
  className?: string
  style?: CSSProperties
}) {
  const c = themeColors(theme)
  return (
    <div
      className={`aspect-[16/9] w-full overflow-hidden relative ${className ?? ''}`}
      style={{ background: c.bg, containerType: 'size', ...style }}
    >
      <div style={{ position: 'absolute', top: '3cqh', left: '4cqw', width: '4.5cqw', height: '4.5cqw', color: c.muted, opacity: 0.6 }}>
        <PolkadotLogo className="w-full h-full" />
      </div>
      <div className="w-full h-full flex flex-col justify-center gap-[2.5cqh] px-[7cqw] py-[6cqh]">
        {slide.blocks.length === 0 ? (
          <p style={{ fontSize: '3cqw', color: c.muted }} className="text-center">Empty slide</p>
        ) : (
          slide.blocks.map(block => <Block key={block.id} block={block} c={c} />)
        )}
      </div>
    </div>
  )
}
