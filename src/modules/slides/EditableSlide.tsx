import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Trash2, Copy, GripVertical, AArrowDown, AArrowUp, Minus, Plus,
  Image as ImageIcon, Loader2
} from 'lucide-react'
import type { DeckTheme, Slide, SlideBlock } from './types'
import { themeColors, headingSize, scaledSize, SIZE } from './SlideView'
import { BulletinImage } from './BulletinImage'

const SCALE_MIN = 0.4, SCALE_MAX = 3, SCALE_STEP = 0.1
const WIDTH_MIN = 20, WIDTH_MAX = 100, WIDTH_STEP = 10
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * contentEditable text that stays in sync with state without losing the caret.
 * The DOM is written from `value` only when the element is not focused.
 */
function EditableText({ value, onChange, style, className, onEnter, onBackspaceEmpty }: {
  value: string
  onChange: (v: string) => void
  style?: CSSProperties
  className?: string
  onEnter?: () => void
  onBackspaceEmpty?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.textContent !== value) {
      el.textContent = value
    }
  }, [value])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={e => onChange((e.target as HTMLElement).textContent ?? '')}
      onKeyDown={e => {
        if (onEnter && e.key === 'Enter') { e.preventDefault(); onEnter() }
        if (onBackspaceEmpty && e.key === 'Backspace' && (e.target as HTMLElement).textContent === '') {
          e.preventDefault(); onBackspaceEmpty()
        }
      }}
      className={`cursor-text whitespace-pre-wrap ${className ?? ''}`}
      style={{ outline: 'none', ...style }}
    />
  )
}

function EditableBlock({ block, c, onChange, uploading, onImage }: {
  block: SlideBlock
  c: ReturnType<typeof themeColors>
  onChange: (patch: Partial<SlideBlock>) => void
  uploading: boolean
  onImage: () => void
}) {
  switch (block.type) {
    case 'heading':
      return (
        <EditableText
          value={block.text ?? ''}
          onChange={text => onChange({ text })}
          className="font-serif"
          style={{ fontSize: scaledSize(headingSize(block.level), block.scale), lineHeight: 1.15, fontWeight: 600, color: c.heading }}
        />
      )
    case 'text':
      return (
        <EditableText
          value={block.text ?? ''}
          onChange={text => onChange({ text })}
          style={{ fontSize: scaledSize(SIZE.text, block.scale), lineHeight: 1.4, color: c.fg }}
        />
      )
    case 'bullets': {
      const items = block.items ?? []
      return (
        <ul style={{ fontSize: scaledSize(SIZE.bullets, block.scale), lineHeight: 1.5, color: c.fg }} className="list-disc pl-[5cqw] space-y-[1cqw]">
          {items.map((item, i) => (
            <li key={i}>
              <EditableText
                value={item}
                onChange={v => onChange({ items: items.map((it, j) => j === i ? v : it) })}
                onEnter={() => onChange({ items: [...items.slice(0, i + 1), '', ...items.slice(i + 1)] })}
                onBackspaceEmpty={() => items.length > 1 && onChange({ items: items.filter((_, j) => j !== i) })}
              />
            </li>
          ))}
        </ul>
      )
    }
    case 'code':
      return (
        <pre
          style={{ fontSize: scaledSize(SIZE.code, block.scale), lineHeight: 1.45, color: c.fg, background: c.codeBg }}
          className="rounded-[1.5cqw] p-[2.5cqw] font-mono"
        >
          <EditableText value={block.text ?? ''} onChange={text => onChange({ text })} />
        </pre>
      )
    case 'image':
      return block.cid ? (
        <div className="mx-auto" style={{ width: `${block.width ?? 100}%` }}>
          <button onClick={onImage} className="block w-full cursor-pointer" title="Click to replace image">
            <BulletinImage cid={block.cid} alt={block.alt} className="w-full max-h-[55cqh] object-contain rounded-[1.5cqw]" />
          </button>
        </div>
      ) : (
        <button
          onClick={onImage}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-[1.5cqw] py-[6cqh] rounded-[1.5cqw] cursor-pointer"
          style={{ border: `0.4cqw dashed ${c.muted}`, color: c.muted, fontSize: SIZE.text }}
        >
          {uploading
            ? <><Loader2 className="w-[4cqw] h-[4cqw] animate-spin" /> Uploading…</>
            : <><ImageIcon className="w-[4cqw] h-[4cqw]" /> Click to upload image</>}
        </button>
      )
    default:
      return null
  }
}

