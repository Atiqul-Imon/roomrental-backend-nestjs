# 🚀 Digital Ocean Deployment Guide

Complete step-by-step guide for deploying RoomRentalUSA Backend to Digital Ocean.

## Prerequisites

- Digital Ocean account
- Droplet created (Ubuntu 22.04 LTS recommended)
- Domain name (optional but recommended)
- SSH access to droplet
- GitHub repository (or Git access)

## Step 1: Initial Server Setup

### 1.1 Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 1.2 Run Setup Script

```bash
# Download setup script
wget https://raw.githubusercontent.com/your-repo/backend-nestjs/main/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh
```

**OR** manually install:

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

# Install Git
sudo apt install -y git

# Install build tools
sudo apt install -y build-essential python3

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Create application user
sudo useradd -m -s /bin/bash appuser
```

## Step 2: Clone Repository

```bash
# Switch to appuser
sudo su - appuser

# Create application directory
mkdir -p /var/www
cd /var/www

# Clone your repository
git clone https://github.com/your-username/your-repo.git roomrental-api
cd roomrental-api/backend-nestjs
```

**OR** if repository is in a subdirectory:

```bash
cd /var/www/roomrental-api
# Navigate to backend-nestjs folder
cd backend-nestjs
```

## Step 3: Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

### Required Environment Variables:

```env
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Database (Supabase Connection Pooler)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
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

## Step 4: Deploy Application

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
1. Install dependencies
2. Generate Prisma Client
3. Run database migrations
4. Build the application
5. Start with PM2

## Step 5: Configure Nginx

### 5.1 Copy Nginx Configuration

```bash
# Switch to root
sudo su

# Copy configuration
cp /var/www/roomrental-api/backend-nestjs/nginx.conf /etc/nginx/sites-available/roomrental-api

# Edit configuration
nano /etc/nginx/sites-available/roomrental-api
```

### 5.2 Update Configuration

Update the `server_name` line:
```nginx
server_name your-domain.com api.your-domain.com;
```

### 5.3 Enable Site

```bash
# Create symlink
ln -s /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## Step 6: Setup SSL Certificate

### 6.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtain Certificate

```bash
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

Follow the prompts. Certbot will:
- Automatically configure HTTPS
- Set up auto-renewal
- Redirect HTTP to HTTPS

### 6.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

## Step 7: Verify Deployment

### 7.1 Check Application Status

```bash
# As appuser
pm2 status
pm2 logs roomrental-api
```

### 7.2 Test API Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Through Nginx
curl https://your-domain.com/api/health
```

### 7.3 Check Nginx

```bash
# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/roomrental-api-access.log
sudo tail -f /var/log/nginx/roomrental-api-error.log
```

## Step 8: Configure Domain DNS

If using a domain:

1. **A Record**: Point to your droplet IP
   ```
   your-domain.com → YOUR_DROPLET_IP
   ```

2. **A Record** (optional): API subdomain
   ```
   api.your-domain.com → YOUR_DROPLET_IP
   ```

3. Wait for DNS propagation (5-60 minutes)

## Maintenance

### Update Application

```bash
cd /var/www/roomrental-api/backend-nestjs
git pull origin main
./deploy.sh
```

### View Logs

```bash
# Application logs
pm2 logs roomrental-api

# Nginx logs
sudo tail -f /var/log/nginx/roomrental-api-access.log
```

### Restart Services

```bash
# Restart application
pm2 restart roomrental-api

# Restart Nginx
sudo systemctl restart nginx
```

### Database Migrations

```bash
cd /var/www/roomrental-api/backend-nestjs
npx prisma migrate deploy
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs roomrental-api --lines 100

# Check if port is in use
sudo lsof -i :5000

# Check environment variables
cat .env
```

### Nginx Errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check if Nginx is running
sudo systemctl status nginx
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check Prisma
cd /var/www/roomrental-api/backend-nestjs
npx prisma db pull
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R appuser:appuser /var/www/roomrental-api
sudo chown -R appuser:appuser /var/log/roomrental-api
```

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] Strong JWT_SECRET
- [ ] SSL certificate installed
- [ ] Nginx rate limiting enabled
- [ ] Environment variables secured
- [ ] Database connection pooler used
- [ ] CORS properly configured
- [ ] Regular security updates enabled
- [ ] SSH key authentication (disable password)
- [ ] Fail2ban installed (optional)

## Monitoring

### PM2 Monitoring

```bash
pm2 monit
```

### Setup Monitoring Alerts

Consider using:
- Digital Ocean Monitoring
- PM2 Plus
- Uptime monitoring services

## Backup Strategy

### Database Backups

```bash
# Backup script (add to crontab)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Application Backups

```bash
# Backup application directory
tar -czf backup_$(date +%Y%m%d).tar.gz /var/www/roomrental-api
```

## Next Steps

1. ✅ Setup CI/CD with GitHub Actions
2. ✅ Configure monitoring and alerts
3. ✅ Setup automated backups
4. ✅ Configure CDN (if needed)
5. ✅ Setup staging environment

## Support

For issues or questions:
- Check logs: `pm2 logs roomrental-api`
- Review Nginx logs: `/var/log/nginx/`
- Check system resources: `htop` or `df -h`







