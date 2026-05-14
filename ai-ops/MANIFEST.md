# AI Ops — AI Infrastructure Operations Dashboard

Универсальная панель мониторинга и управления AI-инфраструктурой.

## 🎯 Назначение

Веб-дашборд для IT-инженеров, управляющих AI-инфраструктурой:
- **Мониторинг** GPU/CPU/RAM/VRAM в реальном времени
- **Управление** AI-инференс серверами (start/restart/stop)
- **Метрики** и графики с историей
- **Алертинг** и аудит действий
- **Бэкапы** конфигурации

## 🏗️ Архитектура

### Frontend (React + Vite + Tailwind)
- `Overview` — главный экран с KPI (CPU/RAM/VRAM/Temp)
- `Metrics` — графики метрик (Recharts)
- `Management` — управление сервисами и процессами
- `Settings` — конфиг, логи, аудит, алерты
- Bottom tab bar (mobile-first)
- Dark/Light theme
- Offline banner + Skeleton loading

### Backend (Express.js)
- REST API + WebSocket для real-time обновлений
- **Driver Registry** — плагинная архитектура для разных AI-бэкендов
- Metrics history с агрегацией
- Audit log + Backup system
- JWT auth + RBAC

## 🤖 Поддерживаемые AI-бэкенды

| Driver | URL | Status |
|--------|-----|--------|
| **llama.cpp** | `http://127.0.0.1:8080` | ✅ |
| **vLLM** | `http://127.0.0.1:8000` | ⬜ |
| **TGI** | `http://127.0.0.1:8080` | ⬜ |
| **Ollama** | `http://127.0.0.1:11434` | ⬜ |
| **OpenAI API** | `https://api.openai.com/v1` | ⬜ |

### Добавление нового драйвера

1. Создать `backend/src/drivers/<name>.js`
2. Наследовать от `InferenceDriver`
3. Реализовать `getStatus()`, `getModelInfo()`
4. Добавить в `DEFAULT_DRIVERS` в `drivers/index.js`

## 📂 Структура проекта

```
ai-ops/
├── frontend/
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── contexts/       # AuthContext
│   │   ├── hooks/          # useDashboard, useWidgetConfig
│   │   └── tests/          # Vitest tests
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── drivers/        # AI inference drivers
│   │   ├── routes/         # REST endpoints
│   │   └── services/       # Business logic
│   └── package.json
├── ai-ops.service          # systemd unit
├── docker-compose.yml
├── package.json
└── MANIFEST.md
```

## 🔧 Конфигурация

### Environment Variables

```bash
PORT=8081                  # Порт API
LLAMA_URL=http://127.0.0.1:8080  # llama.cpp URL
VLLM_URL=http://127.0.0.1:8000   # vLLM URL
TGI_URL=http://127.0.0.1:8080    # TGI URL
OLLAMA_URL=http://127.0.0.1:11434  # Ollama URL
OPENAI_URL=https://api.openai.com/v1  # OpenAI API
OPENAI_API_KEY=sk-...      # OpenAI ключ
JWT_SECRET=your-secret     # JWT secret
```

### Включение драйверов

Драйверы включаются/выключаются через `DEFAULT_DRIVERS` в `drivers/index.js`:

```javascript
const DEFAULT_DRIVERS = [
  { type: 'llama', enabled: true },
  { type: 'vllm', enabled: true },   // включить
  { type: 'tgi', enabled: false },
  { type: 'ollama', enabled: true }, // включить
  { type: 'openai', enabled: false },
]
```

## 🚀 Запуск

```bash
# Установка зависимостей
npm run install:all

# Запуск dev
npm run dev:backend   # Backend :8081
npm run dev:frontend  # Frontend :3001

# Сборка
npm run build:frontend

# Запуск production
cd backend && npm start
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/overview` | GET | Главный экран (KPI + статусы) |
| `/api/metrics/history` | GET | История метрик |
| `/api/service/list` | GET | Список сервисов |
| `/api/service/control` | POST | Управление сервисами |
| `/api/service/config` | GET/PUT | Конфигурация |
| `/api/audit` | GET | Аудит действий |
| `/api/backup` | GET/POST | Бэкапы |
| `/api/drivers` | GET | Список драйверов |
| `/api/openclaw/*` | GET/POST | OpenClaw Gateway |
| `/ws` | WebSocket | Real-time метрики |

## 🔐 Безопасность

- JWT auth с RBAC (admin/user)
- CORS с whitelist
- Rate limiting на auth endpoints
- Audit log всех действий
- Secure JWT secret (переменная окружения)

## 📈 Roadmap

### Phase 1: Фундамент ✅
- Единый overview endpoint
- Bottom tab bar (4 вкладки)
- KPI + SectionCard компоненты
- Рефактор App.jsx
- Тесты (4/4)

### Phase 2: Управление ✅
- Сервисы: start/restart/stop
- OpenClaw Gateway integration
- AI Process Monitor
- Backup Manager
- Config editor
- Logs viewer
- Audit log
- Alerts UI

### Phase 3: Графики ✅
- Metrics.jsx с Recharts
- Time range selector [1ч 6ч 24ч 7д]
- Auto-refresh каждые 30 сек

### Phase 4: Универсальность 🔄
- ✅ Driver Registry (llama.cpp)
- ✅ vLLM driver
- ✅ TGI driver
- ✅ Ollama driver
- ✅ OpenAI driver
- ⬜ Web UI для управления драйверами
- ⬜ Docker support для драйверов

### Phase 5: Полировка ⬜
- Desktop sidebar layout
- Lucide React иконки
- Skeleton loading (улучшение)
- Offline banner
- Dark/Light theme toggle
- Тестирование на телефоне
- README

## 🧪 Тесты

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

**Статус:** 7/11 тестов проходят (4 сломаны — нужно добавить `import React`)

## 📝 License

MIT
