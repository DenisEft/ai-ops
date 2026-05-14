#!/bin/bash
set -e

echo "🔧 Updating llama-8080.service..."
cat > /etc/systemd/system/llama-8080.service << 'SERVICE'
[Unit]
Description=Llama Server (Qwen 35B MoE) on port 8080
After=network.target

[Service]
Type=simple
User=den
ExecStart=/home/den/llama.cpp/build/bin/llama-server \
  -m /mnt/models/Qwen3.6-35B-A3B-UD-IQ4_NL_XL.gguf \
  --host 127.0.0.1 --port 8080 \
  -ngl 99 \
  -t 8 \
  -c 100000 \
  -b 8192 \
  --cache-type-k f16 --cache-type-v f16 \
  --flash-attn on \
  --parallel 1 \
  --mlock \
  --metrics
Restart=always
RestartSec=15
StartLimitIntervalSec=300
StartLimitBurst=5
TimeoutStartSec=300
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
SERVICE

echo "✅ llama-8080.service updated (with --metrics, Restart=always)"

echo "🔧 Installing ai-ops.service..."
cat > /etc/systemd/system/ai-ops.service << 'SERVICE'
[Unit]
Description=AI Ops — Web Management for llama.cpp
After=network.target llama-8080.service
Requires=llama-8080.service

[Service]
Type=simple
User=den
WorkingDirectory=/home/den/.openclaw/workspace/ai-ops/backend
ExecStart=/usr/bin/node src/index.js
Environment=PORT=8081
Environment=LLAMA_URL=http://127.0.0.1:8080
Environment=SERVICE_NAME=llama-8080.service
Restart=always
RestartSec=15
StartLimitIntervalSec=300
StartLimitBurst=5
TimeoutStartSec=60
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

echo "✅ ai-ops.service installed"

echo "🔄 Reloading systemd..."
systemctl daemon-reload

echo "✅ Done! Now run:"
echo "   sudo systemctl restart llama-8080 ai-ops"
echo "   sudo systemctl status llama-8080 ai-ops"
