#!/bin/sh
# Exit when error happens
set -e

echo "=== File Transfer App Startup ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

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
echo "Starting application..."
exec npx next start