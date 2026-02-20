# Docker Deployment Migration Guide

## Overview

This guide documents the migration from **PM2** to **Docker** for the RoomRental backend API deployment.

## Why Docker?

### Benefits over PM2:
1. **Consistency**: Same environment across dev, staging, and production
2. **Isolation**: Containerized environment prevents conflicts
3. **Easy Rollback**: Quick rollback to previous image versions
4. **Resource Management**: Better control over CPU/memory limits
5. **Scalability**: Easy horizontal scaling with Docker Swarm/Kubernetes
6. **Zero Downtime**: Rolling updates with health checks
7. **Simplified CI/CD**: Build once, deploy anywhere
8. **Built-in Health Checks**: Automatic container restart on failure

### Previous Setup (PM2):
- ❌ Manual dependency installation on server
- ❌ Direct file system access required
- ❌ Process management complexity
- ❌ Difficult rollback process
- ❌ Environment-specific issues

### New Setup (Docker):
- ✅ Self-contained image with all dependencies
- ✅ Immutable deployments
- ✅ Simple process management
- ✅ One-command rollback
- ✅ Consistent across environments

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          Digital Ocean Droplet              │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │     Docker Container                  │ │
│  │                                       │ │
│  │  ┌─────────────────────────────────┐ │ │
│  │  │   NestJS Application            │ │ │
│  │  │   (Port 5000)                   │ │ │
│  │  │                                 │ │ │
│  │  │  • Auto-restart on failure     │ │ │
│  │  │  • Health checks every 30s     │ │ │
│  │  │  • Structured logging          │ │ │
│  │  └─────────────────────────────────┘ │ │
│  │                                       │ │
│  │  Volumes: ./logs -> /app/logs         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  External Services:                         │
│  • PostgreSQL Database                      │
│  • AWS S3 (File Storage)                    │
│  • Redis (Caching)                          │
└─────────────────────────────────────────────┘
```

---

## Files Structure

```
backend-nestjs/
├── Dockerfile                    # Multi-stage Docker build
├── .dockerignore                # Files to exclude from image
├── docker-compose.yml           # Local development compose
├── docker-compose.prod.yml      # Production compose (simpler)
├── .github/workflows/
│   ├── deploy.yml              # OLD: PM2 deployment (can be deleted)
│   └── deploy-docker.yml       # NEW: Docker deployment
└── scripts/
    ├── docker-local.sh         # Local Docker helper
    └── docker-manual-deploy.sh # Manual deployment script
```

---

## Deployment Workflow

### 1. **GitHub Actions CI/CD** (Automatic)

When you push to `main` branch:

```bash
git add .
git commit -m "your changes"
git push origin main
```

The CI/CD will automatically:
1. ✅ Pull latest code on server
2. ✅ Build Docker image
3. ✅ Run database migrations in container
4. ✅ Stop old container gracefully
5. ✅ Start new container
6. ✅ Run health checks
7. ✅ Report success/failure

**Check deployment logs:**
- GitHub Actions: https://github.com/your-username/roomrental/actions

### 2. **Manual Deployment** (If needed)

SSH into the server:
```bash
ssh root@167.71.110.39
cd /var/www/roomrental-api

# Pull latest code
git pull origin main

# Build and deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker ps
docker logs -f roomrental-api
```

---

## Docker Commands Reference

### Container Management

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs (live)
docker logs -f roomrental-api

# View last 100 lines of logs
docker logs --tail 100 roomrental-api

# Stop container
docker-compose -f docker-compose.prod.yml down

# Start container
docker-compose -f docker-compose.prod.yml up -d

# Restart container
docker-compose -f docker-compose.prod.yml restart

# Execute command in running container
docker exec -it roomrental-api sh

# View container resource usage
docker stats roomrental-api
```

### Image Management

```bash
# List images
docker images

# Remove unused images
docker image prune -f

# Remove specific image
docker rmi roomrental-api:latest

# View image history
docker history roomrental-api:latest
```

### Health Checks

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' roomrental-api

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' roomrental-api

# Manual health check
curl http://localhost:5000/api/health
```

### Troubleshooting

```bash
# View container details
docker inspect roomrental-api

# Access container shell
docker exec -it roomrental-api sh

# Check container processes
docker top roomrental-api

# View resource usage
docker stats --no-stream roomrental-api

# Copy files from container
docker cp roomrental-api:/app/logs ./local-logs
```

---

## Rollback Strategy

### Quick Rollback (Previous Deployment)

```bash
# On server
cd /var/www/roomrental-api

# Stop current container
docker-compose -f docker-compose.prod.yml down

# Checkout previous commit
git log --oneline -n 5  # Find the commit to rollback to
git reset --hard <commit-hash>

# Rebuild and start
docker-compose -f docker-compose.prod.yml up -d --build

# Verify
docker logs -f roomrental-api
curl http://localhost:5000/api/health
```

### Rollback to Specific Version

```bash
# Tag images with version numbers
docker tag roomrental-api:latest roomrental-api:v1.2.3

# Rollback by using specific version
docker run -d --name roomrental-api \
  --env-file .env \
  -p 5000:5000 \
  roomrental-api:v1.2.3
```

---

## Environment Variables

All environment variables are loaded from `.env` file on the server:

```bash
# Location on server
/var/www/roomrental-api/.env
```

**Important**: Never commit `.env` to git! It's in `.gitignore`.

### Required Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` - Email config

