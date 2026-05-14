# 🦙 AI Ops

Веб-панель управления для `llama.cpp` — мониторинг, конфигурация, тестирование модели в реальном времени.

## Возможности

- **📊 Дашборд** — GPU, CPU, RAM, VRAM, метрики llama-server в реальном времени
- **⚙️ Конфигурация** — изменение параметров модели через UI (parallel, threads, ctx_len и др.)
- **🔧 Управление** — запуск/остановка/перезапуск systemd сервиса
- **💬 Чат** — тестирование модели прямо из браузера

## Стек

| Слой | Технология |
|------|-----------|
| Backend | Node.js + Express |
| Frontend | React 19 + Vite + Tailwind CSS + Recharts |
| Тесты | Vitest (Jest для фронтенда) |
| Линтинг | ESLint |
| CI/CD | GitHub Actions |
| Контейнеризация | Docker + docker-compose |

## Установка

### Локально

```bash
# 1. Клонировать
git clone <repo>
cd ai-ops

# 2. Установить зависимости
npm install

# 3. Настроить env (по умолчанию)
#    LLAMA_URL=http://127.0.0.1:8080
#    SERVICE_NAME=llama-8080.service
#    PORT=8081

# 4. Запустить
npm run dev:backend   # в одном терминале
npm run dev:frontend  # в другом
```

### Docker

```bash
docker compose up --build
# Открываем http://localhost:8081
```

## Структура

```
ai-ops/
├── backend/
│   ├── src/
│   │   ├── index.js       # Express сервер
│   │   ├── config.js      # Конфигурация
│   │   ├── services/
│   │   │   ├── llama.js   # Работа с llama-server API
│   │   │   ├── system.js  # Системные метрики
│   │   │   └── config.js  # Управление systemd
│   │   └── routes/
│   │       ├── metrics.js
│   │       └── service.js
│   ├── tests/
│   │   └── metrics.test.js
│   ├── vitest.config.js
│   └── eslint.config.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ConfigPanel.jsx
│   │   │   ├── ServicePanel.jsx
│   │   │   └── ChatPanel.jsx
│   │   ├── hooks/
│   │   │   └── useMetrics.js
│   │   └── tests/
│   │       └── App.test.jsx
│   ├── vitest.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/metrics` | GET | Все метрики (система, GPU, llama) |
| `/api/service/status` | GET | Статус systemd сервиса |
| `/api/service/control` | POST | Запуск/остановка/перезапуск |
| `/api/service/config` | PUT | Обновление параметров |

## Тесты

```bash
# Все
npm test

# Только бэкенд
cd backend && npm test

# Только фронтенд
cd frontend && npm test
```

## Лицензия

MIT
