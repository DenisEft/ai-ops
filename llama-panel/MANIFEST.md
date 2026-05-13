# 🦙 Llama Panel — Манифест проекта

---

## 1. Название и описание

**Llama Panel** — веб-панель управления для `llama.cpp` (llama-server): мониторинг в реальном времени, конфигурация параметров модели, управление systemd-сервисом и встроенный чат-интерфейс для тестирования модели прямо из браузера.

---

## 2. Цели и ценности

### Зачем создан

- **Единая точка управления** llama-server — никаких команд в терминале
- **Мониторинг GPU/CPU/RAM** в реальном времени через виджеты с графиками истории
- **Гибкая конфигурация** параметров модели (threads, ctx_len, parallel и др.) через UI с валидацией
- **Аналитика использования** — графики запросов, токенов, TPS за произвольный период
- **Низкий порог входа** — тёмная тема, компактный UI, drag-and-drop виджетов

### Ценности

- **Простота** — `docker compose up --build` и всё работает
- **Гибкость** — пользователь добавляет собственные метрики через UI (CLI-команды, regex-парсинг)
- **Надёжность** — JWT-аутентификация, rate-limiting, CORS-защита
- **Минимализм** — один бэкенд, один фронтенд, без базы данных

---

## 3. Архитектурный обзор

### Слои

```
┌──────────────────────────────────────────────────────┐
│  Фронтенд (React 19 + Vite + Tailwind + Recharts)    │
│  ┌──────────┬──────────┬──────────┬────────────────┐ │
│  │ Dashboard│  Stats   │  Control │   Config       │ │
│  │ (виджеты)│ (графики)│ (сервисы)│ (параметры)     │ │
│  └──────────┴──────────┴──────────┴────────────────┘ │
│  ┌────────────────────────────────────────────────┐  │
│  │  AuthContext + JWT (localStorage)               │  │
│  └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│  Бэкенд (Node.js 22 + Express + WebSocket)           │
│  ┌──────────────┬──────────────┬──────────────────┐  │
│  │  API Routes  │  WebSocket   │  Health Check    │  │
│  │  (REST)      │  (/ws)       │  (/health)       │  │
│  └──────────────┴──────────────┴──────────────────┘  │
│  ┌─────────────────── Сервисы (слой бизнес-логики) ─┐│
│  │ auth     │ llama  │ system  │ config  │ metrics- ││
│  │          │        │         │         │ config   ││
│  │ websock  │ rate-l │ stats   │         │          ││
│  │ et       │ mit    │         │         │          ││
│  └───────────┴────────┴─────────┴─────────┴─────────┘│
├──────────────────────────────────────────────────────┤
│  Внешние зависимости                                 │
│  ├── llama-server (127.0.0.1:8080)                   │
│  ├── systemd (systemctl)                             │
│  ├── nvidia-smi (GPU-метрики)                        │
│  └── /proc/stat, /sys/class/thermal (Linux)          │
└──────────────────────────────────────────────────────┘
```

### Ключевые архитектурные решения

| Решение | Обоснование |
|---------|-------------|
| WebSocket для метрик | Обновление каждые 2 секунды без polling-нагрузки на CPU |
| JSON-файл для конфигурации метрик | Простота, без базы данных, легко читать/редактировать |
| JWT + bcrypt | Stateless-сессии, пароли не хранятся в открытом виде |
| systeminformation + nvidia-smi | Надёжные метрики GPU/CPU на Linux |
| journalctl для логов | Стандартный Linux-логгер, не нужен отдельный стек |
| Dual-mode: polling (3s) + WebSocket | Fallback если WebSocket недоступен |
| SPA (React build served by Express) | Один контейнер, один порт, CORS не нужен |
| `npx --package=systemd2api npx systemd2api` | Чтение systemd-конфига без root-привилегий |

---

## 4. Стек технологий

### Backend

| Технология | Версия | Зачем |
|------------|--------|-------|
| **Node.js** | 22 (Alpine) | Runtime, ESM modules |
| **Express** | 4.21 | HTTP-сервер, маршрутизация |
| **ws** | 8.20 | WebSocket для real-time метрик |
| **axios** | 1.7 | HTTP-клиент к llama-server |
| **systeminformation** | 5.25 | CPU, RAM, GPU, load, filesystem |
| **bcrypt** | 6.0 | Хэширование паролей |
| **jsonwebtoken** | 9.0 | JWT-токены авторизации |
| **dotenv** | 16.4 | Переменные окружения |

