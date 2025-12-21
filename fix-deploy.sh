#!/bin/bash

# Fixed Deployment Script
# Handles private repository and permissions properly

DROPLET_IP="167.71.110.39"
REPO_URL="https://github.com/Atiqul-Imon/roomrental-backend-nestjs.git"

echo "🔧 Fixing deployment issues..."

# Step 1: Clone repository properly
echo "📥 Cloning repository..."
ssh root@$DROPLET_IP << ENDSSH
# Ensure appuser can access /var/www
chown -R appuser:appuser /var/www

# Clone as appuser
sudo -u appuser bash << 'APPUSER'
cd /var/www
if [ -d "roomrental-api" ]; then
    echo "Removing old directory..."
    rm -rf roomrental-api
fi

# Try cloning - if it fails, we'll use a different method
if ! git clone $REPO_URL roomrental-api 2>&1; then
    echo "⚠️  Clone failed - repository may be private"
    echo "Please ensure:"
    echo "  1. Repository is public, OR"
    echo "  2. SSH key is added to GitHub, OR"
    echo "  3. Use personal access token"
    exit 1
fi

cd roomrental-api
echo "✅ Repository cloned successfully"
pwd
ls -la
APPUSER
ENDSSH

echo ""
echo "✅ Repository setup complete!"
echo ""
echo "Next: We need to configure .env file"
echo "Run the environment setup manually or provide credentials"




