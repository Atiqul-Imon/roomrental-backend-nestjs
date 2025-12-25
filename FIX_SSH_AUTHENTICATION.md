# 🔐 Fix SSH Authentication for GitHub Actions

## ❌ Current Error

```
ssh: handshake failed: ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain
```

This means GitHub Actions cannot authenticate to your server because the SSH key is missing or incorrect.

---

## ✅ Solution: Add SSH Private Key to GitHub Secrets

### Step 1: Get the SSH Private Key

I've generated a new SSH key on your server. Here's the **private key** you need to add to GitHub:

**Run this command to get it:**

```bash
ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/id_ed25519"
```

**Copy the ENTIRE output** (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

---

### Step 2: Add to GitHub Secrets

1. Go to: https://github.com/Atiqul-Imon/roomrental-backend-nestjs/settings/secrets/actions

2. Click **"New repository secret"**

3. Add these secrets:

#### Secret 1: `DROPLET_IP`
- **Name:** `DROPLET_IP`
- **Value:** `167.71.110.39`

#### Secret 2: `DROPLET_USER`
- **Name:** `DROPLET_USER`
- **Value:** `root` (or `appuser` if you prefer)

#### Secret 3: `SSH_PRIVATE_KEY`
- **Name:** `SSH_PRIVATE_KEY`
- **Value:** (Paste the ENTIRE private key from Step 1)

**Important:** 
- Copy the ENTIRE key including BEGIN and END lines
- No extra spaces or newlines
- The key should start with `-----BEGIN` and end with `-----END`

---

### Step 3: Verify SSH Key Format

The private key should look like this:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
... (many lines) ...
-----END OPENSSH PRIVATE KEY-----
```

---

### Step 4: Test the Connection

After adding the secrets, the next GitHub Actions run should work. You can also test manually:

```bash
# Test SSH connection (replace with your actual private key)
ssh -i ~/.ssh/id_ed25519 root@167.71.110.39 "echo 'Connection successful!'"
```

---

## 🔧 Alternative: Use Your Local SSH Key

If you prefer to use your existing SSH key:

### Option A: Use Existing Key

1. **Get your local private key:**
   ```bash
   cat ~/.ssh/id_rsa
   # OR
   cat ~/.ssh/id_ed25519
   ```

2. **Add public key to server:**
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub root@167.71.110.39
   # OR
   ssh-copy-id -i ~/.ssh/id_ed25519.pub root@167.71.110.39
   ```

3. **Add private key to GitHub secrets** (same as Step 2 above)

---

## ✅ Verification Checklist

- [ ] SSH private key copied from server
- [ ] `DROPLET_IP` secret added: `167.71.110.39`
- [ ] `DROPLET_USER` secret added: `root`
- [ ] `SSH_PRIVATE_KEY` secret added (full key with BEGIN/END)
- [ ] Public key is in server's `~/.ssh/authorized_keys`
- [ ] Test GitHub Actions workflow

---

## 🆘 Troubleshooting

### Still getting authentication errors?

1. **Check key format:**
   - Must include `-----BEGIN` and `-----END` lines
   - No extra spaces or characters
   - Should be on separate lines

2. **Verify public key on server:**
   ```bash
   ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/authorized_keys"
   ```

3. **Check SSH permissions:**
   ```bash
   ssh root@167.71.110.39 "sudo -u appuser chmod 700 /home/appuser/.ssh && chmod 600 /home/appuser/.ssh/authorized_keys"
   ```

4. **Test SSH manually:**
   ```bash
   # Save private key to a file
   echo "YOUR_PRIVATE_KEY" > /tmp/test_key
   chmod 600 /tmp/test_key
   
   # Test connection
   ssh -i /tmp/test_key root@167.71.110.39 "echo 'Success!'"
   ```

---

## 📝 Quick Command Reference

```bash
# Get private key from server
ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/id_ed25519"

# Get public key from server
ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/id_ed25519.pub"

# Check authorized_keys
ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/authorized_keys"
```

---

**Once you add the SSH_PRIVATE_KEY secret to GitHub, the deployment will work! 🚀**








