#!/bin/bash
# Debug script to check migration status in the container

echo "=== Debugging Prisma Migrations ==="
echo ""
echo "1. Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "   ❌ DATABASE_URL is not set!"
else
    echo "   ✓ DATABASE_URL is set"
    echo "   Masked URL: $(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"
fi

echo ""
echo "2. Checking Prisma directory..."
if [ -d "prisma" ]; then
    echo "   ✓ Prisma directory exists"
    echo "   Migrations found:"
    ls -1 prisma/migrations/ | grep -v migration_lock.toml
else
    echo "   ❌ Prisma directory not found!"
fi

echo ""
echo "3. Checking Prisma Client..."
if [ -d "src/generated/prisma" ]; then
    echo "   ✓ Prisma Client exists"
else
    echo "   ❌ Prisma Client not found!"
fi

echo ""
echo "4. Testing database connection..."
npx prisma db execute --stdin <<< "SELECT version();" 2>&1 || echo "   ❌ Connection failed!"

echo ""
echo "5. Checking migration status..."
npx prisma migrate status

echo ""
echo "6. Checking if tables exist..."
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>&1 || echo "   ❌ Cannot query tables!"

echo ""
echo "=== End Debug ==="
