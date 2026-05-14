# DevOps Pipeline — ai-ops

Полный DevOps-пайплайн для разработки, тестирования и деплоя ai-ops.

---

## 📐 Архитектура пайплайна

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Commit      │────▶│  Pre-commit │────▶│  CI         │────▶│  CD         │
│  (local)     │     │  Hooks      │     │  Pipeline   │     │  Pipeline   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                             │                    │
                                             │            ┌──────┴──────┐
                                             │            │   Deploy    │
                                             │            │  Production │
                                             │            └─────────────┘
                                             │
                                     ┌───────┴───────┐
                                     │   Docker      │
                                     │   Build &     │
                                     │   Push        │
                                     └───────────────┘
```

---

## 🔄 Стадии пайплайна

### Stage 0: Pre-commit (локально)

```bash
# Установка
pip install pre-commit
pre-commit install

# Ручной запуск
pre-commit run --all-files
```

**Что проверяет:**
- ✗ trailing whitespace
- ✗ end-of-file
- ✗ YAML/JSON синтаксис
- ✗ приватные ключи в коде
- ✗ commit в main (защита)
- ✗ frontend lint
- ✗ backend lint

### Stage 1: CI (GitHub Actions)

```yaml
lint → test → build → scan → docker-build → deploy
```

**Lint:**
- ESLint (backend + frontend)
- Проверка на остатки `llama-panel`

**Test:**
- Backend: vitest
- Frontend: vitest
- Coverage upload (Codecov)

**Build:**
- Frontend: vite build
- Верификация dist/

**Security:**
- npm audit (high+)
- trufflehog (secrets)

**Docker:**
- Multi-stage build
- Push to GHCR
- Tags: sha, branch, semver, latest

**Deploy:**
- SSH на сервер
- git pull
- build + restart
- health check

### Stage 2: Мониторинг

```bash
# Ручной запуск
./scripts/monitor.sh

# Cron (каждые 5 минут)
*/5 * * * * /home/den/.openclaw/workspace/ai-ops/scripts/monitor.sh --alert
```

**Проверяет:**
- ✓ systemd статус
- ✓ HTTP health
- ✓ Порт открыт
- ✓ CPU/Memory/Disk
- ✓ GPU/VRAM/Temp
- ✓ Ошибки в логах
- ✓ OOM kills
- ✓ Uptime

### Stage 3: Бэкапы

```bash
# Полный
./scripts/backup.sh --full

# Конфиги
./scripts/backup.sh --config

# Данные
./scripts/backup.sh --data

# Авто (cron: 03:00)
0 3 * * * /home/den/.openclaw/workspace/ai-ops/scripts/backup.sh --auto
```

**Бэкапит:**
- metrics-config.json
- .env
- users.json
- data.db
- audit.log
- frontend/dist

**Хранение:** 30 дней

---

## 🚀 Деплой

### Ручной

```bash
# Production
./scripts/deploy.sh production

# Staging
./scripts/deploy.sh staging

# Rollback
./scripts/deploy.sh rollback

# Health check
./scripts/deploy.sh health

# Backup
./scripts/deploy.sh backup
```

### Автоматический (GitHub Actions)

```yaml
# .github/workflows/ci.yml
# Deploy запускается при push в main
```

**Последовательность:**
1. `git pull origin main`
2. `npm run install:all`
3. `cd frontend && npm run build`
4. `sudo systemctl restart ai-ops`
5. Health check (`curl /health`)

---

## 📦 Release

### Версионирование (SemVer)

```bash
# Patch (багфиксы)
./scripts/release.sh patch

# Minor (новые фичи)
./scripts/release.sh minor

# Major (breaking changes)
./scripts/release.sh major

# Changelog
./scripts/release.sh changelog

# Текущая версия
./scripts/release.sh version
```

### Git workflow

```bash
# Feature branch
git checkout -b feat/new-driver
# ... develop ...
git add -A
git commit -m "feat: add TGI driver"
git push origin feat/new-driver

