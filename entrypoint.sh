#!/bin/sh
# Exit when error happens
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
npx next start