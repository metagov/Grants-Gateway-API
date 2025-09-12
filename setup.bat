@echo off
setlocal enabledelayedexpansion

echo 🚀 OpenGrants Gateway API - Quick Setup (Windows)
echo ===================================================

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pnpm is not installed. Installing pnpm...
    npm install -g pnpm
    if errorlevel 1 (
        echo ❌ Failed to install pnpm. Please install manually: npm install -g pnpm
        pause
        exit /b 1
    )
    echo ✅ pnpm installed successfully
) else (
    echo ✅ pnpm is already installed
)

REM Check Node.js version
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
    echo ❌ Node.js version 18 or higher is required. Current version: 
    node -v
    echo Please upgrade Node.js: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js version is compatible
    node -v
)

echo.
echo 📦 Installing dependencies with pnpm...
pnpm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo.
    echo ⚙️ Setting up environment configuration...
    copy .env.example .env >nul
    echo ✅ Created .env file from template
    echo.
    echo 🔧 IMPORTANT: Please edit .env file with your database configuration:
    echo    - Set DATABASE_URL to your PostgreSQL connection string
    echo    - Update SESSION_SECRET with a random string
    echo.
    echo Example DATABASE_URL formats:
    echo    Local:  postgresql://username:password@localhost:5432/grants_gateway
    echo    Neon:   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/grants_gateway
    echo.
) else (
    echo ✅ .env file already exists
)

echo 🗄️ Database Setup Options:
echo 1. I have a cloud database (Neon, Supabase, etc.) - Skip database creation
echo 2. I have PostgreSQL installed locally
echo 3. I'll set up the database manually later
echo.
set /p db_option="Choose option (1-3): "

if "%db_option%"=="2" (
    echo ✅ Using local PostgreSQL - make sure to update DATABASE_URL in .env
    echo 📝 Example: DATABASE_URL="postgresql://localhost:5432/grants_gateway"
) else if "%db_option%"=="1" (
    echo ✅ Using cloud database - make sure to update DATABASE_URL in .env
) else (
    echo ✅ Database setup deferred - remember to configure DATABASE_URL in .env
)

echo.
echo 🎯 Next Steps:
echo ==============
echo.
echo 1. Configure your database:
echo    - Edit .env file with your DATABASE_URL
echo    - Set SESSION_SECRET to a random string
echo.
echo 2. Initialize database schema:
echo    pnpm run db:push
echo.
echo 3. Start the development server:
echo    pnpm run dev
echo.
echo 4. Open your browser to:
echo    http://localhost:5000/dashboard
echo.
echo 📚 Additional Commands:
echo    pnpm run test:api       # Test API health
echo    pnpm run test:accurate  # Test accurate analytics
echo    pnpm run check          # TypeScript type checking
echo.
echo 🆘 Need help? Check the README.md or visit:
echo    http://localhost:5000/endpoints (when running)
echo.

if not "%db_option%"=="3" (
    echo.
    set /p init_db="🚀 Would you like to initialize the database schema now? (y/N): "
    if /i "!init_db!"=="y" (
        echo Initializing database schema...
        pnpm run db:push
        if errorlevel 1 (
            echo ❌ Database initialization failed. Please check your DATABASE_URL in .env
            echo    Make sure your database is running and accessible
        ) else (
            echo ✅ Database schema initialized successfully
        )
    )
)

echo.
set /p start_dev="🎉 Setup complete! Start the development server now? (y/N): "
if /i "!start_dev!"=="y" (
    echo Starting development server...
    echo 🌐 Dashboard will be available at: http://localhost:5000/dashboard
    echo.
    pnpm run dev
) else (
    echo.
    echo 🎉 Setup complete! Run 'pnpm run dev' when you're ready to start.
    echo 📖 See README.md for detailed documentation.
    pause
)
