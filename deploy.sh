#!/bin/bash

# Vercel Deployment Script for Task App
# This script helps deploy the app to Vercel with all required configuration

set -e

echo "🚀 Starting Vercel Deployment Process..."
echo ""

# Check if Vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

echo "✅ Vercel CLI ready"
echo ""

# Check for required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Environment variables not set in shell"
    echo "   Please provide:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo ""
    echo "   Or run: export NEXT_PUBLIC_SUPABASE_URL=..."
    echo "          export NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
    exit 1
fi

echo "📦 Building project..."
npm run build

echo ""
echo "🌐 Deploying to Vercel..."
echo ""

# Deploy to Vercel with environment variables
vercel --prod \
  --env NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update Supabase Auth redirect URLs with your Vercel domain"
echo "   2. Update Stripe Customer Portal return URL"
echo "   3. Test your deployment"
