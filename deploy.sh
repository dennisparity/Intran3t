#!/bin/bash

echo "🚀 Intran3t Vercel Deployment Script"
echo "===================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo ""
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env with testnet configuration..."
    cat > .env << 'ENVEOF'
VITE_NETWORK=testnet
VITE_RBAC_CONTRACT_ADDRESS=0xF1152B54404F7F4B646199072Fd3819D097c4F94
VITE_ASSETHUB_EVM_CHAIN_ID=420420417
VITE_ASSETHUB_EVM_RPC=https://services.polkadothub-rpc.com/testnet
VITE_PEOPLE_CHAIN_RPC=wss://polkadot-people-rpc.polkadot.io
VITE_DOTID_API_URL=/api/dotid-proxy
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_LOGS=true
ENVEOF
    echo "✅ Created .env file"
    echo ""
fi

echo "🏗️  Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "Choose deployment type:"
echo "  1) Preview deployment (test URL)"
echo "  2) Production deployment"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🔍 Deploying to preview..."
        vercel
        ;;
    2)
        echo ""
        echo "🚀 Deploying to production..."
        vercel --prod
        ;;
    *)
        echo "❌ Invalid choice. Run script again."
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Visit the deployment URL shown above"
echo "  2. Test wallet connection"
echo "  3. Try creating an organization"
echo "  4. Test registry search"
echo ""
