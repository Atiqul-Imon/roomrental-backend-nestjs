# 🚀 Complete Deployment Instructions

## Issue Found: Private Repository

Your GitHub repository is private, so we need to set up authentication.

## Solution: Add SSH Key to GitHub

### Step 1: Get the SSH Public Key from Server

I've generated an SSH key on your server. You need to add it to GitHub:

```bash
# Get the public key
ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/id_ed25519.pub"
```

### Step 2: Add SSH Key to GitHub

1. Copy the public key from above
2. Go to GitHub → Settings → SSH and GPG keys
3. Click "New SSH key"
4. Paste the key
5. Save

### Step 3: Update Repository URL to SSH

Once the key is added, we'll clone using SSH instead of HTTPS.

## Alternative: Use Personal Access Token

If you prefer HTTPS:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. Use it in the clone URL: `https://TOKEN@github.com/Atiqul-Imon/roomrental-backend-nestjs.git`

## Quick Fix: Make Repository Public (Temporary)

The easiest solution for now:
1. Go to your repository settings
2. Scroll down to "Danger Zone"
3. Make repository public (temporarily)
4. Deploy
5. Make it private again

---

## After Authentication is Set Up

Run this to complete deployment:

```bash
cd "/home/atiqul-islam/roomrental Main/backend-nestjs"
./complete-deploy.sh
```















