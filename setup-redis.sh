#!/bin/bash

# Redis Setup Script for DigitalOcean Droplet
# This script installs and configures Redis for the RoomRentalUSA backend

set -e

echo "🔴 Starting Redis setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Redis
echo "📦 Installing Redis..."
sudo apt install -y redis-server

# Configure Redis
echo "⚙️  Configuring Redis..."

# Backup original config
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configure Redis for production
sudo sed -i 's/^bind 127.0.0.1/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# Enable Redis persistence
sudo sed -i 's/^save 900 1/save 900 1/' /etc/redis/redis.conf
sudo sed -i 's/^save 300 10/save 300 10/' /etc/redis/redis.conf
sudo sed -i 's/^save 60 10000/save 60 10000/' /etc/redis/redis.conf

# Set password (optional - uncomment if needed)
# REDIS_PASSWORD=$(openssl rand -base64 32)
# sudo sed -i "s/^# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
# echo "Redis password: $REDIS_PASSWORD" | sudo tee /root/redis-password.txt

# Start and enable Redis
echo "🚀 Starting Redis service..."
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
echo "🧪 Testing Redis connection..."
redis-cli ping

if [ $? -eq 0 ]; then
    echo "✅ Redis is running successfully!"
else
    echo "❌ Redis failed to start. Check logs: sudo journalctl -u redis-server"
    exit 1
fi

# Show Redis status
echo "📊 Redis Status:"
sudo systemctl status redis-server --no-pager | head -10

# Show Redis info
echo "📊 Redis Info:"
redis-cli info server | grep -E "redis_version|used_memory_human|connected_clients"

echo ""
echo "✅ Redis setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Add REDIS_HOST and REDIS_PORT to your .env file"
echo "2. If you set a password, add REDIS_PASSWORD to .env"
echo "3. Restart your NestJS application"
echo ""
echo "🔍 Useful commands:"
echo "  - Check Redis status: sudo systemctl status redis-server"
echo "  - View Redis logs: sudo journalctl -u redis-server -f"
echo "  - Connect to Redis CLI: redis-cli"
echo "  - Monitor Redis: redis-cli monitor"
echo "  - Get Redis info: redis-cli info"











