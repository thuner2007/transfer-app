#!/bin/bash
# Exit when error happens
set -e

echo "=== File Transfer App Startup ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Fix permissions for node_modules if they exist
if [ -d "node_modules" ]; then
    echo "Checking node_modules permissions..."
    # Check if we can write to node_modules
    if [ ! -w "node_modules" ]; then
        echo "WARNING: node_modules is not writable, this may cause issues"
    fi
fi

echo "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "node_modules not found, running npm install..."
    npm install --unsafe-perm
else
    echo "node_modules found, checking if install is needed..."
    # Remove node_modules if can't write to it
    if [ ! -w "node_modules" ]; then
        echo "node_modules is not writable, removing and reinstalling..."
        rm -rf node_modules
        npm install --unsafe-perm
    else
        npm ci --prefer-offline --no-audit --unsafe-perm || npm install --unsafe-perm
    fi
fi

echo "Checking Prisma files..."
if [ ! -d "prisma" ]; then
    echo "ERROR: Prisma directory not found!"
    exit 1
fi
ls -la prisma/

echo "Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    exit 1
fi
echo "DATABASE_URL is set (showing masked version for debugging)"
echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/'

echo "Checking Prisma Client..."
if [ ! -d "src/generated/prisma" ]; then
    echo "WARNING: Prisma client not found, generating..."
    npx prisma generate
fi

echo "Testing database connection..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" 2>&1; then
    echo "WARNING: Could not test database connection, but continuing..."
fi

echo "Running database migrations..."
echo "Available migrations:"
ls -la prisma/migrations/ || echo "No migrations directory found"

if ! npx prisma migrate deploy 2>&1; then
    echo "ERROR: Database migration failed!"
    echo "Attempting to show migration status..."
    npx prisma migrate status || true
    echo "Please check your DATABASE_URL environment variable and database connection."
    exit 1
fi

echo "Verifying migrations..."
npx prisma migrate status

echo "Database migrations completed successfully!"

echo "Building Next.js application..."
if [ ! -d ".next" ]; then
    echo ".next directory not found, running build..."
    npm run build
else
    echo ".next directory found, checking if rebuild is needed..."
    # Check if package.json is newer than .next directory
    if [ "package.json" -nt ".next" ] || [ "next.config.ts" -nt ".next" ]; then
        echo "Configuration changed, rebuilding..."
        npm run build
    else
        echo "Build is up to date, skipping..."
    fi
fi

echo "Starting application..."
exec npm run start