#!/bin/bash
set -e

echo "🔧 Setting up PolkaVM toolchain..."
echo ""

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed"
    echo ""
    echo "Please install Rust from https://rustup.rs:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo ""
    exit 1
fi

echo "✅ Rust is installed: $(rustc --version)"

# Install nightly toolchain
echo ""
echo "📦 Installing nightly-2024-11-19 toolchain..."
rustup toolchain install nightly-2024-11-19
rustup component add rust-src --toolchain nightly-2024-11-19

# Verify installation
echo ""
echo "🔍 Verifying toolchain..."
rustup toolchain list | grep nightly-2024-11-19

# Install polkatool
echo ""
echo "📦 Installing polkatool..."
if command -v polkatool &> /dev/null; then
    echo "✅ polkatool is already installed: $(polkatool --version 2>&1 | head -n1)"
else
    cargo install polkatool
    echo "✅ polkatool installed"
fi

# Test build
echo ""
echo "🔨 Testing minimal build..."
cd "$(dirname "$0")/.."
cargo build --release --bin accesspass

echo ""
echo "✅ PolkaVM toolchain setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Implement AccessPass contract (src/accesspass.rs)"
echo "  2. Build: cargo build --release --bin accesspass"
echo "  3. Deploy: MNEMONIC=\"...\" npm run deploy:accesspass"
