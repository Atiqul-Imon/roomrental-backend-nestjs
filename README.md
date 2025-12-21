# RoomRentalUSA Backend API

Production-ready NestJS backend API for RoomRentalUSA platform.

## 🚀 Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: JWT (Passport)
- **File Upload**: Cloudinary
- **Documentation**: Swagger
- **Process Manager**: PM2
- **Web Server**: Nginx

## 📋 Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL database (Supabase)
- Cloudinary account (for file uploads)
- Digital Ocean droplet (Ubuntu 22.04+)

## 🛠️ Local Development

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd backend-nestjs
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### 4. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000/api`

## 📦 Production Deployment

### Digital Ocean Setup

#### Step 1: Initial Server Setup

SSH into your Digital Ocean droplet and run:

```bash
# Download and run setup script
wget https://raw.githubusercontent.com/your-repo/backend-nestjs/main/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh
```

Or manually follow the steps in `setup-server.sh`.

#### Step 2: Clone Repository

```bash
# Switch to appuser
sudo su - appuser

# Clone repository
cd /var/www
git clone <your-repo-url> roomrental-api
cd roomrental-api/backend-nestjs
```

#### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your production values
nano .env
```

Required environment variables:
- `DATABASE_URL`: Supabase connection pooler URL
- `JWT_SECRET`: Strong secret key
- `CLOUDINARY_*`: Cloudinary credentials
- `CORS_ORIGIN`: Your frontend URL
- `NODE_ENV=production`

#### Step 4: Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

#### Step 5: Configure Nginx

```bash
# Switch to root
sudo su

# Copy Nginx configuration
cp nginx.conf /etc/nginx/sites-available/roomrental-api

# Edit configuration (update server_name)
nano /etc/nginx/sites-available/roomrental-api

# Create symlink
ln -s /etc/nginx/sites-available/roomrental-api /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

#### Step 6: Setup SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

Certbot will automatically configure HTTPS.

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs roomrental-api

# Restart application
pm2 restart roomrental-api

# Stop application
pm2 stop roomrental-api

# Monitor
pm2 monit
```

### Database Migrations

```bash
# Run migrations in production
npx prisma migrate deploy
```

## 🔒 Security Checklist

- [ ] Strong JWT_SECRET (use `openssl rand -base64 32`)
- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed
- [ ] Nginx rate limiting enabled
- [ ] Environment variables secured
- [ ] Database connection pooler used
- [ ] CORS properly configured
- [ ] Helmet security headers enabled

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:5000/api/health
```

### PM2 Monitoring

```bash
pm2 monit
```

### Logs

```bash
# Application logs
pm2 logs roomrental-api

# Nginx access logs
tail -f /var/log/nginx/roomrental-api-access.log

# Nginx error logs
tail -f /var/log/nginx/roomrental-api-error.log
```

## 🔄 Updates & Maintenance

### Update Application

```bash
cd /var/www/roomrental-api/backend-nestjs
git pull origin main
./deploy.sh
```

### Database Migrations

```bash
npx prisma migrate deploy
```

### Update Dependencies

```bash
npm update
npm audit fix
./deploy.sh
```

## 📝 API Documentation

When `NODE_ENV` is not `production`, Swagger documentation is available at:

```
http://your-domain.com/api-docs
```

## 🐳 Docker Deployment (Alternative)

If you prefer Docker:

```bash
# Build image
docker build -t roomrental-api .

# Run container
docker run -d \
  --name roomrental-api \
  -p 5000:5000 \
  --env-file .env \
  roomrental-api
```

## 🆘 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs roomrental-api

# Check if port is in use
sudo lsof -i :5000

# Restart PM2
pm2 restart all
```

### Database connection issues

```bash
# Test connection
psql $DATABASE_URL

# Check Prisma connection
npx prisma db pull
```

### Nginx errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [Nginx Documentation](https://nginx.org/en/docs)

## 📄 License

ISC






