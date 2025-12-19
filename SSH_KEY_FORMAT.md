# 🔑 SSH Key Format for GitHub Secrets

## ⚠️ Important: Key Format Requirements

The SSH private key must be formatted **exactly** as shown below when adding to GitHub secrets.

---

## ✅ Correct Format

When adding `SSH_PRIVATE_KEY` to GitHub secrets, paste it **exactly** like this:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCoWc70TM6HDqQ1GeKYrx6aeRX3JNX/xxwomNflOTGa5AAAAJgKKNkICijZ
CAAAAAtzc2gtZWQyNTUxOQAAACCoWc70TM6HDqQ1GeKYrx6aeRX3JNX/xxwomNflOTGa5A
AAAED+qztiye8oYEvE+dusXTi9tpN+FCC7O9jMFmRueeRN9qhZzvRMzocOpDUZ4pivHpp5
Ffck1f/HHCiY1+U5MZrkAAAAEWRlcGxveUByb29tcmVudGFsAQIDBA==
-----END OPENSSH PRIVATE KEY-----
```

---

## ❌ Common Mistakes

### 1. Extra Spaces
❌ **Wrong:**
```
 -----BEGIN OPENSSH PRIVATE KEY-----
```

✅ **Correct:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
```

### 2. Missing Lines
❌ **Wrong:** (Missing BEGIN or END)
```
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
...
-----END OPENSSH PRIVATE KEY-----
```

✅ **Correct:** (Must include both BEGIN and END)
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
...
-----END OPENSSH PRIVATE KEY-----
```

### 3. Extra Newlines
❌ **Wrong:**
```
-----BEGIN OPENSSH PRIVATE KEY-----

b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
...

-----END OPENSSH PRIVATE KEY-----
```

✅ **Correct:** (No blank lines between BEGIN/END and content)
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
...
-----END OPENSSH PRIVATE KEY-----
```

### 4. Wrong Key Type
❌ **Wrong:** (RSA key when server expects Ed25519)
```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

✅ **Correct:** (OpenSSH Ed25519 format)
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

---

## 🔍 How to Verify Your Key

### Step 1: Check Key Format
The key should:
- Start with `-----BEGIN OPENSSH PRIVATE KEY-----`
- End with `-----END OPENSSH PRIVATE KEY-----`
- Have exactly 6 lines total
- No extra spaces before/after

### Step 2: Test Locally
```bash
# Save key to file
cat > /tmp/test_key << 'EOF'
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCoWc70TM6HDqQ1GeKYrx6aeRX3JNX/xxwomNflOTGa5AAAAJgKKNkICijZ
CAAAAAtzc2gtZWQyNTUxOQAAACCoWc70TM6HDqQ1GeKYrx6aeRX3JNX/xxwomNflOTGa5A
AAAED+qztiye8oYEvE+dusXTi9tpN+FCC7O9jMFmRueeRN9qhZzvRMzocOpDUZ4pivHpp5
Ffck1f/HHCiY1+U5MZrkAAAAEWRlcGxveUByb29tcmVudGFsAQIDBA==
-----END OPENSSH PRIVATE KEY-----
EOF

# Set permissions
chmod 600 /tmp/test_key

# Test connection
ssh -i /tmp/test_key -o StrictHostKeyChecking=no root@167.71.110.39 "echo 'Success!'"
```

---

## 📝 Step-by-Step: Add to GitHub

1. **Go to:** https://github.com/Atiqul-Imon/roomrental-backend-nestjs/settings/secrets/actions

2. **Click:** "New repository secret" (or edit existing `SSH_PRIVATE_KEY`)

3. **Name:** `SSH_PRIVATE_KEY`

4. **Value:** Copy the ENTIRE key below (all 6 lines):

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCoWc70TM6HDqQ1GeKYrx6aeRX3JNX/xxwomNflOTGa5AAAAJgKKNkICijZ
CAAAAAtzc2gtZWQyNTUxOQAAACCoWc70TM6HDqQ1GeKYrx6aeRX3JNX/xxwomNflOTGa5A
AAAED+qztiye8oYEvE+dusXTi9tpN+FCC7O9jMFmRueeRN9qhZzvRMzocOpDUZ4pivHpp5
Ffck1f/HHCiY1+U5MZrkAAAAEWRlcGxveUByb29tcmVudGFsAQIDBA==
-----END OPENSSH PRIVATE KEY-----
```

5. **Important:**
   - Select ALL 6 lines
   - Copy exactly (Ctrl+A, Ctrl+C)
   - Paste into GitHub (Ctrl+V)
   - No editing or formatting
   - Click "Add secret"

---

## 🔧 Alternative: Use appuser Instead of root

If authentication still fails, try using `appuser` instead of `root`:

1. **Update `DROPLET_USER` secret:**
   - Change from: `root`
   - Change to: `appuser`

2. **Update workflow script** (if needed):
   - The script should work with either user
   - `appuser` has the correct permissions for PM2

---

## ✅ Verification Checklist

- [ ] Key starts with `-----BEGIN OPENSSH PRIVATE KEY-----`
- [ ] Key ends with `-----END OPENSSH PRIVATE KEY-----`
- [ ] Exactly 6 lines total
- [ ] No extra spaces or blank lines
- [ ] Copied exactly as shown above
- [ ] `DROPLET_IP` = `167.71.110.39`
- [ ] `DROPLET_USER` = `root` (or `appuser`)
- [ ] Public key is in server's `authorized_keys`

---

## 🆘 Still Not Working?

1. **Delete and re-add the secret:**
   - Delete `SSH_PRIVATE_KEY` from GitHub
   - Re-add it using the exact format above

2. **Check server logs:**
   ```bash
   ssh root@167.71.110.39 'tail -f /var/log/auth.log'
   ```

3. **Verify public key on server:**
   ```bash
   ssh root@167.71.110.39 "sudo -u appuser cat /home/appuser/.ssh/authorized_keys"
   ```

4. **Test with different user:**
   - Try `DROPLET_USER` = `appuser` instead of `root`

---

**The key format is critical! Make sure it's exactly as shown above. 🔑**

