# StyleAI — Deployment Guide

Complete guide to deploy StyleAI to production.

---

## 1. Prerequisites

- **VPS / Server**: Ubuntu 22.04+ (Contabo, DigitalOcean, Hetzner)
- **Recommended specs (small team)**:
  - 4 vCPU, 8 GB RAM, 100 GB SSD — if running Ollama
  - 2 vCPU, 4 GB RAM, 60 GB SSD — if using cloud LLMs only
- **Domain name** pointing to server IP
- **Docker + Docker Compose** installed

### Install Docker (Ubuntu)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

---

## 2. First-Time Setup

### 2.1 Clone repo
```bash
git clone https://github.com/your-username/styleai.git
cd styleai
```

### 2.2 Create env files
```bash
cp .env.production.example .env
cp backend/.env.production.example backend/.env
cp ai-services/.env.production.example ai-services/.env
```

Fill in **every** `CHANGE_ME` value.

### 2.3 Generate secrets
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# AI_INTERNAL_KEY / INTERNAL_KEY (must match)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Nginx config
Edit `nginx/conf.d/styleai.conf` — replace `your-domain.com`.

### 2.5 Deploy
```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

---

## 3. SSL Setup (Let's Encrypt)

### 3.1 Issue certificate
```bash
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d your-domain.com -d www.your-domain.com \
  --email admin@your-domain.com \
  --agree-tos --no-eff-email
```

### 3.2 Enable HTTPS in Nginx
Edit `nginx/conf.d/styleai.conf`:
- Uncomment the `HTTP → HTTPS redirect` server block
- Uncomment the `HTTPS server` block
- Verify cert paths match

### 3.3 Reload nginx
```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### 3.4 Auto-renewal
The `certbot` service already runs renewal every 12h. It's automatic.

---

## 4. Post-Deploy Checklist

- [ ] `curl https://your-domain.com/api/health` → 200
- [ ] `curl https://your-domain.com` → frontend loads
- [ ] Admin login works: `admin@styleai.com` / `Admin@123`
- [ ] **CHANGE ADMIN PASSWORD IMMEDIATELY**
- [ ] Upload a test product → AI content generates
- [ ] Stripe webhook: `stripe listen` no longer needed (real webhook configured in Stripe Dashboard)
- [ ] Email test: register new user → welcome email arrives
- [ ] Backups scheduled: `crontab -e` → `0 3 * * * /path/to/scripts/backup-db.sh`
- [ ] Monitor logs: `docker compose -f docker-compose.prod.yml logs -f`

---

## 5. Common Operations

### View logs
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f ai-services
```

### Restart a service
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Update to latest code
```bash
git pull
./scripts/deploy.sh
```

### Backup DB
```bash
./scripts/backup-db.sh
```

### Restore DB
```bash
./scripts/restore-db.sh backups/styleai_20261005_030000.sql.gz
```

### Access Postgres shell
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U styleai -d styleai
```

---

## 6. Monitoring (Optional)

### Sentry (error tracking)
Add to `backend/.env`:
```env
SENTRY_DSN=https://...
```
(Wire up in server.js — see Sentry docs)

### UptimeRobot (downtime alerts)
- URL: `https://your-domain.com/api/health`
- Interval: 5 minutes
- Alert: email

---

## 7. Ollama Decision

**For production, we recommend switching to Groq** (free tier, 14,400 req/day):

In `ai-services/.env`:
```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_TEXT_MODEL=llama-3.3-70b-versatile
```

Get a free key at https://console.groq.com

**Skip Ollama entirely** — uncomment the `ollama` service in `docker-compose.prod.yml` only if you want local LLM.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Backend can't reach DB | Check `backend/.env` → `DATABASE_URL` uses `postgres:5432` (not localhost) |
| CORS errors | `backend/.env` → `FRONTEND_URL=https://your-domain.com` (no trailing slash) |
| Webhooks fail | Stripe Dashboard → add `https://your-domain.com/api/webhooks/stripe` |
| 502 Bad Gateway | `docker compose logs nginx` — check upstreams are healthy |
| Out of memory | Reduce Postgres `shared_buffers`, or upgrade VPS |
| SSL renewal fails | Check port 80 is open, `.well-known/acme-challenge/` is reachable |

---

## 9. What's Next

After successful deploy:
1. **Change admin password**
2. **Set up Stripe live keys** (US LLC/Payoneer needed — see Known Limitations)
3. **Configure domain email** (optional — replace Gmail SMTP with custom domain)
4. **Enable Sentry** (error tracking)
5. **Set up UptimeRobot** (downtime alerts)
6. **Schedule backups** (cron)

---

**🎉 You're live. Ship fast, iterate faster.**