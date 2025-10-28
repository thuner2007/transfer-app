#!/bin/sh
# Exit when error happens
set -e

echo "=== File Transfer App Startup ==="
echo "Working directory: $(pwd)"
echo "Checking Prisma files..."
ls -la prisma/ || echo "Prisma directory not found!"
echo "Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    exit 1
fi
echo "DATABASE_URL is set (not showing for security)"

echo "Running database migrations..."
if ! npx prisma migrate deploy; then
    echo "ERROR: Database migration failed!"
    echo "Please check your DATABASE_URL environment variable and database connection."
    exit 1
fi

echo "Database migrations completed successfully!"
echo "Starting application..."
npx next start