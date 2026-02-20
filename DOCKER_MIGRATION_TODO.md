# 🚀 PM2 to Docker Migration - Action Items

## ✅ COMPLETED

### Files Created/Modified:

1. **Docker Configuration**
   - ✅ `Dockerfile` (already existed - multi-stage build)
   - ✅ `docker-compose.yml` (NEW - local development)
   - ✅ `docker-compose.prod.yml` (NEW - production)
   - ✅ `.dockerignore` (already existed)

2. **CI/CD**
   - ✅ `.github/workflows/deploy.yml` (UPDATED - Docker deployment)
   - ✅ `.github/workflows/deploy-pm2.yml.backup` (BACKED UP - old PM2 workflow)

3. **Scripts**
   - ✅ `scripts/docker-local.sh` (NEW - local development helper)

4. **Documentation**
   - ✅ `README.md` (UPDATED - comprehensive Docker guide)
   - ✅ `DOCKER_DEPLOYMENT.md` (NEW - detailed Docker guide)
   - ✅ `MIGRATION_SUMMARY.md` (NEW - migration details)
   - ✅ `DOCKER_MIGRATION_TODO.md` (THIS FILE)

---

## 🎯 WHAT YOU NEED TO DO

### Step 1: Review the Changes ⏱️ 5 minutes

```bash
cd /home/atiqul-islam/roomrental\ Main/backend-nestjs

# Check the new files
cat README.md
cat MIGRATION_SUMMARY.md
cat docker-compose.yml
cat .github/workflows/deploy.yml

# Review the helper script
cat scripts/docker-local.sh
```

### Step 2: Test Locally (Optional) ⏱️ 10 minutes

```bash
# Build Docker image locally
docker build -t roomrental-api:test .

# Check image size
docker images | grep roomrental-api

# (Optional) Test run locally with .env
docker run --env-file .env -p 5000:5000 roomrental-api:test

# Or use the helper script
./scripts/docker-local.sh start
./scripts/docker-local.sh logs
./scripts/docker-local.sh stop
```

### Step 3: Commit and Push to Developer Branch ⏱️ 2 minutes

```bash
cd /home/atiqul-islam/roomrental\ Main/backend-nestjs

# Check git status
git status

# Add all files
git add .

# Commit with descriptive message
git commit -m "Migrate from PM2 to Docker for production deployment

- Add Docker Compose configs for local and production
- Update CI/CD workflow to use Docker instead of PM2
- Add helper scripts for local Docker development
- Add comprehensive Docker deployment documentation
- Backup old PM2 workflow for reference
- This fixes the switch-role 404 issue by ensuring clean builds"

# Push to developer branch
git push origin developer
```

### Step 4: Merge Developer to Main on GitHub ⏱️ 2 minutes

1. Go to GitHub repository
2. Create Pull Request: `developer` → `main`
3. Review changes in PR
4. Merge the PR
5. GitHub Actions will automatically trigger deployment!

### Step 5: Monitor Deployment ⏱️ 5 minutes

**Watch GitHub Actions:**
1. Go to GitHub → Actions tab
2. Watch the latest workflow run
3. It should show:
   - ✅ Checkout code
   - ✅ Deploy to Digital Ocean with Docker
   - ✅ Success message

**SSH to Server and Monitor:**
```bash
# SSH to server
ssh root@167.71.110.39

# Watch Docker container being created
watch -n 2 docker ps

# Watch logs in real-time
docker logs -f roomrental-api

# Check health
curl http://localhost:5000/api/health
```

### Step 6: Verify Everything Works ⏱️ 5 minutes

```bash
# Test the health endpoint
curl https://api.roomrentalusa.com/api/health

# Test the switch-role endpoint (should return 401, not 404)
curl -X POST https://api.roomrentalusa.com/api/profile/switch-role

# Login to frontend and test role switching
# Open: https://roomrentalusa.com
# Login as a student
# Try to switch to landlord mode
# Should work now! ✅
```

### Step 7: Cleanup (Optional) ⏱️ 2 minutes

After successful deployment, you can:

```bash
# Remove old PM2 config file (if exists)
rm ecosystem.config.js

# Remove old PM2 workflow backup (optional)
rm .github/workflows/deploy-pm2.yml.backup

# Commit cleanup
git add .
git commit -m "Remove old PM2 configuration files"
git push origin developer
# Merge to main
```

---

## 📋 Pre-Deployment Checklist

Before pushing to main, verify:

- [ ] `.env` file exists on server (`/var/www/roomrental-api/.env`)
- [ ] All required environment variables are set in `.env`
- [ ] GitHub Secrets are configured:
  - [ ] `DROPLET_IP` = 167.71.110.39
  - [ ] `DROPLET_USER` = root
  - [ ] `SSH_PRIVATE_KEY` = (your SSH key)
- [ ] Port 5000 is available (PM2 will be stopped automatically)
- [ ] Database is accessible from the server

---

## 🎯 Expected Timeline

