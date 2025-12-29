# 🚀 Quick Start - Digital Ocean Deployment

## Pre-Deployment Checklist

- [ ] Digital Ocean droplet created (Ubuntu 22.04+)
- [ ] SSH access to droplet
- [ ] Domain name configured (optional)
- [ ] Supabase database ready
- [ ] Cloudinary account ready
- [ ] GitHub repository ready

## Quick Deployment Steps

### 1. On Your Local Machine

```bash
# Commit and push to GitHub
cd backend-nestjs
git add .
git commit -m "Production deployment setup"
git push origin main
```

### 2. On Digital Ocean Droplet

```bash
# Connect to droplet
ssh root@YOUR_DROPLET_IP

# Run setup script
wget https://raw.githubusercontent.com/your-repo/backend-nestjs/main/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh

# Switch to appuser
sudo su - appuser

# Clone repository
cd /var/www
git clone https://github.com/your-username/your-repo.git roomrental-api
cd roomrental-api/backend-nestjs

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Deploy
chmod +x deploy.sh
./deploy.sh
```

### 3. Configure Nginx

```bash
# As root
sudo cp /var/www/roomrental-api/backend-nestjs/nginx.conf /etc/nginx/sites-available/roomrental-api
sudo nano /etc/nginx/sites-available/roomrental-api  # Update server_name
sudo ln -s /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Setup SSL

```bash
sudo certbot --nginx -d your-domain.com
```

## Environment Variables Template

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true

JWT_SECRET=generate-with: openssl rand -base64 32

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Useful Commands

```bash
# PM2 Management
pm2 status
pm2 logs roomrental-api
pm2 restart roomrental-api

# Update Application
cd /var/www/roomrental-api/backend-nestjs
git pull
./deploy.sh

# Check Logs
pm2 logs roomrental-api
sudo tail -f /var/log/nginx/roomrental-api-access.log
```

## Need Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions.


















