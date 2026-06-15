export { SlidesWidget } from './SlidesWidget'
export { SlideEditor } from './SlideEditor'
export { PublicDeck, PreviewDeck } from './PublicDeck'
export { DeckViewer } from './DeckViewer'
export { SlideView } from './SlideView'
export {
  defaultSlidesConfig,
  loadDecks,
  saveDecks,
  upsertDeckEntry,
  deleteDeckEntry,
  loadDraft,
  saveDraft,
  uploadDeck,
  fetchDeck,
  uploadImage,
  newDeck,
  newSlide,
  newId,
  SLIDES_INDEX_KEY
} from './config'
export type {
  Deck,
  DeckTheme,
  DeckIndexEntry,
  Slide,
  SlideBlock,
  BlockType,
  SlidesConfig
} from './types'
