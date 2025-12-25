#!/bin/bash

# Automated Deployment Script for Digital Ocean
# This script does everything automatically

set -e

DROPLET_IP="167.71.110.39"
DROPLET_USER="root"

echo "🚀 Starting automated deployment to Digital Ocean..."
echo "Droplet IP: $DROPLET_IP"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if SSH key is available
if ! ssh-add -l &>/dev/null; then
    echo -e "${YELLOW}⚠️  No SSH keys found in agent. Trying default key...${NC}"
fi

# Test SSH connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP "echo 'Connection successful'" &>/dev/null; then
    echo -e "${RED}❌ Cannot connect to droplet. Please check:${NC}"
    echo "   1. SSH key is added: ssh-add ~/.ssh/id_rsa"
    echo "   2. Droplet IP is correct: $DROPLET_IP"
    echo "   3. Firewall allows SSH (port 22)"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection successful!${NC}"
echo ""

# Step 1: Initial Server Setup
echo -e "${YELLOW}Step 1: Setting up server (this may take 5-10 minutes)...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
set -e

echo "Updating system..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

echo "Installing Node.js 20..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs -qq
fi

echo "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 -q
fi

echo "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx -qq
fi

echo "Installing build tools..."
apt-get install -y git build-essential python3 postgresql-client -qq

echo "Configuring firewall..."
ufw allow 22/tcp > /dev/null 2>&1 || true
ufw allow 80/tcp > /dev/null 2>&1 || true
ufw allow 443/tcp > /dev/null 2>&1 || true
ufw --force enable > /dev/null 2>&1 || true

echo "Creating application user..."
if ! id -u appuser &>/dev/null; then
    useradd -m -s /bin/bash appuser
fi

echo "Creating directories..."
mkdir -p /var/www
mkdir -p /var/log/roomrental-api
mkdir -p /var/cache/nginx
chown -R appuser:appuser /var/www /var/log/roomrental-api
chown -R www-data:www-data /var/cache/nginx

echo "✅ Server setup complete!"
ENDSSH

echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""

# Step 2: Get GitHub repository URL
echo -e "${YELLOW}Step 2: Repository setup...${NC}"
echo "Please provide your GitHub repository URL:"
echo "Example: https://github.com/username/repo.git"
read -p "Repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${RED}❌ Repository URL is required!${NC}"
    exit 1
fi

# Step 3: Clone/Update Repository
echo -e "${YELLOW}Step 3: Setting up repository...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << ENDSSH
set -e

# Switch to appuser and clone/update repo
sudo -u appuser bash << 'APPUSER_SCRIPT'
cd /var/www

if [ -d "roomrental-api" ]; then
    echo "Repository exists, updating..."
    cd roomrental-api
    git fetch origin
    git reset --hard origin/main || git reset --hard origin/master
else
    echo "Cloning repository..."
    git clone $REPO_URL roomrental-api
    cd roomrental-api
fi

# Navigate to backend if it's in a subdirectory
if [ -d "backend-nestjs" ]; then
    cd backend-nestjs
fi

echo "✅ Repository ready!"
APPUSER_SCRIPT
ENDSSH

echo -e "${GREEN}✅ Repository setup complete!${NC}"
echo ""

# Step 4: Configure Environment
echo -e "${YELLOW}Step 4: Environment configuration...${NC}"
echo "We need to configure your .env file."
echo ""
echo "Please provide the following information:"
echo ""

read -p "Supabase Database URL (Connection Pooler): " DATABASE_URL
read -p "JWT Secret (press Enter to generate): " JWT_SECRET
read -p "Cloudinary Cloud Name: " CLOUDINARY_NAME
read -p "Cloudinary API Key: " CLOUDINARY_KEY
read -p "Cloudinary API Secret: " CLOUDINARY_SECRET
read -p "Frontend URL (for CORS): " FRONTEND_URL

# Generate JWT Secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated JWT Secret: $JWT_SECRET"
fi

