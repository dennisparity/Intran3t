# Intran3t — Progress

## 2026-06-15 — Sl1des module (presentations) MVP

### Completed
- New module `src/modules/slides/` — block-based presentation builder, Bulletin-backed, public link sharing.
  - `types.ts` — `Deck` / `Slide` / `SlideBlock` (heading, text, bullets, image, code), themes (light/dark/polkadot).
  - `config.ts` — localStorage deck index + drafts; `uploadDeck`/`fetchDeck`/`uploadImage` wrap existing `uploadRawToBulletin`/`fetchRawFromBulletin` in `src/lib/bulletin-storage.ts`; base64 image cache.
  - `SlideView.tsx` — shared renderer; uses CSS container-query units (cqw/cqh) so one component scales for present view, editor canvas, and thumbnails.
  - `BulletinImage.tsx` — renders Bulletin images by CID (data-URL cache → gateway fallback).
  - `SlideEditor.tsx` — slide rail (add/reorder/delete), live preview, block toolbar + inline block editors, image upload to Bulletin, theme picker, Publish → CID → `/present/:cid` link.
  - `PublicDeck.tsx` — fullscreen viewer, arrow-key/click nav, ESC to exit, no wallet needed.
  - `SlidesWidget.tsx` — dashboard widget (list decks, new/edit/present/copy-link/delete).
- Wired routes in `src/App.tsx`: `/slides/new`, `/slides/edit/:localId`, `/present/:cid`.
- Added `SlidesWidget` tile to `src/pages/ModularDashboard.tsx`.
- `npm run build` passes (type-check clean).

### Editor UX (added this session)
- On-canvas editing (Google-Slides style) via `EditableSlide.tsx` — click any element to edit; contentEditable text that preserves caret.
- Drag-and-drop reorder (native HTML5) for blocks (drag handle) and slides (thumbnail rail), with drop indicators.
- Per-element size controls (text scale 0.4–3×, image width 20–100%) stored on the block, applied in the shared renderer so Preview/Present match.
- Duplicate block + duplicate slide (deep clone with fresh IDs).
- Preview route `/slides/preview/:localId` presents the local draft without publishing (`PreviewDeck`, shared `DeckViewer`).
- Renamed user-facing name Sl1des → **Slides**; theme dropdown reduced to Light/Dark.

### Publish honesty + ownership model (added this session)
- `bulletin-storage.ts`: `uploadRawToBulletinWithStatus` reports on-chain vs localStorage fallback; `uploadRawToBulletinAsUser` does **authorize-then-store** (Alice sudo `authorize_account` → publisher's own account signs `store`) so the individual owns the deck. `BulletinUploadResult { cid, onChain, signer: 'relay-alice'|'user', owner? }`.
- Editor publish banners are now honest: distinguishes On-chain (owned by <addr>) vs relay-signed vs Local-only fallback; "Publish update" when edited since publish.
- Widget labels decks On-chain / Local only / Draft.
- **Interim:** Bulletin storage is permissioned; we sudo-authorize the publisher at publish time. UPGRADE PATH documented in `bulletin-storage.ts`: once live, users authorized by default (no sudo step).

### Verified
- Production build / TypeScript compile succeeds.

### Next steps / not yet done
- **Test publisher-owned publish inside the Triangle host** — on plain localhost there is no host-injected account (Spektr: "Environment is not correct"), so publishing uses the //Alice relay. The user-signed/owned path is only exercisable in the host → ship to `intran3t.dot` then test there.
- Open question: does the host-injected `polkadotSigner` sign Bulletin (non-AssetHub) extrinsics? Falls back to localStorage if not — verify on Triangle.
- Polkadot-design-system note: module matches existing hex-based module styling (FormsWidget); project has no semantic-token Tailwind config. App-wide token migration is a separate task.

### Out of scope (future)
- On-chain `DecksRegistry` contract (FormsV2-style) for ownership/discovery.
- Encrypted/private decks (reuse `forms-encryption.ts`).
- People Chain author identity badge; AI-generated decks; PPTX export; live collaboration.

### Plan file
`nimbalyst-local/plans/parsed-moseying-quokka.md`