---

## Monitoring & Logs

### Container Logs

```bash
# Real-time logs
docker logs -f roomrental-api

# Logs with timestamps
docker logs -f --timestamps roomrental-api

# Logs from specific time
docker logs --since 30m roomrental-api
docker logs --since 2026-02-20T10:00:00 roomrental-api
```

### Application Logs (Volume-mounted)

```bash
# On server
cd /var/www/roomrental-api/logs

# View logs
tail -f pm2-combined.log
tail -f pm2-error.log
```

### Health Monitoring

The container has built-in health checks:
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3 attempts
- **Start Period**: 40 seconds (time to boot)

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' roomrental-api
# Returns: healthy | unhealthy | starting
```

---

## Performance Tuning

### Resource Limits (Optional)

Edit `docker-compose.prod.yml` to add resource constraints:

```yaml
services:
  api:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### Scaling (Future)

For horizontal scaling:

```bash
# Scale to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Note: Requires load balancer (nginx) in front
```

---

## Migration from PM2 to Docker

### What Changed:

| Aspect | PM2 | Docker |
|--------|-----|--------|
| Process Manager | PM2 | Docker Engine |
| Restart Policy | PM2 auto-restart | Docker restart policy |
| Logs | PM2 logs | Docker logs + volume logs |
| Updates | `pm2 restart` | `docker-compose up -d` |
| Health Checks | Manual | Built-in Docker healthcheck |
| Deployment | Git pull + npm install + build + restart | Git pull + build image + restart container |

### Removed PM2 Files (can be deleted):
- `ecosystem.config.js` (not needed)
- PM2 process management commands

### PM2 Commands → Docker Equivalents:

```bash
# PM2 Commands (OLD)          # Docker Commands (NEW)
pm2 list                  →   docker ps
pm2 logs roomrental-api   →   docker logs roomrental-api
pm2 restart roomrental-api →  docker-compose restart
pm2 stop roomrental-api   →   docker-compose down
pm2 start roomrental-api  →   docker-compose up -d
pm2 delete roomrental-api →   docker-compose down && docker rmi roomrental-api
```

---

## Troubleshooting Guide

### Issue: Container keeps restarting

```bash
# Check logs
docker logs --tail 100 roomrental-api

# Common causes:
# 1. Database connection failed → Check DATABASE_URL in .env
# 2. Port already in use → Check: netstat -tulpn | grep 5000
# 3. Missing environment variables → Check docker logs
```

### Issue: Health check failing

```bash
# Check health endpoint manually
curl http://localhost:5000/api/health

# Check container logs
docker logs roomrental-api

# Access container shell
docker exec -it roomrental-api sh
# Inside container:
# curl http://localhost:5000/api/health
```

### Issue: Can't connect to database

```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test from container
docker exec -it roomrental-api sh
# Inside container, run:
# npx prisma db pull (this will test connection)
```

### Issue: Old PM2 process still running

```bash
# Stop and remove PM2
pm2 delete all
pm2 save
pm2 kill

# Verify nothing on port 5000
netstat -tulpn | grep 5000
```

---

## Security Best Practices

1. **Non-root user**: Dockerfile uses non-root user `nestjs`
2. **Minimal base image**: Using `node:20-alpine` (small, secure)
3. **Multi-stage build**: Separates build and runtime environments
4. **No secrets in image**: All secrets via `.env` file
5. **Log rotation**: JSON log driver with size limits
6. **Health checks**: Automatic restart on failure

---

## Local Development with Docker

```bash
# Start local development with Docker
docker-compose up -d

# Watch logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## Backup & Recovery

### Backup Container Image

```bash
# Save current image
docker save roomrental-api:latest | gzip > roomrental-api-backup.tar.gz

# Restore image
docker load < roomrental-api-backup.tar.gz
```

### Database Backups

Database backups should be handled separately (PostgreSQL backups), not related to Docker migration.

---

## Next Steps After Migration

1. ✅ Remove old PM2 config files
2. ✅ Update documentation references to Docker
3. ✅ Monitor first few deployments closely
4. 📋 Consider adding Docker Compose for local dev with Postgres
5. 📋 Consider adding nginx reverse proxy in Docker
6. 📋 Consider Docker Swarm or Kubernetes for multi-node scaling

---

## Support & Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose Reference**: https://docs.docker.com/compose/
- **NestJS Docker Guide**: https://docs.nestjs.com/recipes/docker

---

## Quick Reference Card

```bash
# 🚀 Deploy
git push origin main  # Automatic CI/CD

# 📊 Check Status
docker ps
docker logs -f roomrental-api

# 🔄 Manual Restart
docker-compose -f docker-compose.prod.yml restart

# 🛑 Stop
docker-compose -f docker-compose.prod.yml down

# ▶️  Start
docker-compose -f docker-compose.prod.yml up -d

# 🏥 Health Check
curl http://localhost:5000/api/health

# 📋 View Logs
docker logs --tail 100 roomrental-api

# 🔍 Debug
docker exec -it roomrental-api sh

# 🧹 Cleanup
docker image prune -f
```

---

**Migration Date**: February 21, 2026  
**Status**: ✅ Ready for deployment  
**Impact**: Zero downtime deployment with automatic rollback on failure
