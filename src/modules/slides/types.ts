export type BlockType = 'heading' | 'text' | 'bullets' | 'image' | 'code'

export interface SlideBlock {
  id: string
  type: BlockType
  text?: string          // heading / text / code
  level?: 1 | 2 | 3      // heading
  items?: string[]       // bullets
  lang?: string          // code
  cid?: string           // image — Bulletin CID
  alt?: string           // image alt text
  scale?: number         // text size multiplier (heading/text/bullets/code), default 1
  width?: number         // image width as % of slide, default 100
}

export interface Slide {
  id: string
  blocks: SlideBlock[]
}

export type DeckTheme = 'light' | 'dark' | 'polkadot'

export interface Deck {
  version: '1'
  title: string
  author?: string        // creator address (display only in MVP)
  theme: DeckTheme
  slides: Slide[]
  createdAt: number
  updatedAt: number
}

/** Local index entry stored in localStorage (key: intran3t_slides). */
export interface DeckIndexEntry {
  localId: string
  title: string
  cid?: string           // set once published to Bulletin
  onChain?: boolean      // true if the publish actually landed on Bulletin (vs localStorage fallback)
  owner?: string         // SS58 address that signed/owns the stored deck (when publisher-signed)
  updatedAt: number
}

export interface SlidesConfig {
  title?: string
  description?: string
}
