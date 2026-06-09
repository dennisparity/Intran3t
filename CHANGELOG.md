## 2026-06-09 (2)

- Update Bulletin chain PAPI descriptor to current runtime (codeHash mismatch was blocking proposal creation with TransactionStorage.store error)

## 2026-06-09

- Fix proposal creation: remove Sudo.sudo wrapper from Bulletin upload (Sudo pallet does not exist on paseo-next-v2 Bulletin chain)
- GovernanceWidget: add optional image upload to proposal creation form, stored as separate Bulletin CID
- GovernanceWidget: show proposal image in PollCard when present
- GovernanceWidget: remove People Chain identity query from VoteModal (was causing console errors for addresses with no on-chain identity)
- GovernanceWidget: remove "Content stored on Bulletin Chain" info box and its icon
- ProfileWidget: remove "Syncing..." balance display (product account has no balance by design; root account not accessible from host)
- ModularDashboard: wire up Add Plugin button to open a modal with three options (Request a Feature, Browse Plugins, Build and Publish)
- Add AddPluginModal component with Request a Feature flow and Coming Soon placeholders

## 2026-06-08

- Update CLAUDE.md signing stack: replace Typink/MetaMask references with canonical product-sdk patterns (host path + browser fallback)
- Update CLAUDE.md deploy section to bulletin-deploy v0.9.0: login command, --env flag, MNEMONIC env var (replaces DOTNS_MNEMONIC)
- Remove manual DotNS deployment steps (product-infrastructure/dotns-cli), replaced by single bulletin-deploy command
- Update env var docs: BULLETIN_RPC and PASEO_ASSETHUB_RPC no longer needed when using --env

## 2026-05-29

- Update DotNS contract addresses for Paseo Next v2 and Preview in CLAUDE.md (bulletin-deploy 0.7.29)
- Document unset BULLETIN_RPC requirement for Preview deploys
- Update current deployment CIDs for both environments

## 2026-05-26

- Fix office booking: selecting a desk from the floor map now works independently of date selection (removed stale desk clear on date toggle)
- Fix account display name: host-injected account now shows the user's primary username instead of the product DotNS identifier
