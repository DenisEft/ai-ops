#!/bin/bash
# =============================================
# Умный мониторинг сервисов Lora
# =============================================
# Проверяет все критичные сервисы, бэкапит конфиги,
# авто-рестартит упавшие, мониторит ресурсы,
# шлёт алерты в Telegram с cooldown 15 мин.
# =============================================

set -o pipefail

LOG="/home/den/.openclaw/workspace/scripts/monitor.log"
BACKUP_DIR="/home/den/.openclaw/workspace/scripts/backups"
STATE_FILE="/home/den/.openclaw/workspace/scripts/monitor-state.json"
WORKSPACE="/home/den/.openclaw/workspace"
USER="den"

mkdir -p "$BACKUP_DIR"

# ======================== УТИЛИТЫ ========================

log() {
  echo "[$(date '+%H:%M:%S')] $1" >> "$LOG"
}

# Отправить алерт в Telegram (cooldown 15 мин)
send_alert() {
  local title="$1"
  local body="$2"
  local msg="🔔 *$title*\n\n$body\n\n_$(date '+%Y-%m-%d %H:%M')_"

  # Проверяем cooldown
  local last_alert=0
  if [ -f "$STATE_FILE" ]; then
    last_alert=$(python3 -c "
import json
try:
    with open('$STATE_FILE') as f: print(json.load(f).get('last_alert_ts', 0))
except: print(0)
" 2>/dev/null || echo 0)
  fi

  local now=$(date +%s)
  local diff=$((now - last_alert))

  if [ "$diff" -lt 900 ]; then
    log "  cooldown: $((900 - diff)) сек до след. алерта"
    return 0
  fi

  # Обновляем timestamp
  python3 -c "
import json, os
s = {'last_alert_ts': $now}
sf = '$STATE_FILE'
try:
    with open(sf) as f: s.update(json.load(f))
except: pass
with open(sf, 'w') as f: json.dump(s, f)
"

  log "  отправляю алерт: $title"

  curl -s -X POST "https://api.telegram.org/bot7915468029:AAE0gUJy7UwMv2qj8xMv1bJqBqYQz7Xq3fA/sendMessage" \
    -d "chat_id=1101538326" \
    -d "text=$(echo -e "$msg")" \
    -d "parse_mode=Markdown" 2>/dev/null &
}

# Бэкап всех конфигов
backup_configs() {
  local ts=$(date +%Y%m%d-%H%M%S)
  local backup="$BACKUP_DIR/configs-$ts.tar.gz"
  local user_home="/home/$USER"

  tar czf "$backup" \
    /etc/systemd/system/llama-8080.service \
    /etc/systemd/system/llama-panel.service \
    "$user_home/.openclaw/openclaw.json" \
    "$WORKSPACE/llama-panel/backend/metrics-config.json" \
    "$WORKSPACE/.openclaw/openclaw.json" \
    "$WORKSPACE/AGENTS.md" \
    "$WORKSPACE/MEMORY.md" \
    "$WORKSPACE/TOOLS.md" \
    "$WORKSPACE/SOUL.md" \
    "$WORKSPACE/USER.md" \
    2>/dev/null

  if [ -f "$backup" ]; then
    local size=$(du -h "$backup" | cut -f1)
    log "  💾 бэкап: configs-$ts.tar.gz ($size)"

    # Храним максимум 10 бэкапов
    ls -t "$BACKUP_DIR"/configs-*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
    return 0
  fi

  log "  ⚠️ бэкап не удался"
  return 1
}

# Системный бэкап: копируем важные файлы в backups/
backup_files() {
  local ts=$(date +%Y%m%d-%H%M%S)
  local dir="$BACKUP_DIR/files-$ts"
  mkdir -p "$dir"

  local src_files=(
    "/etc/systemd/system/llama-8080.service"
    "/etc/systemd/system/llama-panel.service"
    "$WORKSPACE/llama-panel/backend/metrics-config.json"
    "$WORKSPACE/.openclaw/openclaw.json"
    "$WORKSPACE/scripts/monitor.sh"
  )

  local copied=0
  for f in "${src_files[@]}"; do
    if [ -f "$f" ]; then
      cp -n "$f" "$dir/" 2>/dev/null
      if [ $? -eq 0 ]; then
        log "  📄 бэкап: $(basename "$f")"
        copied=$((copied + 1))
      fi
    fi
  done

  # Архивируем
  if [ "$copied" -gt 0 ]; then
    tar czf "$BACKUP_DIR/files-$ts.tar.gz" -C "$BACKUP_DIR" "files-$ts" 2>/dev/null
    rm -rf "$dir"
    log "  ✅ файловый бэкап: $copied файлов"
    # Храним максимум 5 архивов
    ls -t "$BACKUP_DIR"/files-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
  fi
}

# Рестартнуть сервис (системный или user)
restart_service() {
  local service="$1"
  local mode="$2"  # system или user

  if [ "$mode" = "user" ]; then
    sudo -u $USER -H systemctl --user restart "$service" 2>/dev/null
  else
    systemctl restart "$service" 2>/dev/null
  fi
}

# Проверить systemd сервис и рестартнуть при необходимости
check_systemd() {
  local service="$1"
  local desc="$2"
  local mode="${3:-system}"  # system или user

  # Скрипт крутится от den → user сервисы через systemctl --user напрямую
  local check_cmd="systemctl --user is-active $service"
  [ "$mode" = "system" ] && check_cmd="systemctl is-active $service"

  local status=$(eval "$check_cmd" 2>/dev/null)

  if [ "$status" != "active" ]; then
    log "  ❌ $desc ($service) — НЕ работает ($status)"

    # Бэкап перед рестартом
    backup_configs
    backup_files

    # Пробуем рестартнуть
    log "  🔧 рестарт $desc..."
    restart_service "$service" "$mode"
    sleep 3

    # Проверяем результат
    status=$(eval "$check_cmd" 2>/dev/null)

    if [ "$status" = "active" ]; then
      log "  ✅ $desc восстановлен"
      send_alert "🔧 Сервис восстановлен" "*$desc* ($service)\nСтатус: **active** после авто-рестарта"
    else
      log "  🚨 $desc НЕ удалось рестартнуть!"
      send_alert "🚨 Сервис упал" "*$desc* ($service)\nСтатус: *$status*\nНужна ручная проверка!"
    fi
    return 1
  fi

  log "  ✅ $desc OK"
  return 0
}

# HTTP health-check с авто-рестартом
check_http() {
  local host="$1"
  local port="$2"
  local desc="$3"
  local expected_code="${4:-200}"

  local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${host}:${port}/" 2>/dev/null)

  if [ "$http_code" != "$expected_code" ]; then
    log "  ❌ $desc (:$port) — HTTP $http_code"

    # Бэкап перед рестартом
    backup_configs

    # Ищем systemd сервис по порту
    local svc=""
    local svc_mode="system"
    case "$port" in
      8080) svc="llama-8080.service" ;;
      8081) svc="llama-panel.service" ;;
      18789) svc="openclaw-gateway.service"; svc_mode="user" ;;
    esac

    if [ -n "$svc" ]; then
      log "  🔧 рестарт $svc..."
      restart_service "$svc" "$svc_mode"
      sleep 5

      http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${host}:${port}/" 2>/dev/null)

      if [ "$http_code" = "$expected_code" ]; then
        log "  ✅ $desc (:$port) восстановлен"
        send_alert "🔧 Порт восстановлен" "*$desc* порт $port\nБыло: \`$http_code\` → **OK**"
      else
        log "  🚨 $desc (:$port) всё ещё не работает ($http_code)"
        send_alert "🚨 Порт не восстановлен" "*$desc* порт $port\nHTTP: $http_code\nНужна ручная проверка!"
      fi
    else
      log "  ⚠️ Нет systemd сервиса для порта $port"
    fi
    return 1
  fi

  log "  ✅ $desc (:$port) OK"
  return 0
}

