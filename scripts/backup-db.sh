#!/usr/bin/env bash
# scripts/backup-db.sh
# Automated Postgres backup → ./backups/

set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/styleai_${TIMESTAMP}.sql.gz"

echo "[backup] Dumping database → $FILE"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-styleai}" -d "${POSTGRES_DB:-styleai}" \
  | gzip > "$FILE"

SIZE=$(du -h "$FILE" | cut -f1)
echo "[backup] ✓ Saved ($SIZE)"

# Keep last 14 daily backups
ls -1t "$BACKUP_DIR"/styleai_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "[backup] Cleanup: kept last 14"