#!/bin/bash

# Deploy OpenGrants Gateway API to Render
# This script helps prepare and deploy your application

set -e

echo "🚀 Deploying OpenGrants Gateway API to Render"
echo "=============================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git push -u origin main"
    exit 1
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Committing them now..."
    git add .
    read -p "Enter commit message (or press Enter for default): " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Prepare for Render deployment"
    fi
    git commit -m "$commit_msg"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote origin found. Please add your GitHub repository:"
    echo "   git remote add origin <your-github-repo-url>"
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Code pushed to GitHub successfully!"
echo ""
echo "🎯 Next Steps for Render Deployment:"
echo "===================================="
echo ""
echo "1. Go to Render Dashboard: https://dashboard.render.com"
echo ""
echo "2. Create PostgreSQL Database:"
echo "   - Click 'New +' → 'PostgreSQL'"
echo "   - Name: grants-gateway-db"
echo "   - Database: grants_gateway"
echo "   - User: grants_user"
echo "   - Plan: Free (for testing) or Starter (for production)"
echo ""
echo "3. Create Web Service:"
echo "   - Click 'New +' → 'Web Service'"
echo "   - Connect your GitHub repository"
echo "   - Name: grants-gateway-api"
echo "   - Runtime: Node"
echo "   - Build Command: pnpm install && pnpm run db:push && pnpm run build"
echo "   - Start Command: pnpm start"
echo ""
echo "4. Set Environment Variables:"
echo "   Required:"
echo "   - DATABASE_URL (copy from your PostgreSQL service)"
echo "   - NODE_ENV=production"
echo "   - SESSION_SECRET=<generate-random-string>"
echo ""
echo "   Optional:"
echo "   - COINGECKO_API_KEY=<your-api-key>"
echo "   - DEFAULT_RATE_LIMIT=1000"
echo "   - CACHE_TTL_MINUTES=15"
echo ""
echo "5. Deploy and Test:"
echo "   - Click 'Create Web Service'"
echo "   - Wait for deployment (5-10 minutes)"
echo "   - Test at: https://your-app-name.onrender.com/dashboard"
echo ""
echo "📚 For detailed instructions, see: docs/render-deployment.md"
echo ""

# Check if render.yaml exists
if [ -f "render.yaml" ]; then
    echo "🔧 Alternative: Infrastructure as Code"
    echo "====================================="
    echo ""
    echo "You can also use the render.yaml file for automated deployment:"
    echo "1. Go to Render Dashboard"
    echo "2. Click 'New +' → 'Blueprint'"
    echo "3. Connect your GitHub repository"
    echo "4. Render will automatically create services from render.yaml"
    echo ""
fi

echo "🆘 Need help? Check the troubleshooting section in docs/render-deployment.md"
echo ""
echo "🎉 Happy deploying!"
