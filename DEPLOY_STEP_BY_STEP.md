# 🚀 Deployment Steps for Droplet: 167.71.110.39

## Your Droplet Info:
- **Name**: roomrental-usa-backend
- **Public IP**: 167.71.110.39
- **Private IP**: 10.108.0.4
- **Location**: NYC3
- **Specs**: 2 GB RAM, 1 AMD vCPU, 50 GB NVMe SSD

---

## Step 1: Connect to Your Droplet

From your local Ubuntu machine:

```bash
ssh root@167.71.110.39
```

If it connects successfully, you're ready! ✅

---

## Step 2: Initial Server Setup

Once connected, run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js
node -v  # Should show v20.x.x
npm -v

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
```

**This will take 5-10 minutes.** ⏱️

---

## Step 3: Clone Your Repository

```bash
# Switch to appuser
sudo su - appuser

# Navigate to /var/www
cd /var/www

# Clone your repository
# ⚠️ REPLACE WITH YOUR ACTUAL GITHUB REPO URL
git clone https://github.com/your-username/your-repo.git roomrental-api

# Navigate to backend
cd roomrental-api/backend-nestjs
```

**⚠️ Important**: If you haven't pushed your code to GitHub yet, we need to do that first!

---

## Step 4: Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

**Required values to configure:**

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Supabase Connection Pooler (Session Mode)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true

# Generate JWT Secret (run: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-here
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## Step 5: Deploy Application

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

This will:
- ✅ Install dependencies
- ✅ Generate Prisma Client
- ✅ Run database migrations
- ✅ Build the application
- ✅ Start with PM2

**Check status:**
```bash
pm2 status
pm2 logs roomrental-api
```

---

## Step 6: Configure Nginx

```bash
# Switch to root
sudo su

# Copy Nginx config
cp /var/www/roomrental-api/backend-nestjs/nginx.conf /etc/nginx/sites-available/roomrental-api

# Edit config
nano /etc/nginx/sites-available/roomrental-api
```

**Update the `server_name` line:**
```nginx
# If you have a domain:
server_name your-domain.com api.your-domain.com;

# OR if no domain yet, use IP:
server_name 167.71.110.39;
```

**Enable site:**
```bash
# Create symlink
ln -s /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx
```

---

## Step 7: Test Your API

```bash
# Health check (direct)
curl http://localhost:5000/api/health

# Health check (through Nginx)
curl http://167.71.110.39/api/health
```

You should see a JSON response! ✅

---

## Step 8: Setup SSL (If you have a domain)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

---

## 📊 Useful Commands

```bash
# PM2 Management
pm2 status
pm2 logs roomrental-api
pm2 restart roomrental-api
pm2 monit

# Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/roomrental-api-access.log
sudo tail -f /var/log/nginx/roomrental-api-error.log

# Application logs
pm2 logs roomrental-api --lines 100
```

---

## 🆘 Troubleshooting

### Can't connect via SSH?
```bash
# Check SSH key
ssh-add -l

# Try verbose
ssh -v root@167.71.110.39
```

### Application won't start?
```bash
# Check logs
pm2 logs roomrental-api --lines 100

# Check if port is in use
sudo lsof -i :5000

# Check environment
cat .env
```

### Nginx errors?
```bash
# Test config
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

---

## ✅ Next Steps

1. **Test all API endpoints**
2. **Configure domain DNS** (if you have one)
3. **Setup SSL certificate**
4. **Monitor performance** with PM2
5. **Setup backups** (optional)

---

**Your API will be available at:**
- `http://167.71.110.39/api` (HTTP)
- `https://your-domain.com/api` (HTTPS, after SSL setup)

**Ready to start? Begin with Step 1!** 🚀


