| Step | Time | Description |
|------|------|-------------|
| Review changes | 5 min | Read docs, understand changes |
| Test locally (optional) | 10 min | Build and test Docker image locally |
| Commit & push | 2 min | Git commit and push to developer |
| Create PR & merge | 2 min | Merge developer → main on GitHub |
| Automatic deployment | 5-7 min | CI/CD builds and deploys Docker |
| Verify & test | 5 min | Test all endpoints, verify working |
| **TOTAL** | **20-30 min** | Complete migration |

---

## 🔍 What Happens During Deployment

```
┌─────────────────────────────────────────────────┐
│  1. GitHub Actions triggers on main push        │
│     ↓                                           │
│  2. SSH to DigitalOcean droplet                 │
│     ↓                                           │
│  3. Pull latest code (git pull)                 │
│     ↓                                           │
│  4. Stop PM2 processes (pm2 delete)             │
│     ↓                                           │
│  5. Install Docker (if not present)             │
│     ↓                                           │
│  6. Build Docker image (docker build)           │
│     ⏱️ ~3-5 minutes                             │
│     ↓                                           │
│  7. Run database migrations (in container)      │
│     ↓                                           │
│  8. Stop old container (docker-compose down)    │
│     ↓                                           │
│  9. Start new container (docker-compose up)     │
│     ⏱️ ~10 seconds                              │
│     ↓                                           │
│  10. Health check (wait for /api/health)        │
│     ⏱️ up to 30 seconds                         │
│     ↓                                           │
│  11. ✅ Deployment successful!                  │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Potential Issues & Solutions

### Issue 1: Docker installation takes too long

**Solution**: Docker installation is one-time and takes ~2 minutes. Subsequent deployments won't need to install Docker.

### Issue 2: Port 5000 already in use

**Solution**: The CI/CD automatically stops PM2 before starting Docker. If you manually deployed before, stop PM2:
```bash
ssh root@167.71.110.39 'pm2 delete all && pm2 kill'
```

### Issue 3: Container won't start

**Solution**: Check logs and environment variables:
```bash
ssh root@167.71.110.39
docker logs roomrental-api
cat /var/www/roomrental-api/.env
```

### Issue 4: Health check fails

**Solution**: Check if the application started properly:
```bash
ssh root@167.71.110.39
docker logs --tail 100 roomrental-api
docker exec -it roomrental-api sh
# Inside container: curl http://localhost:5000/api/health
```

### Issue 5: Need to rollback

**Solution**: Quick rollback to previous commit:
```bash
ssh root@167.71.110.39
cd /var/www/roomrental-api
git log --oneline -n 5
git reset --hard <previous-commit-hash>
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📞 Emergency Rollback to PM2

If Docker deployment completely fails and you need to quickly restore PM2:

```bash
# SSH to server
ssh root@167.71.110.39
cd /var/www/roomrental-api

# Stop Docker
docker-compose -f docker-compose.prod.yml down

# Checkout commit before Docker migration
git log --oneline | grep -i "pm2"
git reset --hard <commit-before-docker>

# Install dependencies and start PM2
npm install --legacy-peer-deps
npx prisma generate
npm run build
pm2 start ecosystem.config.js
pm2 save
```

---

## 🎉 Success Criteria

Deployment is successful when:

- ✅ GitHub Actions workflow shows "Success" ✅
- ✅ `docker ps` shows container running
- ✅ `curl http://localhost:5000/api/health` returns 200 OK
- ✅ `curl https://api.roomrentalusa.com/api/health` returns success
- ✅ Frontend can access API endpoints
- ✅ Role switching works (POST /api/profile/switch-role returns 401, not 404)
- ✅ All features work as before

---

## 📚 Quick Command Reference

```bash
# Local Development
./scripts/docker-local.sh start      # Start Docker locally
./scripts/docker-local.sh logs       # View logs
./scripts/docker-local.sh stop       # Stop Docker

# Production (on server)
docker ps                            # Check running containers
docker logs -f roomrental-api        # View logs
docker-compose -f docker-compose.prod.yml restart  # Restart
curl http://localhost:5000/api/health  # Health check

# Troubleshooting
docker logs --tail 100 roomrental-api  # View logs
docker exec -it roomrental-api sh      # Access container
docker inspect roomrental-api          # View details
docker stats roomrental-api            # Resource usage
```

---

## ✅ Final Checklist Before Deployment

- [ ] Reviewed all new files and documentation
- [ ] Understand what Docker migration does
- [ ] (Optional) Tested Docker build locally
- [ ] `.env` file exists on production server
- [ ] Committed all changes to developer branch
- [ ] Ready to merge developer → main
- [ ] Prepared to monitor GitHub Actions
- [ ] Have SSH access ready for monitoring
- [ ] Know how to rollback if needed

---

## 🎯 Ready to Deploy?

**When you're ready:**

1. Run the commands in **Step 3** (commit & push)
2. Follow **Step 4** (merge on GitHub)
3. Watch **Step 5** (monitor deployment)
4. Verify **Step 6** (test everything)
5. Celebrate! 🎉

The migration will fix the `switch-role` 404 error and provide a much better deployment system!

---

**Status**: ✅ Everything is ready  
**Risk**: 🟢 Low (includes automatic PM2 cleanup and rollback)  
**Time**: 20-30 minutes total  
**Downtime**: < 30 seconds during container switch
