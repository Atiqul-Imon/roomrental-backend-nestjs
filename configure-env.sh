#!/bin/bash

# Configure .env file on server

DROPLET_IP="167.71.110.39"

echo "⚙️  Configuring environment variables..."
echo ""

read -p "Supabase DATABASE_URL (Connection Pooler): " DB_URL
read -p "JWT Secret (Enter to generate): " JWT_SEC
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

echo "✅ .env file updated"
echo ""
echo "Restarting application..."
pm2 restart roomrental-api
APPUSER
ENDSSH

echo ""
echo "✅ Configuration complete!"
echo "Testing in 3 seconds..."
sleep 3

HEALTH=$(ssh root@$DROPLET_IP "curl -s http://localhost:5000/api/health 2>/dev/null")
if [ ! -z "$HEALTH" ] && [[ $HEALTH != *"error"* ]]; then
    echo "✅ Health check passed!"
    echo "Response: $HEALTH"
else
    echo "⚠️  Check logs: ssh root@167.71.110.39 'sudo -u appuser pm2 logs roomrental-api --lines 30'"
fi


















