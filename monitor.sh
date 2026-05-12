#!/bin/bash
# System Monitor — checks server health and reports to quorum
# Called by cron every 30 minutes

LOG="/home/den/.openclaw/workspace/memory/monitor.log"
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')

echo "=== Monitor: $TIMESTAMP ===" >> "$LOG"

# 1. Uptime
UPTIME=$(uptime -p 2>/dev/null || echo "N/A")
echo "Uptime: $UPTIME" >> "$LOG"

# 2. CPU load
CPU_LOAD=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
echo "CPU load (1/5/15min): $CPU_LOAD" >> "$LOG"

# 3. Memory
MEM_INFO=$(free -h | grep Mem)
echo "Memory: $MEM_INFO" >> "$LOG"

# 4. Disk
DISK=$(df -h / | tail -1 | awk '{print $5, $2, $3, $4}')
echo "Disk /: $DISK" >> "$LOG"

# 5. GPU (RTX 3090)
if command -v nvidia-smi &>/dev/null; then
    GPU_TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null | head -1)
    GPU_MEM=$(nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
    GPU_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | head -1)
    echo "GPU: temp=${GPU_TEMP}°C, mem=${GPU_MEM}, util=${GPU_UTIL}" >> "$LOG"
else
    echo "GPU: nvidia-smi not found" >> "$LOG"
fi

# 6. Key services status
for SVC in llama-8080 llama-panel; do
    STATUS=$(systemctl is-active "$SVC" 2>/dev/null || echo "unknown")
    echo "Service $SVC: $STATUS" >> "$LOG"
done

# 7. Port checks (quick)
PORTS=("8080" "8081" "80" "18790")
for PORT in "${PORTS[@]}"; do
    if timeout 2 bash -c "echo >/dev/tcp/localhost/$PORT" 2>/dev/null; then
        echo "Port $PORT: OPEN" >> "$LOG"
    else
        echo "Port $PORT: CLOSED/ERROR" >> "$LOG"
    fi
done

# 8. Check recent errors (last 50 lines of system log)
RECENT_ERRORS=$(journalctl --no-pager -n 50 --since "30 min ago" 2>/dev/null | grep -iE "error|fail|panic|segfault|OOM" | tail -5)
if [ -n "$RECENT_ERRORS" ]; then
    echo "Recent errors:" >> "$LOG"
    echo "$RECENT_ERRORS" >> "$LOG"
else
    echo "Recent errors: none" >> "$LOG"
fi

echo "=== End Monitor ===" >> "$LOG"
echo "$LOG"
