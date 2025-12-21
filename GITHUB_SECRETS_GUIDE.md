# 🔐 GitHub Secrets Configuration Guide

## Required Secrets for CI/CD

Add these secrets to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

---

## Secret 1: `DROPLET_IP`

**Name:** `DROPLET_IP`  
**Value:** `167.71.110.39`

**How to add:**
1. Click "New repository secret"
2. Name: `DROPLET_IP`
3. Secret: `167.71.110.39`
4. Click "Add secret"

---

## Secret 2: `DROPLET_USER`

**Name:** `DROPLET_USER`  
**Value:** `appuser`

**How to add:**
1. Click "New repository secret"
2. Name: `DROPLET_USER`
3. Secret: `appuser`
4. Click "Add secret"

---

## Secret 3: `SSH_PRIVATE_KEY`

**Name:** `SSH_PRIVATE_KEY`  
**Value:** (See below - copy the entire private key)

**How to get the private key:**

Run this command on your local machine:
```bash
ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/id_ed25519"
```

**OR** I'll provide it below after generating it.

**How to add:**
1. Click "New repository secret"
2. Name: `SSH_PRIVATE_KEY`
3. Secret: Paste the ENTIRE private key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
4. Click "Add secret"

---

## Complete Secret List

| Secret Name | Value | Description |
|------------|-------|-------------|
| `DROPLET_IP` | `167.71.110.39` | Your Digital Ocean droplet IP address |
| `DROPLET_USER` | `appuser` | User account for deployment |
| `SSH_PRIVATE_KEY` | (See below) | SSH private key for authentication |

---

## Quick Setup Steps

1. **Go to:** https://github.com/Atiqul-Imon/roomrental-backend-nestjs/settings/secrets/actions

2. **Add Secret 1:**
   - Name: `DROPLET_IP`
   - Value: `167.71.110.39`

3. **Add Secret 2:**
   - Name: `DROPLET_USER`
   - Value: `appuser`

4. **Add Secret 3:**
   - Name: `SSH_PRIVATE_KEY`
   - Value: (Copy from command output below)

---

## Getting the SSH Private Key

Run this command to get the private key:

```bash
ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/id_ed25519"
```

Copy the ENTIRE output including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the key content
- `-----END OPENSSH PRIVATE KEY-----`

---

## Verification

After adding all secrets, you should see:
- ✅ `DROPLET_IP`
- ✅ `DROPLET_USER`
- ✅ `SSH_PRIVATE_KEY`

---

## Security Notes

- ⚠️ Never commit secrets to your repository
- ⚠️ Never share private keys publicly
- ⚠️ Rotate keys periodically
- ✅ Secrets are encrypted by GitHub
- ✅ Only accessible in GitHub Actions workflows

---

## Testing CI/CD

After adding secrets:

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test CI/CD"
   git push origin main
   ```
3. Go to **Actions** tab in GitHub
4. Watch the deployment workflow run

---

## Troubleshooting

### Workflow fails with "Permission denied"
- Check that SSH_PRIVATE_KEY is correctly copied (entire key including headers)
- Verify public key is in droplet's `~/.ssh/authorized_keys`

### Workflow fails with "Host key verification failed"
- Add this to workflow (already included):
  ```yaml
  - name: Add known hosts
    run: ssh-keyscan -H ${{ secrets.DROPLET_IP }} >> ~/.ssh/known_hosts
  ```

### Workflow succeeds but deployment fails
- Check PM2 logs on server: `pm2 logs roomrental-api`
- Verify .env file exists and is configured
- Check Nginx status: `systemctl status nginx`




