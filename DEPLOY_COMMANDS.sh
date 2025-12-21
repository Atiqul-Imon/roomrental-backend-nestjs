#!/bin/bash

# RoomRentalUSA Backend Deployment Commands
# Droplet IP: 167.71.110.39

echo "🚀 RoomRentalUSA Backend Deployment"
echo "Droplet IP: 167.71.110.39"
echo ""

# Step 1: Test SSH Connection
echo "Step 1: Testing SSH connection..."
echo "Run this command from your local machine:"
echo ""
echo "ssh root@167.71.110.39"
echo ""
echo "Press Enter when connected..."
read

# Step 2: Initial Server Setup
echo "Step 2: Running initial server setup..."
echo "Copy and paste these commands on the droplet:"
echo ""
cat << 'EOF'
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git and build tools
sudo apt install -y git build-essential python3 postgresql-client

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create application user
sudo useradd -m -s /bin/bash appuser

# Create directories
sudo mkdir -p /var/www
sudo mkdir -p /var/log/roomrental-api
sudo chown appuser:appuser /var/www
sudo chown appuser:appuser /var/log/roomrental-api

# Create Nginx cache directory
sudo mkdir -p /var/cache/nginx
sudo chown -R www-data:www-data /var/cache/nginx

echo "✅ Server setup complete!"
EOF

echo ""
echo "Press Enter when Step 2 is complete..."
read

# Step 3: Clone Repository
echo "Step 3: Cloning repository..."
echo "Switch to appuser and clone:"
echo ""
cat << 'EOF'
# Switch to appuser
sudo su - appuser

# Navigate to /var/www
cd /var/www

# Clone repository (UPDATE WITH YOUR ACTUAL REPO URL)
git clone https://github.com/your-username/your-repo.git roomrental-api

# Navigate to backend
cd roomrental-api/backend-nestjs
EOF

echo ""
echo "⚠️  IMPORTANT: Update the git clone URL above with your actual repository!"
echo "Press Enter when ready..."
read

# Step 4: Configure Environment
echo "Step 4: Configure environment variables..."
echo ""
cat << 'EOF'
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
EOF

echo ""
echo "Configure these values in .env:"
echo "- DATABASE_URL (Supabase connection pooler)"
echo "- JWT_SECRET (generate with: openssl rand -base64 32)"
echo "- CLOUDINARY credentials"
echo "- CORS_ORIGIN (your frontend URL)"
echo ""
echo "Press Enter when .env is configured..."
read

# Step 5: Deploy
echo "Step 5: Deploying application..."
echo ""
cat << 'EOF'
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
EOF

echo ""
echo "Press Enter when deployment is complete..."
read

# Step 6: Configure Nginx
echo "Step 6: Configuring Nginx..."
echo ""
cat << 'EOF'
# Switch to root
sudo su

# Copy Nginx config
cp /var/www/roomrental-api/backend-nestjs/nginx.conf /etc/nginx/sites-available/roomrental-api

# Edit config (update server_name if you have a domain)
nano /etc/nginx/sites-available/roomrental-api

# Create symlink
ln -s /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
EOF

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test your API:"
echo "curl http://167.71.110.39/api/health"






