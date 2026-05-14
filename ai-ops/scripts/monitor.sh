#!/usr/bin/env bash
# ai-ops Monitor — Health checks & metrics
# Usage: ./scripts/monitor.sh [--json] [--alert]
# Cron: */5 * * * * /home/den/.openclaw/workspace/ai-ops/scripts/monitor.sh --alert

set -euo pipefail

PORT="${AI_OPS_PORT:-8081}"
HOST="${AI_OPS_HOST:-localhost}"
ALERT_THRESHOLD_CPU=90
ALERT_THRESHOLD_MEM=90
ALERT_THRESHOLD_GPU=95
ALERT_THRESHOLD_VRAM=90
ALERT_THRESHOLD_TEMP=85
ALERT_THRESHOLD_ERRORS=10
LOG_FILE="/var/log/ai-ops/monitor.log"
ALERT_LOG="/var/log/ai-ops/alerts.log"

# ─── Colors ──────────────────────────────────────
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
CYAN='\033[1;36m'
RESET='\033[0m'

# ─── Helpers ─────────────────────────────────────
log() {
  local ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${CYAN}[$ts]${RESET} $*" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "${CYAN}[$ts]${RESET} $*"
}

alert() {
  local ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${RED}[$ts] ALERT:${RESET} $*" | tee -a "$ALERT_LOG" 2>/dev/null || echo -e "${RED}[$ts] ALERT:${RESET} $*"

  # Telegram notification (if TELEGRAM_BOT_TOKEN set)
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -sf -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=🚨 *AI Ops Alert*\n\n$*" \
      -d "parse_mode=Markdown" >/dev/null 2>&1 || true
  fi
}

# ─── Checks ──────────────────────────────────────
check_service() {
  log "Checking service..."

  # Systemd status
  if systemctl is-active --quiet ai-ops 2>/dev/null; then
    echo -e "  ${GREEN}✓${RESET} systemd: active"
  else
    echo -e "  ${RED}✗${RESET} systemd: inactive"
    alert "ai-ops service is INACTIVE"
    return 1
  fi

  # HTTP health
  local http_code
  http_code=$(curl -sf -o /dev/null -w "%{http_code}" "http://${HOST}:${PORT}/health" 2>/dev/null || echo "000")

  if [ "$http_code" = "200" ]; then
    echo -e "  ${GREEN}✓${RESET} HTTP health: OK (200)"
  else
    echo -e "  ${RED}✗${RESET} HTTP health: FAIL (HTTP $http_code)"
    alert "HTTP health check failed (HTTP $http_code)"
    return 1
  fi

  # WebSocket port
  if timeout 3 bash -c "echo > /dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
    echo -e "  ${GREEN}✓${RESET} Port $PORT: OPEN"
  else
    echo -e "  ${RED}✗${RESET} Port $PORT: CLOSED"
    alert "Port $PORT is CLOSED"
    return 1
  fi
}

check_resources() {
  log "Checking system resources..."

  # CPU
  local cpu_usage
  cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' 2>/dev/null || echo "0")
  local cpu_int=${cpu_usage%.*}
  if [ "${cpu_int:-0}" -ge "$ALERT_THRESHOLD_CPU" ]; then
    echo -e "  ${RED}✗${RESET} CPU: ${cpu_usage}% (threshold: ${ALERT_THRESHOLD_CPU}%)"
    alert "CPU usage: ${cpu_usage}%"
  else
    echo -e "  ${GREEN}✓${RESET} CPU: ${cpu_usage}%"
  fi

  # Memory
  local mem_info
  mem_info=$(free | grep Mem)
  local mem_total=$(echo "$mem_info" | awk '{print $2}')
  local mem_used=$(echo "$mem_info" | awk '{print $3}')
  local mem_percent=$((mem_used * 100 / mem_total))

  if [ "$mem_percent" -ge "$ALERT_THRESHOLD_MEM" ]; then
    echo -e "  ${RED}✗${RESET} Memory: ${mem_percent}% (${mem_used}MB/${mem_total}MB)"
    alert "Memory usage: ${mem_percent}%"
  else
    echo -e "  ${GREEN}✓${RESET} Memory: ${mem_percent}%"
  fi

  # Disk
  local disk_usage
  disk_usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
  if [ "${disk_usage:-0}" -ge 90 ]; then
    echo -e "  ${RED}✗${RESET} Disk: ${disk_usage}%"
    alert "Disk usage: ${disk_usage}%"
  else
    echo -e "  ${GREEN}✓${RESET} Disk: ${disk_usage}%"
  fi
}