# Create .env file
ssh $DROPLET_USER@$DROPLET_IP << ENDSSH
sudo -u appuser bash << 'APPUSER_SCRIPT'
cd /var/www/roomrental-api
if [ -d "backend-nestjs" ]; then
    cd backend-nestjs
fi

cat > .env << EOF
NODE_ENV=production
PORT=5000
FRONTEND_URL=$FRONTEND_URL
CORS_ORIGIN=$FRONTEND_URL

DATABASE_URL=$DATABASE_URL

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=$CLOUDINARY_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_SECRET

THROTTLE_TTL=60
THROTTLE_LIMIT=100
EOF

echo "✅ .env file created!"
APPUSER_SCRIPT
ENDSSH

echo -e "${GREEN}✅ Environment configured!${NC}"
echo ""

# Step 5: Deploy Application
echo -e "${YELLOW}Step 5: Deploying application...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER_SCRIPT'
cd /var/www/roomrental-api
if [ -d "backend-nestjs" ]; then
    cd backend-nestjs
fi

echo "Installing dependencies..."
npm ci --production=false

echo "Generating Prisma Client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Building application..."
npm run build

echo "Creating logs directory..."
mkdir -p logs

echo "✅ Application built!"
APPUSER_SCRIPT
ENDSSH

echo -e "${GREEN}✅ Application deployed!${NC}"
echo ""

# Step 6: Start with PM2
echo -e "${YELLOW}Step 6: Starting application with PM2...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
sudo -u appuser bash << 'APPUSER_SCRIPT'
cd /var/www/roomrental-api
if [ -d "backend-nestjs" ]; then
    cd backend-nestjs
fi

# Stop existing process if any
pm2 stop roomrental-api 2>/dev/null || true
pm2 delete roomrental-api 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup | grep -v "PM2" | bash || true

echo "✅ Application started with PM2!"
APPUSER_SCRIPT
ENDSSH

echo -e "${GREEN}✅ Application running!${NC}"
echo ""

# Step 7: Configure Nginx
echo -e "${YELLOW}Step 7: Configuring Nginx...${NC}"
ssh $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
# Copy Nginx config
if [ -f "/var/www/roomrental-api/backend-nestjs/nginx.conf" ]; then
    cp /var/www/roomrental-api/backend-nestjs/nginx.conf /etc/nginx/sites-available/roomrental-api
elif [ -f "/var/www/roomrental-api/nginx.conf" ]; then
    cp /var/www/roomrental-api/nginx.conf /etc/nginx/sites-available/roomrental-api
fi

# Update server_name to use IP if no domain
sed -i 's/server_name.*;/server_name 167.71.110.39;/' /etc/nginx/sites-available/roomrental-api

# Create symlink
ln -sf /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "✅ Nginx configured!"
ENDSSH

echo -e "${GREEN}✅ Nginx configured!${NC}"
echo ""

# Step 8: Test
echo -e "${YELLOW}Step 8: Testing deployment...${NC}"
sleep 3

HEALTH_CHECK=$(ssh $DROPLET_USER@$DROPLET_IP "curl -s http://localhost:5000/api/health || echo 'FAILED'")

if [[ $HEALTH_CHECK == *"FAILED"* ]] || [ -z "$HEALTH_CHECK" ]; then
    echo -e "${RED}⚠️  Health check failed. Checking logs...${NC}"
    ssh $DROPLET_USER@$DROPLET_IP "sudo -u appuser pm2 logs roomrental-api --lines 20 --nostream"
else
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo "Response: $HEALTH_CHECK"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Your API is available at:"
echo "  - http://167.71.110.39/api"
echo "  - http://167.71.110.39/api/health"
echo ""
echo "PM2 Status:"
ssh $DROPLET_USER@$DROPLET_IP "sudo -u appuser pm2 status"
echo ""
echo "Next steps:"
echo "  1. Test your API endpoints"
echo "  2. Configure domain DNS (if you have one)"
echo "  3. Setup SSL: sudo certbot --nginx -d your-domain.com"
echo "  4. Add GitHub Secrets for CI/CD (see GITHUB_CI_CD_SETUP.md)"








