#!/bin/bash
set -e

echo "Building test_minimal contract..."
cargo build --release --bin test_minimal

echo "Linking test_minimal..."
polkatool link \
  target/riscv64emac-unknown-none-polkavm/release/test_minimal \
  -o target/test_minimal.polkavm

echo "✅ Build complete: target/test_minimal.polkavm"
ls -lh target/test_minimal.polkavm
