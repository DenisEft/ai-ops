#!/bin/bash
# Nightly memory check — ensures daily file was written
# Runs at 03:00 UTC via cron

WORKSPACE="/home/den/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
STATE_FILE="$MEMORY_DIR/state.json"
DATE=$(date +%Y-%m-%d)

# Extract lastDailyWritten from state.json
LAST_WRITTEN=$(python3 -c "import json; f=open('$STATE_FILE'); d=json.load(f); print(d.get('lastDailyWritten',''))" 2>/dev/null)

if [ "$LAST_WRITTEN" != "$DATE" ]; then
  # Day was missed — create/update daily file with a reminder
  DAILY_FILE="$MEMORY_DIR/${DATE}.md"
  if [ ! -f "$DAILY_FILE" ]; then
    cat > "$DAILY_FILE" <<EOF
# ${DATE} — пропущенная запись

> ⚠️ Автоматическая проверка обнаружила пропущенную запись
> Проверьте, что все важные события этого дня зафиксированы.

## 📌 Ключевые события
- [ ] Проверить: были ли важные события в этот день

## ⚡ Решения и действия
- [ ] Проверить: были ли важные решения

## 📋 Задачи
- [ ] Заполнить пропущенные секции
- [ ] Обновить memory/state.json
EOF
  fi
  # Log the issue (rotate log if > 100 lines)
  LOG="$MEMORY_DIR/nightly-check.log"
  echo "$(date -u '+%Y-%m-%d %H:%M:%S') — daily file for $DATE was missed (state says: $LAST_WRITTEN)" >> "$LOG"
  if [ -f "$LOG" ]; then
    LINES=$(wc -l < "$LOG")
    if [ "$LINES" -gt 100 ]; then
      tail -50 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
    fi
  fi

  # Update state to today (so it doesn't trigger again tomorrow)
  python3 -c "
import json
with open('$STATE_FILE') as f: s = json.load(f)
s['lastDailyWritten'] = '$DATE'
with open('$STATE_FILE', 'w') as f: json.dump(s, f, indent=2); f.write('\\n')
print('state updated to $DATE')
" 2>/dev/null
fi
