# Intran3t PolkaVM Smart Contracts

PolkaVM Rust smart contracts for Intran3t, deployed to Polkadot Asset Hub via `pallet_revive`.

## Contracts

- **AccessPass** - ERC-721 compliant soulbound access pass NFTs (simplified, no RBAC)

## Prerequisites

```bash
# Install Rust nightly toolchain
rustup toolchain install nightly-2024-11-19
rustup component add rust-src --toolchain nightly-2024-11-19

# Install polkatool
cargo install polkatool
```

## Build

```bash
# Build AccessPass contract
cargo build --release --bin accesspass

# Output: target/riscv64emac-unknown-none-polkavm/release/accesspass.polkavm
```

## Deploy

```bash
# Deploy AccessPass to Polkadot Hub TestNet
cd scripts
MNEMONIC="your twelve word mnemonic" npm run deploy:accesspass
```

## Architecture

### Deployment Pattern

**Admin Operations (Contract Deployment):**
- Uses derived EVM addresses: `keccak256(AccountId32)` → last 20 bytes
- Deterministic, no pre-transaction required
- Perfect for CI/CD and automated deployments

**User Operations (Runtime Interactions):**
- Uses mapped addresses via `pallet_revive.map_account()`
- Preserves identity verification benefits
- Maintains existing frontend UX

### Storage Layout

PolkaVM contracts use key-value storage instead of Solidity's automatic storage slots:

```rust
// Namespace constants
const OWNER_KEY: [u8; 32] = [0xFF; 32];
const PASS_METADATA_NS: u8 = 0x00;
const TOKEN_COUNTER_KEY: [u8; 32] = [0x01; 32];

// Dynamic keys for mappings
fn pass_key(token_id: u64) -> [u8; 32] {
    let mut key = [0u8; 32];
    key[0] = PASS_METADATA_NS;
    key[1..9].copy_from_slice(&token_id.to_le_bytes());
    key
}
```

### ABI Compatibility

PolkaVM contracts maintain Solidity ABI compatibility:
- Function selectors match Solidity versions
- Event signatures unchanged
- Frontend requires only address updates (no ABI changes)

## Testing

```bash
# Run contract tests
npm test

# Integration test on testnet
npm run test:integration
```

## Migration from Solidity

This codebase replaces the previous Solidity contracts:
- Old AccessPass: `0xfd2a6Ee5BE5AB187E8368025e33a8137ba66Df94` (deprecated)
- Old RBAC: `0xF1152B54404F7F4B646199072Fd3819D097c4F94` (removed)

**Key Changes:**
- RBAC removed completely (anyone can mint AccessPass)
- Deployment uses Substrate accounts (no MetaMask)
- Contract owner is derived EVM address from deployer's Substrate account
- Frontend simplified (no membership checks)

## Resources

- [PolkaVM Documentation](https://github.com/paritytech/polkavm)
- [pallet_revive Guide](https://github.com/paritytech/polkadot-sdk/tree/master/substrate/frame/revive)
- [Protocol Commons Reference](https://github.com/protocol-commons/contracts)
