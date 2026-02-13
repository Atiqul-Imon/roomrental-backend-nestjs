#!/bin/bash
# Quick script to check if Supabase database is accessible

echo "🔍 Checking Supabase database connection..."
echo ""

cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Test connection using Prisma
echo "📍 Testing connection to: ${DATABASE_URL//:[^@]*@/:***@}"
echo ""

npx prisma db execute --stdin <<< "SELECT 1 as test;" 2>&1 | head -20

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database is accessible! You can now run migrations."
    exit 0
else
    echo ""
    echo "❌ Database is still not accessible. Wait for Supabase to come back online."
    echo "📊 Check status at: https://status.supabase.com"
    exit 1
fi


