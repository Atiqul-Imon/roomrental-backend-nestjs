#!/bin/bash

# Quick Deployment Script - Interactive
# This will guide you through deployment step by step

DROPLET_IP="167.71.110.39"
REPO_URL="https://github.com/Atiqul-Imon/roomrental-backend-nestjs.git"

echo "🚀 Quick Deployment to Digital Ocean"
echo "Droplet: $DROPLET_IP"
echo "Repository: $REPO_URL"
echo ""

# Test SSH
echo "Testing SSH connection..."
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'Connected'" 2>/dev/null; then
    echo "✅ SSH connection successful!"
else
    echo "❌ Cannot connect. Please check SSH keys."
    exit 1
fi

echo ""
echo "Starting deployment..."
echo ""

# Step 1: Server Setup
echo "📦 Step 1/7: Setting up server..."
ssh root@$DROPLET_IP << 'ENDSSH'
export DEBIAN_FRONTEND=noninteractive

# Check and install Node.js 20
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs -qq
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2 -q
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update -qq
    apt-get install -y nginx git build-essential python3 postgresql-client -qq
fi

# Configure firewall
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1

# Create appuser
if ! id -u appuser &>/dev/null; then
    useradd -m -s /bin/bash appuser
fi

# Create directories
mkdir -p /var/www /var/log/roomrental-api /var/cache/nginx
chown -R appuser:appuser /var/www /var/log/roomrental-api
chown -R www-data:www-data /var/cache/nginx

echo "✅ Server setup complete"
ENDSSH

# Step 2: Clone Repository
echo "📥 Step 2/7: Cloning repository..."
ssh root@$DROPLET_IP << ENDSSH
sudo -u appuser bash << 'APPUSER'
cd /var/www
if [ -d "roomrental-api" ]; then
    echo "Repository exists, updating..."
    cd roomrental-api
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
else
    echo "Cloning repository..."
    git clone $REPO_URL roomrental-api
    cd roomrental-api
fi
echo "✅ Repository ready"
APPUSER
ENDSSH

# Step 3: Environment Setup
echo "⚙️  Step 3/7: Setting up environment..."
echo ""
echo "Please provide your configuration:"
echo ""

read -p "Supabase DATABASE_URL: " DB_URL
read -p "JWT Secret (press Enter to auto-generate): " JWT_SEC
read -p "Cloudinary Cloud Name: " CLOUD_NAME
read -p "Cloudinary API Key: " CLOUD_KEY
read -p "Cloudinary API Secret: " CLOUD_SECRET
read -p "Frontend URL (for CORS): " FRONTEND

if [ -z "$JWT_SEC" ]; then
    JWT_SEC=$(openssl rand -base64 32)
    echo "Generated JWT Secret"
fi

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
echo "✅ Environment configured"
APPUSER
ENDSSH

# Step 4: Install Dependencies
echo "📦 Step 4/7: Installing dependencies..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www/roomrental-api
npm ci --production=false
echo "✅ Dependencies installed"
APPUSER
ENDSSH

# Step 5: Database & Build
echo "🏗️  Step 5/7: Setting up database and building..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www/roomrental-api
npx prisma generate
npx prisma migrate deploy
npm run build
mkdir -p logs
echo "✅ Build complete"
APPUSER
ENDSSH

# Step 6: PM2
echo "🚀 Step 6/7: Starting with PM2..."
ssh root@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER'
cd /var/www/roomrental-api
pm2 stop roomrental-api 2>/dev/null || true
pm2 delete roomrental-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup | grep -v "PM2" | bash || true
echo "✅ PM2 started"
APPUSER
ENDSSH

# Step 7: Nginx
echo "🌐 Step 7/7: Configuring Nginx..."
ssh root@$DROPLET_IP << 'ENDSSH'
if [ -f "/var/www/roomrental-api/nginx.conf" ]; then
    cp /var/www/roomrental-api/nginx.conf /etc/nginx/sites-available/roomrental-api
    sed -i 's/server_name.*;/server_name 167.71.110.39;/' /etc/nginx/sites-available/roomrental-api
    ln -sf /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo "✅ Nginx configured"
else
    echo "⚠️  nginx.conf not found, skipping Nginx setup"
fi
ENDSSH

# Test
echo ""
echo "🧪 Testing deployment..."
sleep 3
HEALTH=$(ssh root@$DROPLET_IP "curl -s http://localhost:5000/api/health 2>/dev/null || echo 'FAILED'")

if [[ $HEALTH != *"FAILED"* ]] && [ ! -z "$HEALTH" ]; then
    echo "✅ Health check passed!"
    echo "Response: $HEALTH"
else
    echo "⚠️  Health check failed. Check logs with: ssh root@167.71.110.39 'sudo -u appuser pm2 logs roomrental-api'"
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "Your API is available at:"
echo "  http://167.71.110.39/api"
echo "  http://167.71.110.39/api/health"
echo ""
echo "PM2 Status:"
ssh root@$DROPLET_IP "sudo -u appuser pm2 status"















