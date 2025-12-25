#!/bin/bash

# RoomRentalUSA Backend Deployment Script
# This script automates the deployment process on Digital Ocean

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Install/update dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --production=false

# Generate Prisma Client
echo -e "${YELLOW}🔧 Generating Prisma Client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy

# Build the application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    npm install -g pm2
fi

# Stop existing PM2 process
echo -e "${YELLOW}🛑 Stopping existing processes...${NC}"
pm2 stop roomrental-api || true
pm2 delete roomrental-api || true

# Start with PM2
echo -e "${YELLOW}▶️  Starting application with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
echo -e "${YELLOW}⚙️  Setting up PM2 startup script...${NC}"
pm2 startup | grep -v "PM2" | bash || true

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}📊 Check status: pm2 status${NC}"
echo -e "${GREEN}📋 View logs: pm2 logs roomrental-api${NC}"








