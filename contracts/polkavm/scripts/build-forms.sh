#!/bin/bash
set -e

echo "Building forms_v2 contract..."
cargo build --release --bin forms_v2

echo "Linking forms_v2 (with --strip for minimal binary)..."
polkatool link --strip \
  target/riscv64emac-unknown-none-polkavm/release/forms_v2 \
  -o target/forms_v2.polkavm

echo "✅ Build complete: target/forms_v2.polkavm"
ls -lh target/forms_v2.polkavm
