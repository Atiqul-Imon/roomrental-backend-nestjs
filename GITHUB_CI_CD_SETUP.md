# 🔄 GitHub CI/CD Setup Guide

This guide will help you set up automated deployment to Digital Ocean using GitHub Actions.

## Prerequisites

- GitHub repository with your backend code
- Digital Ocean droplet running (IP: 167.71.110.39)
- SSH access to the droplet

## Step 1: Generate SSH Key for GitHub Actions

On your local machine, generate a new SSH key specifically for GitHub Actions:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy

# This creates two files:
# ~/.ssh/github_actions_deploy (private key)
# ~/.ssh/github_actions_deploy.pub (public key)
```

## Step 2: Add Public Key to Digital Ocean Droplet

```bash
# Copy the public key
cat ~/.ssh/github_actions_deploy.pub

# SSH into your droplet
ssh root@167.71.110.39

# Add the public key to authorized_keys
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Also add to appuser (for deployment)
sudo -u appuser mkdir -p /home/appuser/.ssh
sudo -u appuser chmod 700 /home/appuser/.ssh
echo "PASTE_PUBLIC_KEY_HERE" | sudo -u appuser tee -a /home/appuser/.ssh/authorized_keys
sudo -u appuser chmod 600 /home/appuser/.ssh/authorized_keys
```

## Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these secrets:

### Secret 1: `DROPLET_IP`
- **Name**: `DROPLET_IP`
- **Value**: `167.71.110.39`

### Secret 2: `DROPLET_USER`
- **Name**: `DROPLET_USER`
- **Value**: `appuser` (or `root` if you prefer)

### Secret 3: `SSH_PRIVATE_KEY`
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: Copy the entire contents of your private key:
  ```bash
  cat ~/.ssh/github_actions_deploy
  ```
  Copy everything including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

## Step 4: Update Workflow File

The workflow file is already created at `.github/workflows/deploy.yml`. Make sure it's committed to your repository.

## Step 5: Test CI/CD

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test CI/CD deployment"
   git push origin main
   ```
3. Go to your GitHub repository → **Actions** tab
4. You should see a workflow run starting
5. Click on it to see the deployment progress

## How It Works

When you push to `main` branch:
1. ✅ GitHub Actions checks out your code
2. ✅ Installs dependencies
3. ✅ Runs tests (if any)
4. ✅ SSH into your Digital Ocean droplet
5. ✅ Pulls latest code
6. ✅ Installs dependencies
7. ✅ Generates Prisma Client
8. ✅ Runs database migrations
9. ✅ Builds the application
10. ✅ Restarts PM2 process

## Manual Deployment Trigger

You can also trigger deployment manually:
1. Go to **Actions** tab
2. Select **Deploy to Digital Ocean** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Troubleshooting

### Workflow fails with "Permission denied"
- Check that SSH key is correctly added to GitHub Secrets
- Verify public key is in droplet's `authorized_keys`
- Check that `DROPLET_USER` has correct permissions

### Workflow fails with "Command not found"
- Make sure Node.js and PM2 are installed on droplet
- Check that paths are correct in workflow file

### Deployment succeeds but API doesn't work
- Check PM2 status: `pm2 status`
- Check logs: `pm2 logs roomrental-api`
- Verify Nginx is running: `systemctl status nginx`

## Security Best Practices

1. ✅ Use separate SSH key for CI/CD (not your personal key)
2. ✅ Rotate SSH keys periodically
3. ✅ Use `appuser` instead of `root` for deployments
4. ✅ Review workflow logs regularly
5. ✅ Limit who can trigger workflows (repository settings)

## Advanced: Branch-based Deployments

To deploy different branches to different environments, modify `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main      # Production
      - staging   # Staging environment
      - develop   # Development environment
```

Then add conditional logic in the workflow to deploy to different droplets or paths.

---

**Your CI/CD is now set up!** 🎉

Every push to `main` will automatically deploy to your Digital Ocean droplet.


















