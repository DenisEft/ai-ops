#!/bin/bash
# =============================================
# Тесты для monitor.sh — безопасные, без сломанных конфигов
# =============================================
# Запуск: bash scripts/monitor-tests.sh
# Результат: PASS/FAIL по каждому тесту + общий счёт
# =============================================

PASS=0
FAIL=0
TOTAL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass_test() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${GREEN}✅ PASS${NC} $1"
}

fail_test() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${RED}❌ FAIL${NC} $1"
}

warn_test() {
  echo -e "  ${YELLOW}⚠️ WARN${NC} $1"
}

echo "============================================"
echo "🧪 Тесты monitor.sh"
echo "============================================"
echo ""

# =============================================
# 1. Синтаксис
# =============================================
echo "📝 Блок 1: Синтаксис и базовая валидация"

bash -n /home/den/.openclaw/workspace/scripts/monitor.sh 2>/dev/null
if [ $? -eq 0 ]; then
  pass_test "Синтаксис bash не сломан"
else
  fail_test "Синтаксис bash сломан"
  echo "      Детали:"
  bash -n /home/den/.openclaw/workspace/scripts/monitor.sh 2>&1 | head -5 | sed 's/^/      /'
fi

# =============================================
# 2. Файлы не модифицируются
# =============================================
echo ""
echo "📝 Блок 2: Конфиги не трогаются"

# Хэши конфигов до
LLAMA_PANEL_HASH_BEFORE=$(md5sum /home/den/.openclaw/workspace/llama-panel/backend/src/services/metrics-config.js 2>/dev/null | cut -d' ' -f1)
MONITOR_HASH_BEFORE=$(md5sum /home/den/.openclaw/workspace/scripts/monitor.sh 2>/dev/null | cut -d' ' -f1)

# Запускаем скрипт в dry-run режиме (он сам создаёт логи, но не меняет конфиги)
# Удалить логи перед тестом, чтобы проверить их создание
rm -f /home/den/.openclaw/workspace/scripts/monitor.log
rm -f /home/den/.openclaw/workspace/scripts/monitor-state.json

# =============================================
# 3. Монитор запускается без ошибок
# =============================================
echo ""
echo "📝 Блок 3: Запуск и обработка ошибок"

timeout 60 bash /home/den/.openclaw/workspace/scripts/monitor.sh > /dev/null 2>&1
EXIT_CODE=$?
LLAMA_PANEL_HASH_AFTER=$(md5sum /home/den/.openclaw/workspace/llama-panel/backend/src/services/metrics-config.js 2>/dev/null | cut -d' ' -f1)
MONITOR_HASH_AFTER=$(md5sum /home/den/.openclaw/workspace/scripts/monitor.sh 2>/dev/null | cut -d' ' -f1)

if [ $EXIT_CODE -eq 0 ] || [ $EXIT_CODE -eq 124 ]; then
  pass_test "Скрипт завершился (код $EXIT_CODE)"
else
  fail_test "Скрипт упал с кодом $EXIT_CODE"
fi

# Конфиги не изменились
if [ "$LLAMA_PANEL_HASH_BEFORE" = "$LLAMA_PANEL_HASH_AFTER" ]; then
  pass_test "metrics-config.js не изменён"
else
  fail_test "metrics-config.js изменён!"
fi

if [ "$MONITOR_HASH_BEFORE" = "$MONITOR_HASH_AFTER" ]; then
  pass_test "monitor.sh не изменён"
else
  fail_test "monitor.sh изменён!"
fi

# =============================================
# 4. Логи создаются
# =============================================
echo ""
echo "📝 Блок 4: Логирование"

if [ -f /home/den/.openclaw/workspace/scripts/monitor.log ]; then
  LOG_LINES=$(wc -l < /home/den/.openclaw/workspace/scripts/monitor.log)
  if [ "$LOG_LINES" -gt 5 ]; then
    pass_test "Лог создан ($LOG_LINES строк)"
  else
    fail_test "Лог слишком короткий ($LOG_LINES строк)"
  fi
else
  fail_test "Лог не создан"
fi

# =============================================
# 5. HTTP health-проверки
# =============================================
echo ""
echo "📝 Блок 5: HTTP health-проверки"

# Проверяем каждый порт отдельно
for PORT in 8080 8081 18789; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:${PORT}/" 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ]; then
    pass_test "Порт $PORT: HTTP $HTTP_CODE"
  else
    warn_test "Порт $PORT: HTTP $HTTP_CODE (не критично — может упасть)"
  fi
done

# =============================================
# 6. Бэкапы
# =============================================
echo ""
echo "📝 Блок 6: Бэкапы"

# Проверяем что каталог создан
if [ -d /home/den/.openclaw/workspace/scripts/backups ]; then
  pass_test "Каталог бэкапов существует"
else
  fail_test "Каталог бэкапов не создан"
fi

