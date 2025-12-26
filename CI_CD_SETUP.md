# 🔄 GitHub CI/CD Setup Guide

## ✅ Current Status

The CI/CD workflow is now configured and ready to use. Every push to the `main` branch will automatically deploy to your Digital Ocean server.

---

## 📋 Workflow Overview

**File:** `.github/workflows/deploy.yml`

**Triggers:**
- Push to `main` branch
- Push to `master` branch
- Manual trigger via GitHub Actions UI

**Steps:**
1. ✅ Checkout code
2. ✅ Setup Node.js 20
3. ✅ Install dependencies
4. ✅ Run tests (if any)
5. ✅ Deploy to Digital Ocean
   - Pull latest code
   - Install dependencies
   - Generate Prisma Client
   - Run database migrations
   - Build application
   - Restart PM2
   - Health check

---

## 🔐 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### How to Add Secrets:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

### Secrets Required:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `DROPLET_IP` | Your Digital Ocean droplet IP | `167.71.110.39` |
| `DROPLET_USER` | SSH username (usually `root` or `appuser`) | `root` |
| `SSH_PRIVATE_KEY` | Private SSH key for server access | (see below) |

---

## 🔑 Getting Your SSH Private Key

### Option 1: Use Existing SSH Key

If you already have SSH access to the server:

```bash
# On your local machine
cat ~/.ssh/id_rsa
# or
cat ~/.ssh/id_ed25519
```

Copy the entire output (including `-----BEGIN` and `-----END` lines) and paste it as the `SSH_PRIVATE_KEY` secret.

### Option 2: Generate New SSH Key Pair

```bash
# Generate new key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@167.71.110.39

# Display private key (copy this to GitHub secret)
cat ~/.ssh/github_actions_deploy
```

---

## 🧪 Testing the Workflow

### Manual Test:

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test CI/CD deployment"
   git push origin main
   ```
3. Go to GitHub → **Actions** tab
4. Watch the workflow run
5. Check deployment logs

### Verify Deployment:

```bash
# Check if deployment was successful
ssh root@167.71.110.39 'sudo -u appuser pm2 status'

# Check application logs
ssh root@167.71.110.39 'sudo -u appuser pm2 logs roomrental-api --lines 20'

# Test API
curl https://roomrentalapi.pixelforgebd.com/api/health
```

---

## 🔧 Troubleshooting

### Workflow Fails at SSH Connection

**Issue:** `Permission denied (publickey)`

**Solution:**
1. Verify SSH key is correct in GitHub secrets
2. Ensure public key is in server's `~/.ssh/authorized_keys`
3. Check SSH key format (should include BEGIN/END lines)

### Workflow Fails at Git Pull

**Issue:** `fatal: could not read Username`

**Solution:**
- Ensure repository is public, OR
- Add SSH key to GitHub account for private repos

### Workflow Fails at npm install

**Issue:** Dependency conflicts

**Solution:**
- The workflow uses `--legacy-peer-deps` flag
- Check `package.json` for version conflicts

### Workflow Fails at PM2 Restart

**Issue:** Application not starting

**Solution:**
```bash
# SSH into server and check logs
ssh root@167.71.110.39
sudo -u appuser pm2 logs roomrental-api --lines 50
```

### Health Check Fails

**Issue:** Application not responding

**Solution:**
1. Check PM2 status: `pm2 status`
2. Check application logs: `pm2 logs roomrental-api`
3. Verify environment variables: `cat /var/www/roomrental-api/.env`
4. Check Nginx: `systemctl status nginx`

---

## 📊 Workflow Features

### ✅ Error Handling
- `set -e` ensures script exits on any error
- Health check after deployment
- Proper error messages

### ✅ Safety Features
- Hard reset to ensure clean state
- Clean untracked files
- PM2 process management
- Automatic health verification

### ✅ Logging
- Each step logs its progress
- Clear success/failure messages
- PM2 logs available for debugging

---

## 🚀 Deployment Process

When you push to `main`:

1. **GitHub Actions** triggers workflow
2. **Build** runs on GitHub's servers
3. **SSH** connects to your Digital Ocean server
4. **Code** is pulled from GitHub
5. **Dependencies** are installed
6. **Database** migrations run
7. **Application** is built
8. **PM2** restarts the application
9. **Health check** verifies deployment

**Total time:** ~2-3 minutes

---

## 🔄 Manual Deployment (Fallback)

If CI/CD fails, you can deploy manually:

```bash
ssh root@167.71.110.39
sudo -u appuser bash
cd /var/www/roomrental-api
git pull origin main
npm install --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart roomrental-api
```

---

## 📝 Best Practices

1. **Test Locally First**
   - Run tests before pushing
   - Verify build works: `npm run build`

2. **Small Commits**
   - Make incremental changes
   - Easier to debug if deployment fails

3. **Monitor Deployments**
   - Check GitHub Actions tab regularly
   - Review logs for any warnings

4. **Keep Secrets Secure**
   - Never commit secrets to repository
   - Rotate SSH keys periodically

5. **Backup Before Major Changes**
   - Database backups before migrations
   - Code backups before major refactors

---

## ✅ Checklist

- [x] Workflow file created (`.github/workflows/deploy.yml`)
- [ ] GitHub secrets added (`DROPLET_IP`, `DROPLET_USER`, `SSH_PRIVATE_KEY`)
- [ ] SSH key added to server
- [ ] Test deployment triggered
- [ ] Verify deployment successful
- [ ] Monitor first few deployments

---

## 🎯 Next Steps

1. **Add GitHub Secrets** (see above)
2. **Test Deployment** by pushing a small change
3. **Monitor** the first deployment
4. **Verify** API is working after deployment

---

## 📞 Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check server logs: `pm2 logs roomrental-api`
3. Verify SSH connection works manually
4. Check environment variables on server

**Your CI/CD is ready! Just add the secrets and start deploying! 🚀**











