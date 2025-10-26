#!/bin/bash

# OpenGrants Gateway API - Quick Setup Script
# This script helps you get the application running quickly with pnpm

set -e  # Exit on any error

echo "🚀 OpenGrants Gateway API - Quick Setup"
echo "======================================="

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
    echo "✅ pnpm installed successfully"
else
    echo "✅ pnpm is already installed"
fi

# Check if Node.js version is compatible
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    echo "Please upgrade Node.js: https://nodejs.org/"
    exit 1
else
    echo "✅ Node.js version $(node -v) is compatible"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies with pnpm..."
pnpm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️ Setting up environment configuration..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo ""
    echo "🔧 IMPORTANT: Please edit .env file with your database configuration:"
    echo "   - Set DATABASE_URL to your PostgreSQL connection string"
    echo "   - Update SESSION_SECRET with a random string"
    echo ""
    echo "Example DATABASE_URL formats:"
    echo "   Local:  postgresql://username:password@localhost:5432/grants_gateway"
    echo "   Neon:   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/grants_gateway"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Check if DATABASE_URL is set
if grep -q "postgresql://username:password@localhost:5432/grants_gateway" .env 2>/dev/null; then
    echo "⚠️  WARNING: DATABASE_URL still contains example values"
    echo "   Please update .env with your actual database connection string"
    echo ""
fi

# Offer to create local database
echo "🗄️ Database Setup Options:"
echo "1. I have a cloud database (Neon, Supabase, etc.) - Skip database creation"
echo "2. Create local PostgreSQL database"
echo "3. I'll set up the database manually later"
echo ""
read -p "Choose option (1-3): " db_option

case $db_option in
    2)
        if command -v createdb &> /dev/null; then
            echo "Creating local database 'grants_gateway'..."
            createdb grants_gateway 2>/dev/null || echo "Database might already exist"
            echo "✅ Local database setup complete"
            echo "📝 Update your .env file with: DATABASE_URL=\"postgresql://localhost:5432/grants_gateway\""
        else
            echo "❌ PostgreSQL not found. Please install PostgreSQL first:"
            echo "   macOS: brew install postgresql && brew services start postgresql"
            echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
        fi
        ;;
    1)
        echo "✅ Using cloud database - make sure to update DATABASE_URL in .env"
        ;;
    3)
        echo "✅ Database setup deferred - remember to configure DATABASE_URL in .env"
        ;;
esac

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "1. Configure your database:"
echo "   - Edit .env file with your DATABASE_URL"
echo "   - Set SESSION_SECRET to a random string"
echo ""
echo "2. Initialize database schema:"
echo "   pnpm run db:push"
echo ""
echo "3. Start the development server:"
echo "   pnpm run dev"
echo ""
echo "4. Open your browser to:"
echo "   http://localhost:5000/dashboard"
echo ""
echo "📚 Additional Commands:"
echo "   pnpm run test:api       # Test API health"
echo "   pnpm run test:accurate  # Test accurate analytics"
echo "   pnpm run check          # TypeScript type checking"
echo ""
echo "🆘 Need help? Check the README.md or visit:"
echo "   http://localhost:5000/endpoints (when running)"
echo ""

# Check if user wants to continue with database setup
if [ "$db_option" != "3" ]; then
    echo ""
    read -p "🚀 Would you like to initialize the database schema now? (y/N): " init_db
    if [[ $init_db =~ ^[Yy]$ ]]; then
        echo "Initializing database schema..."
        if pnpm run db:push; then
            echo "✅ Database schema initialized successfully"
        else
            echo "❌ Database initialization failed. Please check your DATABASE_URL in .env"
            echo "   Make sure your database is running and accessible"
        fi
    fi
fi

echo ""
read -p "🎉 Setup complete! Start the development server now? (y/N): " start_dev
if [[ $start_dev =~ ^[Yy]$ ]]; then
    echo "Starting development server..."
    echo "🌐 Dashboard will be available at: http://localhost:5000/dashboard"
    echo ""
    pnpm run dev
else
    echo ""
    echo "🎉 Setup complete! Run 'pnpm run dev' when you're ready to start."
    echo "📖 See README.md for detailed documentation."
fi
