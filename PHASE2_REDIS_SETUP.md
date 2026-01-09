# 🔴 Phase 2: Redis Database Query Caching - Setup Guide

## 📋 Overview

Phase 2 implements Redis for database query result caching, reducing database load by up to 60% and improving API response times.

---

## ✅ What's Been Implemented

### 1. **Redis Cache Service**
- ✅ Created `CacheService` with full Redis integration
- ✅ Automatic connection handling with retry logic
- ✅ Graceful fallback if Redis is unavailable
- ✅ Cache operations: get, set, delete, pattern matching
- ✅ `getOrSet` helper for easy caching

### 2. **Listings Service Caching**
- ✅ `findAll()` - 5 minute cache
- ✅ `findOne()` - 2 minute cache
- ✅ `findMyListings()` - 5 minute cache
- ✅ Cache invalidation on create/update/delete

### 3. **Profile & User Service Caching**
- ✅ `getProfile()` - 10 minute cache
- ✅ `getUser()` - 10 minute cache
- ✅ `getUserProfile()` - 10 minute cache
- ✅ Cache invalidation on profile updates

---

## 🚀 Deployment Steps

### Step 1: Install Redis on DigitalOcean Droplet

SSH into your droplet:
```bash
ssh root@167.71.110.39
```

Run the setup script:
```bash
cd /var/www/roomrental-api/backend-nestjs
chmod +x setup-redis.sh
sudo ./setup-redis.sh
```

Or install manually:
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

# Test
redis-cli ping
# Should return: PONG
```

### Step 2: Update Environment Variables

Add to `/var/www/roomrental-api/backend-nestjs/.env`:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-password-if-set
```

### Step 3: Install Dependencies

```bash
cd /var/www/roomrental-api/backend-nestjs
npm install --legacy-peer-deps
```

### Step 4: Build and Restart

```bash
npm run build
sudo -u appuser pm2 restart roomrental-api
```

---

## 🧪 Testing

### Test Redis Connection:
```bash
# On server
redis-cli ping
# Should return: PONG

# Check Redis status
sudo systemctl status redis-server

# Monitor Redis
redis-cli monitor
```

### Test Cache in Application:
```bash
# Check application logs
sudo -u appuser pm2 logs roomrental-api

# Look for:
# "✅ Redis connected successfully"
# "Cache HIT: listing:xxx"
# "Cache MISS: listing:xxx"
```

### Test API Endpoints:
```bash
# First request (cache miss)
curl https://roomrentalapi.pixelforgebd.com/api/listings

# Second request (cache hit - should be faster)
curl https://roomrentalapi.pixelforgebd.com/api/listings
```

---

## 📊 Cache Strategy

### Cache TTLs:
- **Listings List:** 5 minutes (300 seconds)
- **Listing Detail:** 2 minutes (120 seconds)
- **User Profile:** 10 minutes (600 seconds)
- **My Listings:** 5 minutes (300 seconds)

### Cache Keys:
- `listings:{searchParams}` - Listings search results
- `listing:{id}` - Single listing
- `my-listings:{userId}:{status}:{page}:{limit}` - User's listings
- `profile:{userId}` - User profile
- `user:{userId}` - User data
- `user-profile:{userId}` - Full user profile with listings/reviews

### Cache Invalidation:
- **On Listing Create:** Invalidates `listings:*`
- **On Listing Update:** Invalidates `listing:{id}` and `listings:*`
- **On Listing Delete:** Invalidates `listing:{id}` and `listings:*`
- **On Profile Update:** Invalidates `profile:{userId}`, `user:{userId}`, `user-profile:{userId}*`

---

## 🔍 Monitoring

### Check Cache Hit Rate:
```bash
# Connect to Redis
redis-cli

# Get cache stats
INFO stats

# Check memory usage
INFO memory

# List all keys (be careful in production)
KEYS *

# Count keys by pattern
KEYS listing:* | wc -l
KEYS listings:* | wc -l
```

### Application Logs:
The `CacheService` logs cache hits and misses:
- `Cache HIT: {key}` - Data retrieved from cache
- `Cache MISS: {key}` - Data fetched from database

---

## ⚙️ Configuration

### Redis Configuration (`/etc/redis/redis.conf`):
```conf
# Memory limit
maxmemory 256mb

# Eviction policy
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
```

### Environment Variables:
```env
REDIS_HOST=localhost        # Redis host
REDIS_PORT=6379            # Redis port
REDIS_PASSWORD=            # Optional password
```

---

## 🛠️ Troubleshooting

### Redis Not Connecting:
1. Check Redis is running:
   ```bash
   sudo systemctl status redis-server
   ```

2. Check Redis logs:
   ```bash
   sudo journalctl -u redis-server -f
   ```

3. Test connection:
   ```bash
   redis-cli ping
   ```

### Application Can't Connect:
1. Check environment variables in `.env`
2. Check application logs:
   ```bash
   sudo -u appuser pm2 logs roomrental-api
   ```

3. Verify Redis is accessible:
   ```bash
   redis-cli -h localhost -p 6379 ping
   ```

### Cache Not Working:
1. Check if Redis is connected in logs
2. Verify cache keys are being set:
   ```bash
   redis-cli KEYS "*"
   ```

3. Check cache TTL:
   ```bash
   redis-cli TTL "listing:xxx"
   ```

---

## 📈 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Database Queries | 100% | 30-40% | **60% reduction** |
| API Response (cached) | 200-500ms | 50-100ms | **75% faster** |
| Database Load | High | Medium | **50% reduction** |
| Cache Hit Rate | 0% | 60-80% | **New capability** |

---

## ✅ Verification Checklist

- [ ] Redis installed and running
- [ ] Redis accessible on localhost:6379
- [ ] Environment variables set in `.env`
- [ ] Application builds successfully
- [ ] Application connects to Redis (check logs)
- [ ] Cache hits visible in logs
- [ ] API responses faster on second request
- [ ] Cache invalidation works on updates

---

## 🔄 Next Steps

After Phase 2 is deployed and tested:

1. **Monitor Performance:**
   - Track cache hit rates
   - Monitor database query reduction
   - Measure API response times

2. **Optimize:**
   - Adjust cache TTLs based on usage
   - Add caching to more endpoints
   - Implement cache warming

3. **Phase 3:**
   - Service worker for offline support
   - Advanced cache monitoring
   - Multi-region caching

---

**Setup Date:** December 19, 2025  
**Status:** ✅ Ready for Deployment






























