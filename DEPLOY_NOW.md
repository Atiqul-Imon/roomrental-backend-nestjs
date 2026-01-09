# 🚀 Deploy Now - Step by Step

## ✅ What You've Selected:
- **Plan**: $14/month Premium AMD
- **Specs**: 2 GB RAM, 1 AMD CPU, 50 GB NVMe SSD
- **SSH Key**: prokrishi-backend (already configured)

## 📋 Deployment Steps

### Step 1: Get Your Droplet IP

After creating the droplet, Digital Ocean will show you:
- **Public IP Address** (e.g., `157.230.123.45`)
- **Private IP Address** (e.g., `10.0.0.5`)

**Save the Public IP** - you'll need it!

### Step 2: Test SSH Connection

From your local Ubuntu machine:

```bash
# Test connection (replace with your droplet IP)
ssh root@YOUR_DROPLET_IP

# If it asks for password, your SSH key might not be working
# If it connects without password, you're good! ✅
```

### Step 3: Run Initial Server Setup

Once connected to the droplet:

```bash
# Download and run setup script
wget https://raw.githubusercontent.com/your-repo/backend-nestjs/main/setup-server.sh
# OR if you haven't pushed to GitHub yet, we'll do it manually

# Make executable
chmod +x setup-server.sh

# Run setup (this will take 5-10 minutes)
sudo ./setup-server.sh
```

**OR** if you haven't pushed to GitHub, run these commands manually:

```bash
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
```

### Step 4: Clone Your Repository

```bash
# Switch to appuser
sudo su - appuser

# Create application directory
mkdir -p /var/www
cd /var/www

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/your-username/your-repo.git roomrental-api

# Navigate to backend
cd roomrental-api/backend-nestjs
```

**If you haven't pushed to GitHub yet:**
```bash
# We'll need to push your code first
# See "Push to GitHub" section below
```

### Step 5: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

**Required values:**
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true

JWT_SECRET=your-generated-secret-here
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

### Step 6: Deploy Application

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

This will:
- Install dependencies
- Generate Prisma Client
- Run migrations
- Build application
- Start with PM2

### Step 7: Configure Nginx

```bash
# Switch to root
sudo su

# Copy Nginx config
cp /var/www/roomrental-api/backend-nestjs/nginx.conf /etc/nginx/sites-available/roomrental-api

# Edit config (update server_name)
nano /etc/nginx/sites-available/roomrental-api
```

**Update this line:**
```nginx
server_name your-domain.com api.your-domain.com;
# OR if no domain yet:
server_name YOUR_DROPLET_IP;
```

**Enable site:**
```bash
# Create symlink
ln -s /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/

# Remove default (optional)
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Step 8: Test Your API

```bash
# Health check
curl http://localhost:5000/api/health

# Through Nginx
curl http://YOUR_DROPLET_IP/api/health
```

### Step 9: Setup SSL (If you have a domain)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

## 🔄 If You Haven't Pushed to GitHub Yet

### Push Your Code First:

```bash
# On your local machine
cd "/home/atiqul-islam/roomrental Main/backend-nestjs"

# Initialize git if needed
git init
git add .
git commit -m "Production deployment setup"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/your-username/your-repo.git

# Push
git push -u origin main
```

## 📝 Quick Commands Reference

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs roomrental-api

# Restart application
pm2 restart roomrental-api

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/roomrental-api-access.log
```

## 🆘 Troubleshooting

### Can't connect via SSH?
```bash
# Check if SSH key is added
ssh-add -l

# Try with verbose output
ssh -v root@YOUR_DROPLET_IP
```

### Application won't start?
```bash
# Check PM2 logs
pm2 logs roomrental-api --lines 100

# Check if port is in use
sudo lsof -i :5000
```

### Nginx errors?
```bash
# Test config
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🎯 Next Steps After Droplet Creation:

1. **Get your droplet IP** from Digital Ocean dashboard
2. **Share the IP with me** and I'll help you deploy step by step
3. **OR follow the steps above** if you want to do it yourself

**Ready when you are!** 🚀






























