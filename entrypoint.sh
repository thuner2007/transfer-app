#!/bin/sh
# Exit when error happens
set -e

echo "Running database migrations..."
if ! npx prisma migrate deploy; then
    echo "ERROR: Database migration failed!"
    echo "Please check your DATABASE_URL environment variable and database connection."
    exit 1
fi

echo "Database migrations completed successfully!"
echo "Starting application..."
npx next start