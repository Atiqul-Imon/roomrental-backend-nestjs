# 🚀 CI/CD Quick Start

## ✅ Workflow Fixed!

The GitHub CI/CD workflow has been updated and is ready to use.

---

## 🔐 Step 1: Add GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add these 3 secrets:

### 1. `DROPLET_IP`
```
167.71.110.39
```

### 2. `DROPLET_USER`
```
root
```

### 3. `SSH_PRIVATE_KEY`

Get your SSH private key:

```bash
# On your local machine
cat ~/.ssh/id_rsa
# OR
cat ~/.ssh/id_ed25519
```

Copy the **entire output** (including `-----BEGIN` and `-----END` lines) and paste it as the secret value.

---

## ✅ Step 2: Test Deployment

Make a small change and push:

```bash
cd "/home/atiqul-islam/roomrental Main/backend-nestjs"
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test CI/CD deployment"
git push origin main
```

Then go to GitHub → **Actions** tab to watch the deployment.

---

## 📊 What the Workflow Does

1. ✅ Checks out your code
2. ✅ Installs dependencies
3. ✅ Runs tests (if any)
4. ✅ Connects to your server via SSH
5. ✅ Pulls latest code
6. ✅ Installs dependencies
7. ✅ Generates Prisma Client
8. ✅ Runs database migrations
9. ✅ Builds the application
10. ✅ Restarts PM2
11. ✅ Verifies health check

---

## 🎯 Current Status

- ✅ Workflow file: Fixed and updated
- ✅ Error handling: Added
- ✅ Health checks: Added
- ✅ Paths: Corrected (repository root is backend)
- ⚠️ **Action Required:** Add GitHub secrets (see above)

---

## 🔍 Verify Deployment

After pushing, check:

1. **GitHub Actions:** https://github.com/Atiqul-Imon/roomrental-backend-nestjs/actions
2. **API Health:** https://roomrentalapi.pixelforgebd.com/api/health
3. **Server Logs:**
   ```bash
   ssh root@167.71.110.39 'sudo -u appuser pm2 logs roomrental-api --lines 20'
   ```

---

## 🆘 Troubleshooting

### "Permission denied (publickey)"
- Verify SSH key is correct in GitHub secrets
- Ensure public key is on server: `~/.ssh/authorized_keys`

### "fatal: could not read Username"
- Repository must be public OR
- Add SSH key to GitHub account

### Deployment fails
- Check GitHub Actions logs
- Check server logs: `pm2 logs roomrental-api`
- Verify environment variables: `cat /var/www/roomrental-api/.env`

---

**Once you add the secrets, every push to `main` will automatically deploy! 🎉**