### Frontend

| Технология | Версия | Зачем |
|------------|--------|-------|
| **React** | 19 | UI-фреймворк |
| **Vite** | — | Сборка и dev-сервер |
| **Tailwind CSS** | — | Утилитарные стили, тёмная тема |
| **Recharts** | — | Графики (Area, Bar, Line, Pie) |
| **Vitest** | 3.0 | Юнит-тесты |

### Инфраструктура

| Технология | Зачем |
|------------|-------|
| **Docker** + **docker-compose** | Контейнеризация, healthcheck |
| **systemd** | Автозапуск llama-8080 и llama-panel |
| **GitHub Actions** | CI/CD |
| **ESLint** | Линтинг |

### Переменные окружения (бэкенд)

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| `PORT` | `8081` | Порт API-сервера |
| `HOST` | `0.0.0.0` | Хост |
| `LLAMA_URL` | `http://127.0.0.1:8080` | URL llama-server |
| `LLAMA_HEALTH_INTERVAL` | `30000` | Интервал health-check (мс) |
| `LLAMA_METRICS_INTERVAL` | `5000` | Интервал сбора метрик (мс) |
| `JWT_SECRET` | `llama-panel-secret` | Секрет для JWT |
| `JWT_EXPIRES_IN` | `24h` | Срок жизни токена |
| `RATE_LIMIT_WINDOW` | `60000` | Окно rate-limit (мс) |
| `RATE_LIMIT_MAX` | `20` | Макс. запросов в окно |
| `CORS_ORIGIN` | `http://localhost:8081` | Разрешённый CORS-origin |
| `LLAMA_SERVICE_NAME` | `llama-8080.service` | Имя systemd-сервиса llama |
| `PANEL_SERVICE_NAME` | `llama-panel.service` | Имя systemd-сервиса панели |
| `USERS_FILE` | `./users.json` | Файл пользователей |

---

## 5. API-контракт

> **Авторизация:** все эндпоинты (кроме `/api/auth/login`, `/health`) требуют заголовок `Authorization: Bearer <token>`.
> WebSocket требует `?token=<token>` в query-string.

### Аутентификация

#### `POST /api/auth/login`

Вход в систему.

**Body:**
```json
{ "username": "den", "password": "secret" }
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "username": "den", "name": "Денис", "role": "admin" }
}
```

**Errors:** 400 (нет полей), 401 (неверные данные), 429 (rate-limit)

---

#### `POST /api/auth/change-password` _(admin / auth user)*

Смена пароля текущего пользователя.

**Body:** `{ "oldPassword": "old", "newPassword": "new" }`

---

#### `GET /api/auth/users` _(admin only)_

Список пользователей (без хэшей).

**Response 200:** `{ "users": [ { "username": "den", "name": "Денис", "role": "admin" } ] }`

---

#### `POST /api/auth/users` _(admin only)_

Создание пользователя.

**Body:** `{ "username": "viewer1", "password": "pass123", "name": "Наблюдатель", "role": "viewer" }`

---

#### `DELETE /api/auth/users/:username` _(admin only)_

Удаление пользователя.

---

#### `GET /api/auth/me`

Проверить текущий токен.

**Response 200:** `{ "user": { "username": "den", "name": "Денис", "role": "admin" } }`

---

### Метрики

#### `GET /api/metrics`

Сбор всех метрик: система, GPU, llama-server, сервисы.

**Response 200:**
```json
{
  "timestamp": "2026-05-13T15:00:00.000Z",
  "cpu": { "brand": "AMD Ryzen 9 7950X", "cores": 16, "usage": 42, "temperature": 55 },
  "memory": { "total": 68719476736, "used": 25769803776, "available": 42949672960, "percent": 37 },
  "load": { "load1": 2.45, "load5": 1.82, "load15": 1.30 },
  "disk": { "total": 1000204886016, "used": 450102443008, "available": 550102443008, "percent": 45 },
  "tokens": { "total": 1234567, "prompt": 456789, "predicted": 777778 },
  "requests": 892,
  "tokensPerSec": 32.5,
  "gpu": { "name": "NVIDIA GeForce RTX 4090", "memoryUsed": 12288, "memoryTotal": 24576, "memoryPercent": 50, "temperature": 62, "powerDraw": 210 },
  "gpuPower": 210,
  "gpuTemp": 62,
  "cpuFan": 850,
  "services": { "llama-8080": { "active": true } },
  "llama": { "status": "running", "health": { "...": "..." }, "props": { "...": "..." }, "metrics": { "llamacpp:prompt_tokens_total": 456789 } },
  "llamaMetricsError": null
}
```

