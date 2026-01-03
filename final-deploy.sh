#!/bin/bash

# Final Deployment Script
# Complete automated deployment

DROPLET_IP="167.71.110.39"

echo "🚀 Final Deployment - RoomRentalUSA Backend"
echo ""

# Test connection
if ! ssh -o ConnectTimeout=5 root@$DROPLET_IP "echo 'Connected'" &>/dev/null; then
    echo "❌ Cannot connect to droplet"
    exit 1
fi

echo "✅ Connected to droplet"
echo ""

# Setup SSH for GitHub
echo "🔑 Setting up SSH for GitHub..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
chmod 600 ~/.ssh/known_hosts
echo "✅ SSH configured"
APPUSER
ENDSSH

# Clone repository
echo "📥 Cloning repository..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www
if [ -d "roomrental-api" ]; then
    echo "Removing old directory..."
    rm -rf roomrental-api
fi

echo "Cloning repository..."
if git clone git@github.com:Atiqul-Imon/roomrental-backend-nestjs.git roomrental-api 2>&1; then
    echo "✅ Repository cloned"
    cd roomrental-api
    echo "Current directory: $(pwd)"
    ls -la | head -10
else
    echo "❌ Clone failed"
    echo "Trying HTTPS method..."
    git clone https://github.com/Atiqul-Imon/roomrental-backend-nestjs.git roomrental-api
fi
APPUSER
ENDSSH

echo ""
echo "⚙️  Configuration needed..."
echo "Please provide your environment variables:"
echo ""

read -p "Supabase DATABASE_URL: " DB_URL
read -p "JWT Secret (Enter to auto-generate): " JWT_SEC
read -p "Cloudinary Cloud Name: " CLOUD_NAME
read -p "Cloudinary API Key: " CLOUD_KEY
read -p "Cloudinary API Secret: " CLOUD_SECRET
read -p "Frontend URL (for CORS): " FRONTEND

if [ -z "$JWT_SEC" ]; then
    JWT_SEC=$(openssl rand -base64 32)
    echo "Generated JWT Secret"
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

echo "Building application..."
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

# Stop existing
pm2 stop roomrental-api 2>/dev/null || true
pm2 delete roomrental-api 2>/dev/null || true

# Start new
pm2 start ecosystem.config.js
pm2 save

# Setup startup
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
    if nginx -t; then
        systemctl reload nginx
        echo "✅ Nginx configured and reloaded"
    else
        echo "⚠️  Nginx config test failed"
    fi
else
    echo "⚠️  nginx.conf not found in repository"
fi
ENDSSH

# Test
echo ""
echo "🧪 Testing deployment..."
sleep 5
HEALTH=$(ssh root@$DROPLET_IP "curl -s http://localhost:5000/api/health 2>/dev/null || echo 'FAILED'")

if [[ $HEALTH != *"FAILED"* ]] && [ ! -z "$HEALTH" ]; then
    echo "✅ Health check passed!"
    echo "Response: $HEALTH"
else
    echo "⚠️  Health check failed"
    echo "Checking PM2 status..."
    ssh root@$DROPLET_IP "sudo -u appuser pm2 status"
    echo ""
    echo "View logs: ssh root@167.71.110.39 'sudo -u appuser pm2 logs roomrental-api --lines 50'"
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "Your API is available at:"
echo "  http://167.71.110.39/api"
echo "  http://167.71.110.39/api/health"
echo ""
echo "PM2 Commands:"
echo "  ssh root@167.71.110.39 'sudo -u appuser pm2 status'"
echo "  ssh root@167.71.110.39 'sudo -u appuser pm2 logs roomrental-api'"
echo "  ssh root@167.71.110.39 'sudo -u appuser pm2 restart roomrental-api'"





















