#!/bin/bash

echo "🚀 RoomRental NestJS Backend - Environment Setup"
echo "=================================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo "📝 Generating .env file..."
echo ""

# Generate JWT secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Prompt for database connection
echo "Choose database option:"
echo "1) Supabase (Recommended - like MongoDB Atlas)"
echo "2) Local PostgreSQL"
echo "3) Other (Manual entry)"
read -p "Enter choice (1-3): " db_choice

case $db_choice in
    1)
        echo ""
        echo "📋 Supabase Setup:"
        echo "1. Go to https://supabase.com"
        echo "2. Create a new project"
        echo "3. Go to Settings → Database"
        echo "4. Copy the connection string (URI format)"
        echo ""
        read -p "Paste your Supabase DATABASE_URL: " DATABASE_URL
        ;;
    2)
        read -p "Enter database user [roomrental_user]: " db_user
        db_user=${db_user:-roomrental_user}
        read -p "Enter database password: " db_pass
        read -p "Enter database name [roomrental]: " db_name
        db_name=${db_name:-roomrental}
        DATABASE_URL="postgresql://${db_user}:${db_pass}@localhost:5432/${db_name}?schema=public"
        ;;
    3)
        read -p "Enter DATABASE_URL: " DATABASE_URL
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Create .env file
cat > .env << ENVFILE
# Application
NODE_ENV=development
PORT=5000
APP_NAME=RoomRentalUSA API

# Database
DATABASE_URL=${DATABASE_URL}

# JWT Secrets (auto-generated)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Cloudinary (update with your credentials)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS
CORS_ORIGIN=http://localhost:3000,https://roomrental.pixelforgebd.com
FRONTEND_URL=http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
ENVFILE

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update CLOUDINARY_* variables if you have Cloudinary account"
echo "2. Run: npm run prisma:migrate"
echo "3. Run: npm run dev"
echo ""