# Проверить ресурсы системы
check_resources() {
  # Диск
  local disk_pct=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
  if [ "$disk_pct" -gt 90 ] 2>/dev/null; then
    log "  🚨 Диск: ${disk_pct}%"
    send_alert "💾 Диск полный" "Использование: *${disk_pct}%*\nСвободно: \$(df -h / | tail -1 | awk '{print \$4}')\nНужна очистка!"
  elif [ "$disk_pct" -gt 80 ] 2>/dev/null; then
    log "  ⚠️ Диск: ${disk_pct}%"
  else
    log "  ✅ Диск: ${disk_pct}%"
  fi

  # Память
  local mem_total=$(free -m | grep Mem | awk '{print $2}')
  local mem_used=$(free -m | grep Mem | awk '{print $3}')
  local mem_pct=0
  if [ "$mem_total" -gt 0 ] 2>/dev/null; then
    mem_pct=$((mem_used * 100 / mem_total))
  fi

  if [ "$mem_pct" -gt 90 ] 2>/dev/null; then
    log "  🚨 RAM: ${mem_pct}%"
    send_alert "🧠 RAM заполнен" "Использование: *${mem_pct}%*\nСвободно: \$(free -h | grep Mem | awk '{print \$4}')\nМожет упасть llama-server"
  elif [ "$mem_pct" -gt 80 ] 2>/dev/null; then
    log "  ⚠️ RAM: ${mem_pct}%"
  else
    log "  ✅ RAM: ${mem_pct}%"
  fi

  # Load average
  local cores=$(nproc)
  local load_int=$(cat /proc/loadavg | awk '{print $1}' | cut -d. -f1)
  if [ "$load_int" -gt "$cores" ] 2>/dev/null; then
    local load=$(cat /proc/loadavg | awk '{print $1}')
    log "  ⚠️ Load: $load (cores: $cores)"
  else
    local load=$(cat /proc/loadavg | awk '{print $1}')
    log "  ✅ Load: $load"
  fi
}

