#!/usr/bin/env bash
# ai-ops Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]
#
# Environments:
#   staging   - Deploy to staging server
#   production - Deploy to production server (default)

set -euo pipefail

# ─── Config ──────────────────────────────────────
ENV="${1:-production}"
PROJECT_DIR="/home/den/.openclaw/workspace/ai-ops"
BACKUP_DIR="/home/den/backups/ai-ops"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Server configs
declare -A SERVERS=(
  [production]="den@server"
  [staging]="den@staging"
)

declare -A PORTS=(
  [production]="8081"
  [staging]="8082"
)

# ─── Helpers ─────────────────────────────────────
log() { echo -e "\033[1;34m[ai-ops]\033[0m $*"; }
ok()  { echo -e "\033[1;32m✓\033[0m $*"; }
warn(){ echo -e "\033[1;33m⚠\033[0m $*"; }
err() { echo -e "\033[1;31m✗\033[0m $*"; exit 1; }

# ─── Pre-flight checks ──────────────────────────
check_prerequisites() {
  log "Checking prerequisites..."

  command -v git >/dev/null 2>&1 || err "git not found"
  command -v node >/dev/null 2>&1 || err "node not found"
  command -v npm >/dev/null 2>&1 || err "npm not found"

  local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$node_version" -lt 22 ]; then
    warn "Node.js version $node_version < 22. Consider upgrading."
  fi

  ok "Prerequisites OK"
}

# ─── Backup ──────────────────────────────────────
create_backup() {
  log "Creating backup..."
  mkdir -p "$BACKUP_DIR"

  # Backup config files
  if [ -f "$PROJECT_DIR/backend/metrics-config.json" ]; then
    cp "$PROJECT_DIR/backend/metrics-config.json" "$BACKUP_DIR/metrics-config.json.$TIMESTAMP"
  fi
  if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$BACKUP_DIR/.env.$TIMESTAMP" 2>/dev/null || true
  fi

  # Backup database (if SQLite)
  if [ -f "$PROJECT_DIR/backend/data.db" ]; then
    cp "$PROJECT_DIR/backend/data.db" "$BACKUP_DIR/data.db.$TIMESTAMP" 2>/dev/null || true
  fi

  # Backup audit logs
  if [ -f "$PROJECT_DIR/backend/audit.log" ]; then
    cp "$PROJECT_DIR/backend/audit.log" "$BACKUP_DIR/audit.log.$TIMESTAMP" 2>/dev/null || true
  fi

  # Cleanup old backups (keep 7 days)
  find "$BACKUP_DIR" -name "*.timestamp" -mtime +7 -delete 2>/dev/null || true

  ok "Backup created in $BACKUP_DIR"
}

# ─── Build ──────────────────────────────────────
build() {
  log "Building..."
  cd "$PROJECT_DIR"

  # Install dependencies
  npm run install:all || err "npm install failed"

  # Build frontend
  cd frontend && npm run build || err "Frontend build failed"
  cd ..

  ok "Build complete"
}

# ─── Deploy ──────────────────────────────────────
deploy() {
  log "Deploying to $ENV..."

  # Stop service
  sudo systemctl stop ai-ops 2>/dev/null || true

  # Start service
  sudo systemctl start ai-ops

  # Wait for startup
  local port="${PORTS[$ENV]}"
  local max_retries=10
  local retry=0

  while [ $retry -lt $max_retries ]; do
    if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
      ok "Service is healthy on port $port"
      return 0
    fi
    retry=$((retry + 1))
    sleep 2
  done

  err "Service failed to start on port $port"
}

# ─── Rollback ────────────────────────────────────
rollback() {
  log "Rolling back..."

  if sudo systemctl restart ai-ops 2>/dev/null; then
    ok "Rollback complete"
    return 0
  fi

  err "Rollback failed"
}

# ─── Health Check ────────────────────────────────
health_check() {
  log "Running health checks..."
  local port="${PORTS[$ENV]}"

  # API health
  local status=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    ok "API health: OK (HTTP $status)"
  else
    warn "API health: FAIL (HTTP $status)"
  fi

  # WebSocket
  if timeout 5 bash -c 'echo > /dev/tcp/localhost/'"$port" >/dev/null 2>&1; then
    ok "Port $port: OPEN"
  else
    warn "Port $port: CLOSED"
  fi

  # Systemd
  if sudo systemctl is-active --quiet ai-ops; then
    ok "Systemd: active"
  else
    warn "Systemd: inactive"
  fi

  # Memory usage
  local mem=$(ps aux | grep "node.*index.js" | grep -v grep | awk '{sum+=$6} END {printf "%.0fMB", sum/1024}')
  log "Memory usage: $mem"

  # Logs
  local errors=$(sudo journalctl -u ai-ops --since "5 min ago" --no-pager 2>/dev/null | grep -ci "error" || echo "0")
  if [ "$errors" -gt 0 ]; then
    warn "Errors in last 5 min: $errors"
    sudo journalctl -u ai-ops --since "5 min ago" --no-pager -n 20 | tail -20
  else
    ok "No errors in last 5 min"
  fi
}

# ─── Main ────────────────────────────────────────
main() {
  log "🚀 ai-ops deployment to $ENV"
  log "Timestamp: $TIMESTAMP"
  echo "========================================"

  check_prerequisites
  create_backup
  build
  deploy
  health_check

  echo "========================================"
  ok "✅ Deployment to $ENV complete!"
  echo ""
  log "To rollback: ./scripts/deploy.sh rollback"
  log "To view logs: sudo journalctl -u ai-ops -f"
}

# Handle subcommands
case "${1:-deploy}" in
  deploy)
    shift
    main "$@"
    ;;
  rollback)
    rollback
    ;;
  health)
    health_check
    ;;
  backup)
    create_backup
    ;;
  *)
    err "Unknown command: $1"
    echo "Usage: $0 {deploy|rollback|health|backup}"
    ;;
esac
