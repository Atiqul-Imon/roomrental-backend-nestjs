#!/bin/bash

# Deployment using HTTPS (works with private repos)
# This will clone using HTTPS and then switch to SSH for future pulls

DROPLET_IP="167.71.110.39"

echo "🚀 Deploying RoomRentalUSA Backend"
echo ""

# Clone using HTTPS (works for private repos if you have access)
echo "📥 Cloning repository via HTTPS..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www
if [ -d "roomrental-api" ]; then
    rm -rf roomrental-api
fi

# Clone via HTTPS (will work if repo is accessible)
git clone https://github.com/Atiqul-Imon/roomrental-backend-nestjs.git roomrental-api
cd roomrental-api
echo "✅ Repository cloned"
pwd
ls -la | head -10
APPUSER
ENDSSH

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Clone failed. Repository may be private."
    echo ""
    echo "Options:"
    echo "1. Make repository public temporarily"
    echo "2. Use Personal Access Token in URL:"
    echo "   https://TOKEN@github.com/Atiqul-Imon/roomrental-backend-nestjs.git"
    echo "3. Add server SSH key to GitHub"
    exit 1
fi

echo ""
echo "✅ Repository cloned successfully!"
echo ""
echo "Now we need to configure environment variables..."
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
echo ""
echo "📝 Creating .env file..."
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
pm2 startup | grep -v "PM2" | bash || true

echo "✅ PM2 started"
pm2 status
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
sleep 5
HEALTH=$(ssh root@$DROPLET_IP "curl -s http://localhost:5000/api/health 2>/dev/null")

if [ ! -z "$HEALTH" ] && [[ $HEALTH != *"error"* ]]; then
    echo "✅ Health check passed!"
    echo "Response: $HEALTH"
else
    echo "⚠️  Health check failed"
    ssh root@$DROPLET_IP "sudo -u appuser pm2 status"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "API: http://167.71.110.39/api"