const tbBtn = 'p-1 text-[#78716c] hover:text-[#1c1917] disabled:opacity-30 cursor-pointer'

/**
 * The editable slide canvas — visually identical to SlideView (same theme,
 * same cqw type scale) but every element is edited in place, Google-Slides style.
 * Blocks can be drag-reordered, resized, duplicated, and deleted.
 */
export function EditableSlide({
  slide, theme, uploadingBlocks,
  onChangeBlock, onReorderBlocks, onDuplicateBlock, onRemoveBlock, onPickImage
}: {
  slide: Slide
  theme: DeckTheme
  uploadingBlocks: Record<string, boolean>
  onChangeBlock: (id: string, patch: Partial<SlideBlock>) => void
  onReorderBlocks: (from: number, to: number) => void
  onDuplicateBlock: (id: string) => void
  onRemoveBlock: (id: string) => void
  onPickImage: (id: string) => void
}) {
  const c = themeColors(theme)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  function resize(block: SlideBlock, dir: 1 | -1) {
    if (block.type === 'image') {
      onChangeBlock(block.id, { width: clamp((block.width ?? 100) + dir * WIDTH_STEP, WIDTH_MIN, WIDTH_MAX) })
    } else {
      onChangeBlock(block.id, { scale: clamp(Number(((block.scale ?? 1) + dir * SCALE_STEP).toFixed(2)), SCALE_MIN, SCALE_MAX) })
    }
  }

  return (
    <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: c.bg, containerType: 'size' }}>
      <div className="w-full h-full flex flex-col justify-center gap-[2.5cqh] px-[7cqw] py-[6cqh]">
        {slide.blocks.length === 0 ? (
          <p style={{ fontSize: SIZE.text, color: c.muted }} className="text-center">
            Add a block from the toolbar above
          </p>
        ) : (
          slide.blocks.map((block, i) => (
            <div
              key={block.id}
              className="group/block relative"
              onDragOver={e => { if (dragIndex !== null) { e.preventDefault(); setOverIndex(i) } }}
              onDrop={e => {
                e.preventDefault()
                if (dragIndex !== null && dragIndex !== i) onReorderBlocks(dragIndex, i)
                setDragIndex(null); setOverIndex(null)
              }}
            >
              {/* Drop indicator */}
              {dragIndex !== null && overIndex === i && dragIndex !== i && (
                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#1c1917] rounded-full" />
              )}

              <EditableBlock
                block={block}
                c={c}
                uploading={!!uploadingBlocks[block.id]}
                onChange={patch => onChangeBlock(block.id, patch)}
                onImage={() => onPickImage(block.id)}
              />

              {/* Per-block toolbar (px-sized, independent of the cqw canvas scale) */}
              <div className="absolute -top-2 -right-2 flex items-center gap-0.5 rounded-lg bg-white border border-[#e7e5e4] shadow-sm p-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <button
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                  title="Drag to reorder"
                  className={`${tbBtn} cursor-grab active:cursor-grabbing`}
                ><GripVertical className="w-3.5 h-3.5" /></button>
                <button onClick={() => resize(block, -1)} title="Smaller" className={tbBtn}>
                  {block.type === 'image' ? <Minus className="w-3.5 h-3.5" /> : <AArrowDown className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => resize(block, 1)} title="Larger" className={tbBtn}>
                  {block.type === 'image' ? <Plus className="w-3.5 h-3.5" /> : <AArrowUp className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => onDuplicateBlock(block.id)} title="Duplicate" className={tbBtn}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onRemoveBlock(block.id)} title="Delete"
                  className="p-1 text-[#78716c] hover:text-[#dc2626] cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