---

### Конфигурация метрик

#### `GET /api/metrics-config`

Список всех метрик (системные + пользовательские).

**Response 200:**
```json
{ "metrics": [
  { "id": "cpu", "nameRu": "Загрузка CPU", "type": "gauge", "enabled": true, "unit": "%", "max": 100,
    "collect": { "method": "procstat", "interval": 5000 } }
]}
```

---

#### `POST /api/metrics-config/collect`

Собрать данные всех включённых метрик.

**Response 200:**
```json
{ "metrics": [ { "id": "cpu", "name": "Загрузка CPU", "value": 42, "unit": "%", "timestamp": "..." } ],
  "timestamp": "2026-05-13T15:00:00.000Z" }
```

---

#### `POST /api/metrics-config/add`

Создать пользовательскую метрику.

**Body:**
```json
{
  "id": "gpu-fan",
  "nameRu": "Вентилятор GPU",
  "type": "gauge",
  "unit": "RPM",
  "max": 3000,
  "color": "#10b981",
  "collect": { "method": "command", "command": "nvidia-smi --query-gpu=fans.speed --format=csv,noheader", "regex": "(\\d+)", "interval": 5000 },
  "description": "GPU fan speed"
}
```

---

#### `GET /api/metrics-config/:id`

Получить данные одной метрики.

**Response 200:** `{ "id": "gpu-temp", "name": "Температура GPU", "value": 62, "unit": "°C", "timestamp": "..." }`

---

#### `PATCH /api/metrics-config/:id`

Обновить конфигурацию метрики.

---

#### `PATCH /api/metrics-config/:id/toggle`

Переключить enabled/disabled.

---

#### `DELETE /api/metrics-config/:id`

Удалить метрику.

---

### Управление сервисами

#### `GET /api/service/list`

Список сервисов со статусом.

**Response 200:**
```json
[
  { "name": "llama-8080.service", "label": "llama-8080", "type": "llama", "active": true, "state": "active" },
  { "name": "llama-panel.service", "label": "llama-panel", "type": "panel", "active": true, "state": "active" }
]
```

---

#### `POST /api/service/control`

Управление сервисом.

**Body:** `{ "name": "llama-8080", "action": "restart" }`

**Доступные action:** `start`, `stop`, `restart`, `reload`, `status`

**Response 200:** `{ "success": true, "action": "restart", "status": "ok" }`

---

#### `GET /api/service/logs?name=llama-8080&lines=50`

Логи сервиса через journalctl.

**Response 200:** `{ "name": "llama-8080", "lines": 50, "logs": "May 13 15:00:00 hostname llama-server[1234]: prompt eval time=..." }`

---

#### `GET /api/service/config`

Парсинг параметров llama-8080.service.

**Response 200:**
```json
{
  "parallel": 1, "threads": 8, "gpu_layers": 99, "ctx_len": 100000,
  "batch_size": 8192, "cacheTypeK": "f16", "cacheTypeV": "f16",
  "flashAttn": true, "mlock": true
}
```

---

#### `PUT /api/service/config`

Обновление параметров (частичное).

**Body:** `{ "threads": 16, "ctx_len": 131072 }`

**Response 200:** `{ "success": true, "message": "Config updated. Restart service to apply.", "applied": { "threads": 16, "ctx_len": 131072 } }`

---

#### `GET /api/service/stats?period=7d&limit=100`

Статистика использования (история токенов и запросов).

**Response 200:**
```json
{
  "period": "7d", "points": [
    { "date": "2026-05-13", "tokens": 12345, "requests": 89 },
    { "date": "2026-05-12", "tokens": 10000, "requests": 75 }
  ]
}
```

**Доступные period:** `24h`, `7d`, `30d