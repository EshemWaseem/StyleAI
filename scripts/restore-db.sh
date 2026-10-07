#!/usr/bin/env bash
# scripts/restore-db.sh <backup.sql.gz>
# ⚠️ Destructive — replaces current DB

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql.gz>"
  exit 1
fi

FILE="$1"
[ -f "$FILE" ] || { echo "File not found: $FILE"; exit 1; }

echo "[restore] ⚠️  This will REPLACE the current database."
read -p "Type YES to continue: " confirm
[ "$confirm" = "YES" ] || { echo "Aborted."; exit 1; }

cd "$(dirname "$0")/.."

gunzip -c "$FILE" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${POSTGRES_USER:-styleai}" -d "${POSTGRES_DB:-styleai}"

echo "[restore] ✓ Complete"