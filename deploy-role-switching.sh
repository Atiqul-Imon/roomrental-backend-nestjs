#!/bin/bash

# Quick Deploy Role Switching Feature
# This script will deploy ONLY the new changes to production

DROPLET_IP="167.71.110.39"
PROJECT_DIR="/root/roomrental-backend-nestjs"

echo "🚀 Deploying Role Switching Feature to Production"
echo "Server: $DROPLET_IP"
echo ""

# Deploy to server
ssh root@$DROPLET_IP << 'ENDSSH'

echo "📂 Navigating to project directory..."
cd /root/roomrental-backend-nestjs || exit 1

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies (if any new)..."
npm install --production

echo "🔨 Building project..."
npm run build

echo "🔄 Restarting PM2 process..."
pm2 restart roomrental-api

echo "✅ Waiting for server to start..."
sleep 5

echo "📊 Checking PM2 status..."
pm2 status roomrental-api

echo ""
echo "📝 Recent logs:"
pm2 logs roomrental-api --lines 20 --nostream

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test the endpoint:"
echo "curl https://api.roomrentalusa.com/api/profile/switch-role -H 'Authorization: Bearer YOUR_TOKEN'"

ENDSSH

echo ""
echo "🎉 Done! The role switching feature is now live!"
