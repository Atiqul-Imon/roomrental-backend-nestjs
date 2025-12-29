# ✅ Deployment Checklist

Use this checklist to ensure everything is properly configured.

## Pre-Deployment

- [ ] All code committed to GitHub
- [ ] `.env.example` updated with all required variables
- [ ] Database migrations tested locally
- [ ] API endpoints tested locally
- [ ] Environment variables documented

## Server Setup

- [ ] Digital Ocean droplet created
- [ ] SSH key added to droplet
- [ ] `setup-server.sh` executed successfully
- [ ] Node.js 20+ installed
- [ ] PM2 installed globally
- [ ] Nginx installed
- [ ] Firewall configured (UFW)

## Application Deployment

- [ ] Repository cloned to `/var/www/roomrental-api`
- [ ] `.env` file created and configured
- [ ] Database connection tested
- [ ] Prisma migrations run successfully
- [ ] Application builds without errors
- [ ] PM2 process running
- [ ] Application accessible on port 5000

## Nginx Configuration

- [ ] `nginx.conf` copied to `/etc/nginx/sites-available/`
- [ ] `server_name` updated in nginx.conf
- [ ] Symlink created in `/etc/nginx/sites-enabled/`
- [ ] Nginx configuration tested (`nginx -t`)
- [ ] Nginx reloaded successfully
- [ ] API accessible through Nginx

## SSL/HTTPS

- [ ] Domain DNS configured
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS redirect working
- [ ] Auto-renewal configured

## Security

- [ ] Strong JWT_SECRET generated
- [ ] Environment variables secured
- [ ] Firewall rules configured
- [ ] SSH password authentication disabled (optional)
- [ ] Rate limiting enabled in Nginx
- [ ] CORS properly configured

## Monitoring

- [ ] PM2 monitoring working
- [ ] Logs accessible
- [ ] Health check endpoint working
- [ ] Error tracking configured (optional)

## Testing

- [ ] Health endpoint: `curl https://your-domain.com/api/health`
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] File uploads working (Cloudinary)
- [ ] Authentication working

## Post-Deployment

- [ ] Documentation updated
- [ ] Team notified
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place


















