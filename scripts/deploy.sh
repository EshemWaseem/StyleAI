#!/usr/bin/env bash
# scripts/deploy.sh
# ======================================================
# One-command deploy for StyleAI (production)
# ======================================================

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()    { echo -e "${BLUE}[deploy]${NC} $*"; }
success(){ echo -e "${GREEN}[✓]${NC} $*"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*"; }
error()  { echo -e "${RED}[✗]${NC} $*" >&2; }

cd "$(dirname "$0")/.."

# ---- Pre-flight ----
log "Pre-flight checks..."

if [ ! -f .env ]; then
  error "Root .env missing. Copy .env.production.example → .env"
  exit 1
fi
if [ ! -f backend/.env ]; then
  error "backend/.env missing."
  exit 1
fi
if [ ! -f ai-services/.env ]; then
  error "ai-services/.env missing."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  error "Docker not installed"
  exit 1
fi

success "All env files present"

# ---- Build ----
log "Building images..."
docker compose -f docker-compose.prod.yml build --pull

# ---- Pull Ollama models (if container present) ----
if docker compose -f docker-compose.prod.yml ps ollama 2>/dev/null | grep -q ollama; then
  log "Pulling Ollama models (best-effort)..."
  docker compose -f docker-compose.prod.yml exec -T ollama ollama pull qwen2.5:7b || true
fi

# ---- Start DB first ----
log "Starting database + redis..."
docker compose -f docker-compose.prod.yml up -d postgres redis

log "Waiting for Postgres..."
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-styleai}" >/dev/null 2>&1; do
  sleep 2
done
success "Postgres ready"

# ---- Prisma migrate ----
log "Running Prisma migrations..."
docker compose -f docker-compose.prod.yml run --rm backend \
  npx prisma db push --accept-data-loss=false || \
  docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push

success "Database synced"

# ---- Start all ----
log "Starting all services..."
docker compose -f docker-compose.prod.yml up -d

# ---- Wait for health ----
log "Waiting for backend health..."
for i in {1..30}; do
  if curl -fsS http://localhost:4000/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# ---- Status ----
log "Service status:"
docker compose -f docker-compose.prod.yml ps

echo ""
success "Deploy complete! 🎉"
echo ""
echo "  Frontend:   http://localhost"
echo "  Backend:    http://localhost:4000/api/health"
echo "  AI service: http://localhost:8000/health"
echo ""
echo "Next: configure SSL — see DEPLOYMENT.md"