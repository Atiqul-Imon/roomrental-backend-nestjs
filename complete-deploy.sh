#!/bin/bash

# Complete Deployment Script
# Assumes repository authentication is set up

DROPLET_IP="167.71.110.39"
REPO_SSH="git@github.com:Atiqul-Imon/roomrental-backend-nestjs.git"
REPO_HTTPS="https://github.com/Atiqul-Imon/roomrental-backend-nestjs.git"

echo "🚀 Complete Deployment to Digital Ocean"
echo ""

# Test SSH connection
if ! ssh -o ConnectTimeout=5 root@$DROPLET_IP "echo 'Connected'" &>/dev/null; then
    echo "❌ Cannot connect to droplet"
    exit 1
fi

echo "✅ Connected to droplet"
echo ""

# Clone/Update Repository
echo "📥 Setting up repository..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www

# Remove old if exists
if [ -d "roomrental-api" ]; then
    echo "Removing old directory..."
    rm -rf roomrental-api
fi

# Try SSH first, then HTTPS
if git clone git@github.com:Atiqul-Imon/roomrental-backend-nestjs.git roomrental-api 2>&1; then
    echo "✅ Cloned via SSH"
elif git clone https://github.com/Atiqul-Imon/roomrental-backend-nestjs.git roomrental-api 2>&1; then
    echo "✅ Cloned via HTTPS"
else
    echo "❌ Clone failed. Please:"
    echo "   1. Add SSH key to GitHub, OR"
    echo "   2. Make repository public temporarily"
    exit 1
fi

cd roomrental-api
echo "Current directory: $(pwd)"
echo "Files:"
ls -la
APPUSER
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Repository setup failed"
    exit 1
fi

echo ""
echo "✅ Repository ready!"
echo ""
echo "Now we need to configure environment variables."
echo "Please provide:"
echo ""

read -p "Supabase DATABASE_URL: " DB_URL
read -p "JWT Secret (Enter to generate): " JWT_SEC
read -p "Cloudinary Cloud Name: " CLOUD_NAME
read -p "Cloudinary API Key: " CLOUD_KEY
read -p "Cloudinary API Secret: " CLOUD_SECRET
read -p "Frontend URL (for CORS): " FRONTEND

if [ -z "$JWT_SEC" ]; then
    JWT_SEC=$(openssl rand -base64 32)
fi

# Create .env
echo "⚙️  Creating .env file..."
ssh root@$DROPLET_IP << ENDSSH
sudo -u appuser bash << APPUSER
cd /var/www/roomrental-api
cat > .env << EOF
NODE_ENV=production
PORT=5000
FRONTEND_URL=$FRONTEND
CORS_ORIGIN=$FRONTEND

DATABASE_URL=$DB_URL

JWT_SECRET=$JWT_SEC
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=$CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUD_KEY
CLOUDINARY_API_SECRET=$CLOUD_SECRET

THROTTLE_TTL=60
THROTTLE_LIMIT=100
EOF
echo "✅ .env created"
APPUSER
ENDSSH

# Deploy
echo ""
echo "📦 Deploying application..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www/roomrental-api

echo "Installing dependencies..."
npm install --production=false

echo "Generating Prisma Client..."
npx prisma generate

echo "Running migrations..."
npx prisma migrate deploy

echo "Building..."
npm run build

echo "Creating logs directory..."
mkdir -p logs

echo "✅ Build complete"
APPUSER
ENDSSH

# Start PM2
echo ""
echo "🚀 Starting with PM2..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www/roomrental-api

pm2 stop roomrental-api 2>/dev/null || true
pm2 delete roomrental-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Setup startup
pm2 startup | grep -v "PM2" | bash || true

echo "✅ PM2 started"
APPUSER
ENDSSH

# Configure Nginx
echo ""
echo "🌐 Configuring Nginx..."
ssh root@$DROPLET_IP << 'ENDSSH'
if [ -f "/var/www/roomrental-api/nginx.conf" ]; then
    cp /var/www/roomrental-api/nginx.conf /etc/nginx/sites-available/roomrental-api
    sed -i 's/server_name.*;/server_name 167.71.110.39;/' /etc/nginx/sites-available/roomrental-api
    ln -sf /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo "✅ Nginx configured"
else
    echo "⚠️  nginx.conf not found"
fi
ENDSSH

# Test
echo ""
echo "🧪 Testing..."
sleep 3
HEALTH=$(ssh root@$DROPLET_IP "curl -s http://localhost:5000/api/health 2>/dev/null")

if [ ! -z "$HEALTH" ] && [[ $HEALTH != *"error"* ]]; then
    echo "✅ Health check passed!"
    echo "Response: $HEALTH"
else
    echo "⚠️  Health check failed"
    echo "Check logs: ssh root@167.71.110.39 'sudo -u appuser pm2 logs roomrental-api'"
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "API: http://167.71.110.39/api"
echo "Health: http://167.71.110.39/api/health"