# PR → merge → auto-deploy
```

---

## 🔧 Конфигурация

### Environment variables

```bash
# .env.example → .env
cp .env.example .env
```

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт API | `8081` |
| `LLAMA_URL` | llama.cpp | `http://127.0.0.1:8080` |
| `VLLM_URL` | vLLM | `http://127.0.0.1:8000` |
| `TGI_URL` | TGI | `http://127.0.0.1:8080` |
| `OLLAMA_URL` | Ollama | `http://127.0.0.1:11434` |
| `OPENAI_URL` | OpenAI | `https://api.openai.com/v1` |
| `OPENAI_API_KEY` | OpenAI ключ | (пусто) |
| `JWT_SECRET` | JWT secret | (обязательно!) |
| `LOG_LEVEL` | Уровень логов | `info` |
| `TELEGRAM_BOT_TOKEN` | Bot для алертов | (пусто) |
| `TELEGRAM_CHAT_ID` | Chat для алертов | (пусто) |

### GitHub Secrets

```
DEPLOY_HOST=your-server-ip
DEPLOY_USER=den
DEPLOY_KEY=ssh-private-key
```

---

## 🌐 Nginx

### Установка

```bash
sudo cp nginx/ai-ops.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/ai-ops /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ai-ops.example.com
```

---

## 📊 Мониторинг

### Логи

```bash
# Live logs
sudo journalctl -u ai-ops -f

# Errors
sudo journalctl -u ai-ops --since "1 hour ago" | grep -i error

# Monitor log
cat /var/log/ai-ops/monitor.log

# Alerts
cat /var/log/ai-ops/alerts.log
```

### Health endpoints

```bash
# API health
curl http://localhost:8081/health

# Metrics
curl http://localhost:8081/api/metrics

# Drivers
curl http://localhost:8081/api/drivers

# Dashboard overview
curl http://localhost:8081/api/dashboard/overview
```

### Dashboard

```bash
./scripts/monitor.sh
```

---

## 🔐 Безопасность

### Checklist

- [x] JWT auth + RBAC
- [x] CORS whitelist
- [x] Rate limiting (auth endpoints)
- [x] Audit log
- [x] Secure JWT secret (env var)
- [x] Nginx security headers
- [x] Systemd hardening (NoNewPrivileges, PrivateTmp)
- [ ] WAF (mod_security / Cloudflare)
- [ ] Fail2ban
- [ ] SSL/TLS (Let's Encrypt)
- [ ] Regular security audits

---

## 📁 Структура DevOps

```
ai-ops/
├── .github/workflows/
│   └── ci.yml              # CI/CD pipeline
├── scripts/
│   ├── deploy.sh           # Deployment script
│   ├── monitor.sh          # Health monitoring
│   ├── backup.sh           # Backup automation
│   └── release.sh          # Release management
├── nginx/
│   └── ai-ops.conf         # Nginx configuration
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── ai-ops.service          # systemd unit
├── DEVOPS.md               # This file
└── DOCKER.md               # Docker guide
```

---

## 🚨 Runbook

### Service down

```bash
# 1. Check status
sudo systemctl status ai-ops

# 2. Check logs
sudo journalctl -u ai-ops -n 50

# 3. Restart
sudo systemctl restart ai-ops

# 4. Verify
curl http://localhost:8081/health
```

### High memory

```bash
# 1. Check process
ps aux | grep node

# 2. Check for memory leaks
sudo journalctl -u ai-ops | grep -i "memory\|heap"

# 3. Restart
sudo systemctl restart ai-ops

# 4. If persistent → investigate
node --inspect pid
```

### Disk full

```bash
# 1. Check usage
df -h

# 2. Clean logs
sudo journalctl --vacuum-time=3d

# 3. Clean backups
./scripts/backup.sh --cleanup

# 4. Check large files
du -sh /var/log/ai-ops/* | sort -rh | head -10
```

### GPU overheating

```bash
# 1. Check temperature
nvidia-smi

# 2. Check cooling
systemctl status systemd-logind

# 3. Reduce load
# → Adjust inference batch size
# → Add cooling
```

---

## 📝 Commit Conventions

```bash
feat: add vLLM driver
fix: correct GPU memory calculation
refactor: extract driver interface
docs: update README
style: format with prettier
test: add driver tests
chore: update dependencies
ci: add security scan
perf: optimize metrics aggregation
revert: "feat: add vLLM driver"
```

**Format:** `type: description`

**Types:** feat, fix, refactor, docs, style, test, chore, ci, perf, revert

---

## 🎯 SLA

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| Recovery time | < 5 min |
| Backup frequency | Daily (03:00) |
| Backup retention | 30 days |
| Monitoring check | Every 5 min |
| Alert response | < 30 min |
| Deploy frequency | On-demand |
| Deploy success rate | > 95% |