check_gpu() {
  log "Checking GPU..."

  # Try nvidia-smi
  if command -v nvidia-smi >/dev/null 2>&1; then
    local gpu_mem
    gpu_mem=$(nvidia-smi --query-gpu=memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits 2>/dev/null | head -1)

    if [ -n "$gpu_mem" ]; then
      local gpu_used=$(echo "$gpu_mem" | cut -d',' -f1)
      local gpu_total=$(echo "$gpu_mem" | cut -d',' -f2)
      local gpu_temp=$(echo "$gpu_mem" | cut -d',' -f3)

      local gpu_percent=$((gpu_used * 100 / gpu_total))
      local vram_percent=$((gpu_used * 100 / gpu_total))

      if [ "$gpu_percent" -ge "$ALERT_THRESHOLD_GPU" ]; then
        echo -e "  ${RED}✗${RESET} GPU: ${gpu_percent}% (${gpu_used}MB/${gpu_total}MB)"
        alert "GPU usage: ${gpu_percent}%"
      else
        echo -e "  ${GREEN}✓${RESET} GPU: ${gpu_percent}%"
      fi

      if [ "$vram_percent" -ge "$ALERT_THRESHOLD_VRAM" ]; then
        echo -e "  ${RED}✗${RESET} VRAM: ${vram_percent}%"
        alert "VRAM usage: ${vram_percent}%"
      else
        echo -e "  ${GREEN}✓${RESET} VRAM: ${vram_percent}%"
      fi

      if [ "${gpu_temp:-0}" -ge "$ALERT_THRESHOLD_TEMP" ]; then
        echo -e "  ${RED}✗${RESET} GPU Temp: ${gpu_temp}°C"
        alert "GPU temperature: ${gpu_temp}°C"
      else
        echo -e "  ${GREEN}✓${RESET} GPU Temp: ${gpu_temp}°C"
      fi
    else
      echo -e "  ${YELLOW}?${RESET} GPU: no data"
    fi
  else
    echo -e "  ${YELLOW}?${RESET} GPU: nvidia-smi not available"
  fi
}

check_errors() {
  log "Checking application errors..."

  # Count recent errors
  local errors
  errors=$(sudo journalctl -u ai-ops --since "10 min ago" --no-pager 2>/dev/null | grep -ci "error" || echo "0")

  if [ "$errors" -ge "$ALERT_THRESHOLD_ERRORS" ]; then
    echo -e "  ${RED}✗${RESET} Errors (10m): $errors"
    alert "Application errors: $errors in last 10 minutes"
  else
    echo -e "  ${GREEN}✓${RESET} Errors (10m): $errors"
  fi

  # Check for OOM kills
  local oom_count
  oom_count=$(dmesg 2>/dev/null | grep -ci "out of memory" || echo "0")
  if [ "$oom_count" -gt 0 ]; then
    echo -e "  ${RED}✗${RESET} OOM kills detected: $oom_count"
    alert "OOM kills detected: $oom_count"
  else
    echo -e "  ${GREEN}✓${RESET} OOM kills: 0"
  fi
}

check_uptime() {
  log "Checking uptime..."

  local uptime_seconds
  uptime_seconds=$(systemd-catalog --list 2>/dev/null || uptime -s)
  local uptime_str
  uptime_str=$(uptime -p 2>/dev/null || echo "unknown")

  echo -e "  ${GREEN}✓${RESET} Uptime: $uptime_str"
}

# ─── Dashboard ───────────────────────────────────
show_dashboard() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}║${RESET}         ${CYAN}🤖 AI Ops Monitor${RESET}               ${CYAN}║${RESET}"
  echo -e "${CYAN}╠══════════════════════════════════════════╣${RESET}"

  check_service
  echo ""
  check_resources
  echo ""
  check_gpu
  echo ""
  check_errors
  echo ""
  check_uptime

  echo -e "${CYAN}╚══════════════════════════════════════════╝${RESET}"
  echo ""
}

# ─── Main ────────────────────────────────────────
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
mkdir -p "$(dirname "$ALERT_LOG")" 2>/dev/null || true

case "${1:-}" in
  --json)
    show_dashboard 2>/dev/null
    ;;
  --alert)
    # Quiet mode for cron — only output on alerts
    check_service 2>/dev/null || true
    check_errors 2>/dev/null || true
    ;;
  *)
    show_dashboard
    ;;
esac
