# Droplet examination & upgrade plan (RoomRental API)

**Snapshot date:** 2026-03-29 (UTC)  
**Host:** Ubuntu 24.04.3 LTS, kernel 6.8.0-106-generic, 2 GiB RAM, ~49 GiB disk (~66% used).

This document summarizes what was observed on the production droplet and a **safe, phased** plan to stay current before traffic grows.

---

## 1. Current state (observed)

| Area | Finding |
|------|---------|
| **OS** | Ubuntu 24.04.3 LTS — good baseline. |
| **Pending updates** | ~85 `apt` upgrades available — schedule a maintenance window for `apt update && apt upgrade` (or rely on `unattended-upgrades` for security-only; full upgrades are manual). |
| **Node (host)** | v20.19.6 — used only if you run Node on the host; **production API runs inside Docker**, so the image base image matters more. |
| **Docker** | Engine 29.2.1, Compose v5.0.2 — recent. |
| **API** | `roomrental-api` container **healthy**, image from GHCR. |
| **Edge** | **nginx** 1.24.0 + **Certbot** 2.9.0, TLS for `api.roomrentalusa.com`, proxy to `localhost:5000`. |
| **Redis** | Listening on **127.0.0.1:6379** — appropriate. |
| **Firewall** | **UFW active** — 80, 443, 22 allowed. |
| **Brute-force** | **fail2ban active**. |
| **Auto patches** | **unattended-upgrades** installed. |
| **PM2** | No processes — OK if everything is Docker-based. |
| **Tailscale** | Present (VPN); understand who has access. |
| **App tree** | `/var/www/roomrental-api` owned by `appuser`; `.env` owned by **root** — consider `chown root:appuser` + `640` so deploy user can read but not world-readable. |
| **Swap** | **None** — under memory pressure the OOM killer can stop containers; consider 1–2 GiB swap file on a 2 GiB VM. |

### Node.js LTS timing (why move off 20)

Per the [Node.js release schedule](https://github.com/nodejs/release):

- **Node 20** — maintenance LTS until **2026-04-30** (EOL soon from “today” in March 2026).
- **Node 22** — maintenance until **2027-04-30**.
- **Node 24** — **Active LTS** (from Oct 2025) until **2026-10-20**, then maintenance until **2028-04-30**.

**Recommendation:** Standardize on **Node 24 LTS** for new work and Docker images to maximize security/support runway.

---

## 2. Changes applied in this repo (safe defaults)

| Change | Rationale |
|--------|-----------|
| **`Dockerfile`:** `node:24-alpine` (builder + production) | Runtime matches supported LTS; CI builds the same image you run. |
| **`package.json` `engines`** | Documents Node 24+ for dev/CI; `npm` warns if mismatch (optional: `engine-strict=true` in CI only). |
| **`.nvmrc`** `24` | Local `nvm use` aligns with production. |
| **`docker-compose.prod.yml`:** `127.0.0.1:5000:5000` | API not exposed on all interfaces; **nginx** on the same host still reaches `localhost:5000`. Reduces bypass of TLS/WAF at the edge. |
| **`deploy.sh`** | Host Node check raised to **24+** for non-Docker deploys. |

**After merge:** run your normal **GitHub Actions deploy** so GHCR gets a Node 24 image; droplet pulls and restarts.

**Verify post-deploy:**

- `curl -fsS https://api.roomrentalusa.com/api/health`
- `docker exec roomrental-api node -v` → v24.x

---

## 3. Recommended droplet tasks (operations)

Do these in **staging first** if you add a second VM later; on a single prod box, use a **short maintenance window**.

### A. OS packages (monthly)

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot   # if kernel or libc updated (schedule)
```

### B. Optional: 1–2 GiB swap (2 GiB RAM host)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### C. Optional: host Node 24 (only if you still run `npm`/`deploy.sh` on the host)

Use [NodeSource](https://github.com/nodesource/distributions) or `nvm` install **24**; not required if **100% Docker** for the API.

### D. Disk hygiene (quarterly)

```bash
docker system df
docker image prune -af   # careful: removes unused images
```

You are at **~66% disk** — monitor; logs + old images fill small disks fast.

### E. `.env` permissions

```bash
sudo chown root:appuser /var/www/roomrental-api/.env
sudo chmod 640 /var/www/roomrental-api/.env
```

(Adjust group if your deploy user differs.)

### F. SSH hardening (later, when you have another access path)

- Prefer **SSH keys only**, `PasswordAuthentication no`.
- Optionally restrict **port 22** to office IP / Tailscale-only (UFW).
- Keep **fail2ban** enabled.

### G. Port 5000

After compose change, 5000 is **localhost-only**; no change needed for nginx. **Do not** expose raw 5000 publicly if you revert compose.

---

## 4. What we did *not* change (on purpose)

- **nginx / Certbot** versions — tied to Ubuntu packages; upgrade via `apt` or official nginx repo when you test configs.
- **Database** — still Supabase; no change from this pass.
- **CI runner** — still builds in Docker; no `actions/setup-node` required for the image contents.

---

## 5. Rollback

- Revert Dockerfile to `node:20-alpine` and redeploy if something breaks on 24 (unlikely for Nest 11 + Prisma 6).
- Revert compose port mapping to `"5000:5000"` only if you must hit the API from another machine without nginx (not recommended for prod).

---

## 6. Checklist before “heavy users”

- [ ] Node 24 image deployed; `node -v` inside container confirmed  
- [ ] `apt upgrade` applied + reboot if needed  
- [ ] Swap enabled OR upsized droplet RAM  
- [ ] Disk alert/monitoring (DO monitoring or Uptime Kuma)  
- [ ] Secrets only in `.env` / secret manager; `.env` not in git  
- [ ] Optional: non-root Docker user (already `nestjs` in image), read-only rootfs later for hardening  

This keeps the stack **boring, secure, and standard** for a US-only API heading toward higher load.
