#!/bin/bash
# Quorum Monitor — sends system checks to free models, decides if lora should be woken

LOG="/home/den/.openclaw/workspace/memory/monitor.log"
RESULT="/home/den/.openclaw/workspace/memory/quorum-result.json"

if [ ! -f "$LOG" ]; then
    echo "No monitor log found" >> "$RESULT"
    exit 1
fi

# Read last monitor check (skip header/footer lines)
LAST_CHECK=$(tail -n 20 "$LOG" 2>/dev/null | head -n -1 | grep -v "=== Monitor\|=== End" | tr '\n' ' ')

# Write question to temp file (handles special chars better)
cat > /tmp/quorum-question.txt << EOF
Системный мониторинг: $LAST_CHECK

Проанализируй. Если всё работает — напиши OK.
Если есть проблемы (сервисы упали, GPU перегрев, диск >90%) — напиши ALERT.
Только одно слово: OK или ALERT.
EOF

# Run quorum (free models only for monitor)
cd /home/den/.openclaw/workspace/coder/quorum
python3 consult.py --free "$(cat /tmp/quorum-question.txt)" > /tmp/quorum-output.txt 2>/dev/null

# Extract result
STATUS=$(grep -oE "(OK|ALERT)" /tmp/quorum-output.txt | head -1)
if [ -z "$STATUS" ]; then
    STATUS="UNKNOWN"
fi

# Save result
cat > "$RESULT" << EOJSON
{"timestamp":"$(date -u '+%Y-%m-%d %H:%M UTC')","status":"$STATUS","log":"$LOG"}
EOJSON

echo "Quorum result: $STATUS"
