# scripts/deploy.ps1
# One-command deploy for StyleAI (production) — Windows

$ErrorActionPreference = "Stop"

function log($msg)     { Write-Host "[deploy] $msg" -ForegroundColor Blue }
function success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function warn($msg)    { Write-Host "[!] $msg" -ForegroundColor Yellow }
function error($msg)   { Write-Host "[X] $msg" -ForegroundColor Red }

Set-Location (Split-Path $PSScriptRoot -Parent)

# Pre-flight
log "Pre-flight checks..."
if (-not (Test-Path ".env")) { error "Root .env missing"; exit 1 }
if (-not (Test-Path "backend\.env")) { error "backend/.env missing"; exit 1 }
if (-not (Test-Path "ai-services\.env")) { error "ai-services/.env missing"; exit 1 }
success "Env files present"

log "Building images..."
docker compose -f docker-compose.prod.yml build --pull

log "Starting DB + Redis..."
docker compose -f docker-compose.prod.yml up -d postgres redis

log "Waiting for Postgres..."
$pgUser = (Get-Content .env | Select-String "^POSTGRES_USER=" | ForEach-Object { $_ -replace "^POSTGRES_USER=", "" })
Start-Sleep -Seconds 8

log "Syncing schema..."
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push

log "Starting all services..."
docker compose -f docker-compose.prod.yml up -d

log "Waiting for backend health..."
for ($i = 0; $i -lt 30; $i++) {
  try {
    Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing -TimeoutSec 3 | Out-Null
    break
  } catch { Start-Sleep -Seconds 2 }
}

docker compose -f docker-compose.prod.yml ps
success "Deploy complete!"