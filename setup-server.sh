#!/bin/bash

# Digital Ocean Server Setup Script
# Run this script once on a fresh Ubuntu/Debian server

set -e

echo "🔧 Setting up Digital Ocean server for RoomRentalUSA Backend..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root (use sudo)${NC}"
   exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
echo -e "${YELLOW}📦 Installing Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"

# Install PM2 globally
echo -e "${YELLOW}📦 Installing PM2...${NC}"
npm install -g pm2

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
apt-get install -y nginx

# Install Git
echo -e "${YELLOW}📦 Installing Git...${NC}"
apt-get install -y git

# Install build essentials (for native modules)
echo -e "${YELLOW}📦 Installing build essentials...${NC}"
apt-get install -y build-essential python3

# Install PostgreSQL client (for database connections)
echo -e "${YELLOW}📦 Installing PostgreSQL client...${NC}"
apt-get install -y postgresql-client

# Install UFW firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5000/tcp  # Backend API (optional, if not using Nginx)

# Create application user
echo -e "${YELLOW}👤 Creating application user...${NC}"
if ! id -u appuser &>/dev/null; then
    useradd -m -s /bin/bash appuser
    echo -e "${GREEN}✓ User 'appuser' created${NC}"
else
    echo -e "${YELLOW}User 'appuser' already exists${NC}"
fi

# Create application directory
APP_DIR="/var/www/roomrental-api"
echo -e "${YELLOW}📁 Creating application directory...${NC}"
mkdir -p $APP_DIR
chown appuser:appuser $APP_DIR

# Create logs directory
echo -e "${YELLOW}📁 Creating logs directory...${NC}"
mkdir -p /var/log/roomrental-api
chown appuser:appuser /var/log/roomrental-api

# Create Nginx cache directory
echo -e "${YELLOW}📁 Creating Nginx cache directory...${NC}"
mkdir -p /var/cache/nginx
chown -R www-data:www-data /var/cache/nginx

# Setup Nginx
echo -e "${YELLOW}⚙️  Configuring Nginx...${NC}"
# Note: Copy nginx.conf manually or via deployment script
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo -e "${YELLOW}   1. Copy nginx.conf to /etc/nginx/sites-available/roomrental-api${NC}"
echo -e "${YELLOW}   2. Update server_name in nginx.conf${NC}"
echo -e "${YELLOW}   3. Create symlink: ln -s /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/${NC}"
echo -e "${YELLOW}   4. Test: nginx -t${NC}"
echo -e "${YELLOW}   5. Reload: systemctl reload nginx${NC}"

# Install Certbot for SSL (Let's Encrypt)
echo -e "${YELLOW}🔒 Installing Certbot for SSL...${NC}"
apt-get install -y certbot python3-certbot-nginx

# Setup log rotation
echo -e "${YELLOW}📋 Setting up log rotation...${NC}"
cat > /etc/logrotate.d/roomrental-api << EOF
/var/log/roomrental-api/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Setup automatic security updates
echo -e "${YELLOW}🔒 Setting up automatic security updates...${NC}"
apt-get install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

echo -e "${GREEN}✅ Server setup completed!${NC}"
echo -e "${GREEN}📝 Next steps:${NC}"
echo -e "${GREEN}   1. Clone your repository to $APP_DIR${NC}"
echo -e "${GREEN}   2. Copy .env.example to .env and configure${NC}"
echo -e "${GREEN}   3. Run deployment script: ./deploy.sh${NC}"
echo -e "${GREEN}   4. Configure Nginx (see instructions above)${NC}"
echo -e "${GREEN}   5. Setup SSL: certbot --nginx -d your-domain.com${NC}"



















