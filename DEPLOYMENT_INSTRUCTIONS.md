# 🚀 Phase 2 Deployment Instructions

## ✅ Code Pushed to GitHub

The Phase 2 code has been successfully pushed to GitHub. CI/CD will automatically deploy it.

---

## 📋 Manual Steps Required on Server

### Step 1: Install Redis

SSH into your DigitalOcean droplet:
```bash
ssh root@167.71.110.39
```

Install Redis:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

### Step 2: Find Application Directory

The CI/CD deployment will handle pulling the code. Find where it's deployed:
```bash
# Check PM2 for app location
sudo -u appuser pm2 info roomrental-api | grep "script path"

# Or find the directory
find /var/www -name "backend-nestjs" -type d
find /home -name "backend-nestjs" -type d
```

### Step 3: Add Redis Configuration

Once you find the app directory, add Redis config to `.env`:
```bash
cd /path/to/backend-nestjs
nano .env

# Add these lines:
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 4: Restart Application

After CI/CD deployment completes:
```bash
# Restart PM2
sudo -u appuser pm2 restart roomrental-api

# Check logs
sudo -u appuser pm2 logs roomrental-api --lines 50
# Look for: "✅ Redis connected successfully"
```

---

## 🔍 Verification

### 1. Check CI/CD Status
Visit: https://github.com/Atiqul-Imon/roomrental-backend-nestjs/actions
- Check latest workflow run
- Verify it completed successfully

### 2. Verify Redis
```bash
ssh root@167.71.110.39
redis-cli ping
# Should return: PONG

sudo systemctl status redis-server
# Should show: active (running)
```

### 3. Verify Application
```bash
# Check logs for Redis connection
sudo -u appuser pm2 logs roomrental-api | grep -i redis

# Test API
curl -I https://roomrentalapi.pixelforgebd.com/api/health
```

### 4. Test Caching
```bash
# First request (cache miss)
curl https://roomrentalapi.pixelforgebd.com/api/listings

# Second request (cache hit - should be faster)
curl https://roomrentalapi.pixelforgebd.com/api/listings

# Check Redis for cached data
redis-cli
KEYS listing:*
KEYS listings:*
```

---

## 📊 Expected Results

After successful deployment:
- ✅ Redis running and accessible
- ✅ Application connected to Redis
- ✅ Cache hits in application logs
- ✅ Faster API responses
- ✅ Reduced database queries

---

## 🛠️ Troubleshooting

### Redis Not Installing:
```bash
sudo apt update
sudo apt install -y redis-server
sudo systemctl start redis-server
```

### Application Can't Connect:
1. Check `.env` has Redis config
2. Check Redis is running: `sudo systemctl status redis-server`
3. Check application logs: `sudo -u appuser pm2 logs roomrental-api`

### CI/CD Not Deploying:
1. Check GitHub Actions: https://github.com/Atiqul-Imon/roomrental-backend-nestjs/actions
2. Check for errors in workflow
3. Verify SSH keys are set up correctly

---

**Status:** Code pushed, waiting for CI/CD deployment  
**Next:** Install Redis on server and verify deployment