# Проверка user-сервиса: systemd + HTTP fallback
# systemd unreliable в cron-контексте, поэтому проверяем порт
check_user_service() {
  local service="$1"
  local desc="$2"
  local port="$3"

  local status
  status=$(systemctl --user is-active "$service" 2>/dev/null)

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:${port}/" 2>/dev/null)

  if [ "$status" = "active" ] || [ "$http_code" = "200" ]; then
    log "  ✅ $desc OK (systemd=$status http=$http_code)"
    return 0
  fi

  log "  ❌ $desc ($service) — systemd=$status http=$http_code"
  backup_configs
  backup_files

  log "  🔧 рестарт $desc..."
  sudo -u $USER -H systemctl --user restart "$service" 2>/dev/null
  sleep 3

  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:${port}/" 2>/dev/null)

  if [ "$http_code" = "200" ]; then
    log "  ✅ $desc восстановлен"
    send_alert "🔧 Сервис восстановлен" "*${desc}* ($service)\nПорт $port: **OK** после рестарта"
  else
    log "  🚨 $desc НЕ удалось рестартнуть!"
    send_alert "🚨 Сервис упал" "*${desc}* ($service)\nНужна ручная проверка!"
  fi
  return 1
}

# ======================== ОСНОВНОЙ ЦИКЛ ========================

log "========== MONITOR CYCLE =========="

# --- 1. Systemd сервисы ---
check_systemd "llama-8080.service" "llama-server" "system"
check_systemd "llama-panel.service" "llama-panel" "system"
# --- 1.5 OpenClaw (user service, systemd unreliable в cron) ---
check_user_service "openclaw-gateway.service" "OpenClaw" "18789"

# --- 2. HTTP health-проверки (llama-server, llama-panel) ---
check_http "127.0.0.1" 8080 "llama-server" "200"
check_http "127.0.0.1" 8081 "llama-panel" "200"

# --- 3. MajordomoSL (умный дом) ---
majordomo_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://192.168.0.111/ 2>/dev/null)
if [ "$majordomo_status" = "200" ]; then
  log "  ✅ Majordomo OK"
else
  log "  ⚠️ Majordomo не отвечает (HTTP $majordomo_status)"
fi

# --- 4. Ресурсы системы ---
check_resources

# --- 5. Анализ логов (execSync баг llama-panel) ---
panel_errors=$(journalctl -u llama-panel.service --since "5 min ago" --no-pager 2>/dev/null | grep -c "execSync\|Error" || echo 0)
if [ "$panel_errors" -gt 5 ] 2>/dev/null; then
  log "  ⚠️ llama-panel ошибок за 5 мин: $panel_errors"
  send_alert "⚠️ Ошибки llama-panel" "Ошибок за 5 мин: *$panel_errors*\nПроверь логи llama-panel"
fi

# --- 6. Утечка логов OpenClaw ---
ocl_log="/tmp/openclaw/openclaw.log"
if [ -f "$ocl_log" ]; then
  ocl_size=$(du -m "$ocl_log" | cut -f1)
  if [ "$ocl_size" -gt 500 ] 2>/dev/null; then
    log "  ⚠️ openclaw.log: ${ocl_size}MB — нужна ротация"
  else
    log "  ✅ openclaw.log: ${ocl_size}MB"
  fi
fi

# --- 7. Ротация собственного лога ---
if [ -f "$LOG" ]; then
  log_lines=$(wc -l < "$LOG")
  if [ "$log_lines" -gt 10000 ]; then
    tail -5000 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
    log "  🗑 ротация лога (было $log_lines строк)"
  fi
fi

log "=================================="
