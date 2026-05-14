#!/usr/bin/env bash
# ai-ops Backup Script
# Usage: ./scripts/backup.sh [--full|--config|--auto]
# Cron: 0 3 * * * /home/den/.openclaw/workspace/ai-ops/scripts/backup.sh --auto

set -euo pipefail

PROJECT_DIR="/home/den/.openclaw/workspace/ai-ops"
BACKUP_ROOT="/home/den/backups/ai-ops"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# ─── Helpers ─────────────────────────────────────
log() { echo "[ai-ops-backup] $(date '+%H:%M:%S') $*"; }
ok()  { echo "[ai-ops-backup] ✓ $*"; }

# ─── Backup config ──────────────────────────────
backup_config() {
  local backup_dir="$BACKUP_ROOT/config/$TIMESTAMP"
  mkdir -p "$backup_dir"

  log "Backing up config..."

  # Metrics config
  if [ -f "$PROJECT_DIR/backend/metrics-config.json" ]; then
    cp "$PROJECT_DIR/backend/metrics-config.json" "$backup_dir/"
    ok "metrics-config.json"
  fi

  # .env (exclude secrets in production)
  if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$backup_dir/.env"
    ok ".env"
  fi

  # User database
  if [ -f "$PROJECT_DIR/backend/users.json" ]; then
    cp "$PROJECT_DIR/backend/users.json" "$backup_dir/"
    ok "users.json"
  fi

  # Backup metadata
  cat > "$backup_dir/backup.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "type": "config",
  "project": "ai-ops",
  "files": ["metrics-config.json", ".env", "users.json"]
}
EOF
}

# ─── Backup data ────────────────────────────────
backup_data() {
  local backup_dir="$BACKUP_ROOT/data/$TIMESTAMP"
  mkdir -p "$backup_dir"

  log "Backing up data..."

  # SQLite database (if exists)
  if [ -f "$PROJECT_DIR/backend/data.db" ]; then
    cp "$PROJECT_DIR/backend/data.db" "$backup_dir/"
    ok "data.db"
  fi

  # Audit logs
  if [ -f "$PROJECT_DIR/backend/audit.log" ]; then
    cp "$PROJECT_DIR/backend/audit.log" "$backup_dir/"
    ok "audit.log"
  fi

  # Application logs
  if [ -d "/var/log/ai-ops" ]; then
    cp -r /var/log/ai-ops "$backup_dir/" 2>/dev/null || true
    ok "logs/"
  fi
}

# ─── Backup frontend build ──────────────────────
backup_build() {
  local backup_dir="$BACKUP_ROOT/build/$TIMESTAMP"
  mkdir -p "$backup_dir"

  log "Backing up build..."

  if [ -d "$PROJECT_DIR/frontend/dist" ]; then
    cp -r "$PROJECT_DIR/frontend/dist" "$backup_dir/"
    ok "frontend/dist"
  fi
}

# ─── Cleanup old backups ────────────────────────
cleanup() {
  log "Cleaning up old backups (>${RETENTION_DAYS} days)..."

  local count=0
  for dir in "$BACKUP_ROOT"/config/*/; do
    if [ -d "$dir" ]; then
      local age_days=$(( ($(date +%s) - $(stat -c %Y "$dir")) / 86400 ))
      if [ "$age_days" -gt "$RETENTION_DAYS" ]; then
        rm -rf "$dir"
        count=$((count + 1))
      fi
    fi
  done

  ok "Removed $count old backup(s)"
}

# ─── Create manifest ────────────────────────────
create_manifest() {
  local manifest="$BACKUP_ROOT/manifest.json"

  cat > "$manifest" <<EOF
{
  "last_backup": "$TIMESTAMP",
  "retention_days": $RETENTION_DAYS,
  "backups": {
    "total": $(ls -d "$BACKUP_ROOT"/*/ 2>/dev/null | wc -l),
    "config": $(ls -d "$BACKUP_ROOT/config"/*/ 2>/dev/null | wc -l),
    "data": $(ls -d "$BACKUP_ROOT/data"/*/ 2>/dev/null | wc -l),
    "build": $(ls -d "$BACKUP_ROOT/build"/*/ 2>/dev/null | wc -l)
  }
}
EOF
}

# ─── Main ────────────────────────────────────────
mkdir -p "$BACKUP_ROOT"

case "${1:---auto}" in
  --full)
    log "Starting full backup..."
    backup_config
    backup_data
    backup_build
    ;;
  --config)
    log "Starting config backup..."
    backup_config
    ;;
  --data)
    log "Starting data backup..."
    backup_data
    ;;
  --auto)
    log "Starting automated backup..."
    backup_config
    backup_data
    ;;
  --cleanup)
    cleanup
    ;;
  *)
    echo "Usage: $0 {--full|--config|--data|--auto|--cleanup}"
    exit 1
    ;;
esac

create_manifest
cleanup

ok "Backup complete: $BACKUP_ROOT/$TIMESTAMP"
log "Manifest: $BACKUP_ROOT/manifest.json"