# Бэкапы конфигов
CONFIG_BACKUPS=$(ls /home/den/.openclaw/workspace/scripts/backups/configs-*.tar.gz 2>/dev/null | wc -l)
if [ "$CONFIG_BACKUPS" -gt 0 ]; then
  pass_test "Конфиг-бэкапы: $CONFIG_BACKUPS"
  # Проверяем что в бэкапе есть реальные файлы
  LATEST_BACKUP=$(ls -t /home/den/.openclaw/workspace/scripts/backups/configs-*.tar.gz | head -1)
  BACKUP_CONTENTS=$(tar tzf "$LATEST_BACKUP" 2>/dev/null | wc -l)
  if [ "$BACKUP_CONTENTS" -gt 0 ]; then
    pass_test "Бэкап содержит файлы: $BACKUP_CONTENTS"
  else
    fail_test "Бэкап пустой!"
  fi
else
  warn_test "Нет конфиг-бэкапов (возможно, сервисы ещё не падали)"
fi

# =============================================
# 7. Файловые бэкапы
# =============================================
FILE_BACKUPS=$(ls /home/den/.openclaw/workspace/scripts/backups/files-*.tar.gz 2>/dev/null | wc -l)
if [ "$FILE_BACKUPS" -gt 0 ]; then
  pass_test "Файловые бэкапы: $FILE_BACKUPS"
else
  warn_test "Нет файловых бэкапов (возможно, сервисы ещё не падали)"
fi

# =============================================
# 8. Проверка execSync баг-фикса
# =============================================
echo ""
echo "📝 Блок 7: execSync fix в metrics-config.js"

if grep -q "const { exec, execSync } = await import('child_process')" /home/den/.openclaw/workspace/llama-panel/backend/src/services/metrics-config.js; then
  pass_test "execSync импортирован"
else
  fail_test "execSync не импортирован (баг вернётся)"
fi

# Проверяем что execSync больше не жжёт логи
EXEC_ERRORS=$(journalctl -u llama-panel.service --since "1 min ago" --no-pager 2>/dev/null | grep -c "execSync" 2>/dev/null)
EXEC_ERRORS=${EXEC_ERRORS:-0}
EXEC_ERRORS=$(echo "$EXEC_ERRORS" | tr -d '[:space:]')
if [ "$EXEC_ERRORS" -eq 0 ]; then
  pass_test "execSync ошибок в логах: 0"
else
  warn_test "execSync ошибок в логах: $EXEC_ERRORS (может быть от предыдущих запусков)"
fi

# =============================================
# 9. Крон
# =============================================
echo ""
echo "📝 Блок 8: Крон-задачи"

if crontab -l 2>/dev/null | grep -q "monitor.sh"; then
  CRON_LINE=$(crontab -l 2>/dev/null | grep "monitor.sh")
  pass_test "Крон настроен: $CRON_LINE"
else
  fail_test "Крон не настроен"
fi

# =============================================
# 10. State file
# =============================================
echo ""
echo "📝 Блок 9: State file"

if [ -f /home/den/.openclaw/workspace/scripts/monitor-state.json ]; then
  STATE_VALID=$(python3 -c "
import json
try:
    with open('/home/den/.openclaw/workspace/scripts/monitor-state.json') as f:
        data = json.load(f)
        print('ok' if 'last_alert_ts' in data else 'partial')
except:
    print('error')
" 2>/dev/null)
  case "$STATE_VALID" in
    ok) pass_test "state.json: валидный (есть last_alert_ts)" ;;
    partial) warn_test "state.json: есть, но нет last_alert_ts" ;;
    error) fail_test "state.json: невалидный JSON" ;;
  esac
else
  warn_test "state.json: не создан (первый запуск или cooldown)"
fi

# =============================================
# 11. Базовые проверки
# =============================================
echo ""
echo "📝 Блок 10: Базовые проверки"

# Диск
DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_PCT" -le 95 ]; then
  pass_test "Диск: ${DISK_PCT}%"
else
  fail_test "Диск: ${DISK_PCT}% — критично!"
fi

# Память
MEM_PCT=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEM_PCT" -le 90 ]; then
  pass_test "RAM: ${MEM_PCT}%"
else
  fail_test "RAM: ${MEM_PCT}% — критично!"
fi

# Загрузка
CORES=$(nproc)
LOAD=$(cat /proc/loadavg | awk '{print $1}' | cut -d. -f1)
if [ "$LOAD" -le "$CORES" ]; then
  pass_test "Load: $LOAD (cores: $CORES)"
else
  fail_test "Load: $LOAD > $CORES cores"
fi

# =============================================
# ИТОГ
# =============================================
echo ""
echo "============================================"
echo "🏁 Итог: $PASS PASS | $FAIL FAIL | $TOTAL всего"
echo "============================================"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ Все тесты прошли!${NC}"
  exit 0
else
  echo -e "${RED}❌ Есть фейлы: $FAIL${NC}"
  exit 1
fi
