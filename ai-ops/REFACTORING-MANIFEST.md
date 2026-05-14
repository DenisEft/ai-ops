# Рефакторинг: llama-panel → ai-ops

**Дата:** 2026-05-14  
**Автор:** Лора (AI Ops)  
**Коммит:** `5036292`  
**Статус:** ✅ Выполнен

---

## 🎯 Цель

Превратить `llama-panel` (привязанный к llama.cpp) в универсальную **AI Ops Platform** — панель мониторинга и управления любой AI-инфраструктурой.

### Почему?
- Название `llama-panel` не отражает функционал (управление не только llama)
- Код жёстко привязан к `llama-8080` и llama.cpp API
- Нужно поддерживать несколько AI-бэкендов без хардкода

---

## 📊 Статистика изменений

| Метрика | Значение |
|---------|----------|
| Изменено файлов | 411 |
| Создано новых файлов | 7 |
| Удалено файлов | 1 |
| Переименовано | `llama-panel` → `ai-ops` |

---

## 🏗️ Архитектурные изменения

### До рефакторинга

```
llama-panel/
├── backend/
│   └── src/
│       ├── index.js          # Хардкод llama.js
│       ├── services/
│       │   ├── llama.js      # Жёсткая привязка к llama.cpp
│       │   ├── config.js     # Хардкод llama-8080
│       │   └── openclaw.js   # OpenClaw Gateway
│       └── routes/
│           ├── llama.js      # llama-specific routes
│           └── ...
├── frontend/
│   └── src/
│       ├── App.jsx           # "Llama Panel"
│       └── components/
│           ├── Overview.jsx  # llama-специфичные KPI
│           └── ...
```

### После рефакторинга

```
ai-ops/
├── backend/
│   └── src/
│       ├── index.js          # DriverRegistry
│       ├── drivers/          # Плагинная архитектура
│       │   ├── base.js       # InferenceDriver (абстрактный)
│       │   ├── index.js      # DriverRegistry (singleton)
│       │   ├── llama.js      # LlamaDriver
│       │   ├── vllm.js       # VLLMDriver
│       │   ├── tgi.js        # TGIDriver
│       │   ├── ollama.js     # OllamaDriver
│       │   └── openai.js     # OpenAIDriver
│       ├── services/
│       │   ├── config.js     # Универсальный конфиг
│       │   └── openclaw.js   # OpenClaw Gateway
│       └── routes/
│           ├── llama.js      # → legacy (не используется)
│           └── ...
├── frontend/
│   └── src/
│       ├── App.jsx           # "AI Ops"
│       └── components/
│           ├── Overview.jsx  # Универсальные KPI
│           └── ...
├── ai-ops.service            # systemd unit (переименован)
└── MANIFEST.md               # Обновлён
```

---

## 🔧 Детали изменений

### 1. Бэкенд — Driver Registry

**Создан `drivers/base.js`:**
```javascript
export class InferenceDriver {
  constructor(config = {}) { ... }
  async getStatus() { throw new Error('...') }
  async getModelInfo() { throw new Error('...') }
  async getMetrics() { throw new Error('...') }
  async healthCheck() { ... }
}
```

**Создан `drivers/index.js`:**
```javascript
export class DriverRegistry {
  getAll()        // Все включённые драйверы
  get(type)       // Драйвер по типу
  getAllStatus()  // Статус всех драйверов
  getAllModels()  // Модели всех драйверов
  getAllMetrics() // Метрики всех драйверов
}
```

**Каждый драйвер реализует интерфейс `InferenceDriver`:**

| Драйвер | URL по умолчанию | API |
|---------|------------------|-----|
| `llama` | `http://127.0.0.1:8080` | `/health`, `/props`, `/metrics` |
| `vllm` | `http://127.0.0.1:8000` | `/status`, `/v1/models` |
| `tgi` | `http://127.0.0.1:8080` | `/health`, `/info` |
| `ollama` | `http://127.0.0.1:11434` | `/api/version`, `/api/tags` |
| `openai` | `https://api.openai.com/v1` | `/models` |

### 2. Конфигурация

**Новые environment variables:**

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `LLAMA_URL` | llama.cpp URL | `http://127.0.0.1:8080` |
| `VLLM_URL` | vLLM URL | `http://127.0.0.1:8000` |
| `TGI_URL` | TGI URL | `http://127.0.0.1:8080` |
| `OLLAMA_URL` | Ollama URL | `http://127.0.0.1:11434` |
| `OPENAI_URL` | OpenAI URL | `https://api.openai.com/v1` |
| `OPENAI_API_KEY` | OpenAI ключ | (пусто) |

### 3. Фронтенд

| Было | Стало |
|------|-------|
| `llama-panel` | `ai-ops` |
| `Llama Panel` | `AI Ops` |
| `llama-panel-backend` | `ai-ops-backend` |
| `llama-panel-frontend` | `ai-ops-frontend` |
| `llama-8080.service` | `llama-8080.service` (переменная, не хардкод) |
| KPI "Llama" | KPI "AI" |
| Сервис llama-8080 | AI Service |

### 4. systemd

**До:**
```ini
Description=Management for llama.cpp server
Environment=LLAMA_URL=http://127.0.0.1:8080
Environment=SERVICE_NAME=llama-8080.service
```

**После:**
```ini
Description=Web Management for AI Infrastructure
Environment=PORT=8081
Environment=LLAMA_URL=http://127.0.0.1:8080
Environment=SERVICE_NAME=llama-8080.service
```

---

## 🔄 Как добавить новый драйвер

1. Создать `backend/src/drivers/<name>.js`:
```javascript
import { InferenceDriver } from './base.js'

export class NewDriver extends InferenceDriver {
  constructor(config = {}) {
    super({
      name: config.name || 'new',
      type: 'new',
      url: config.url || process.env.NEW_URL || 'http://127.0.0.1:XXXX',
      enabled: config.enabled !== false,
    })
  }

  async getStatus() {
    // Реализовать логику
  }

  async getModelInfo() {
    // Реализовать логику
  }
}
```

2. Добавить импорт в `drivers/index.js`:
```javascript
import { NewDriver } from './new.js'
```

3. Добавить в `DEFAULT_DRIVERS`:
```javascript
const DEFAULT_DRIVERS = [
  { type: 'llama', enabled: true },
  { type: 'new', enabled: true }, // ← новый
  ...
]
```

4. Добавить в `_readConfig()`:
```javascript
new: {
  url: process.env.NEW_URL || 'http://127.0.0.1:XXXX',
},
```

---

## 📋 Чек-лист

### Выполнено ✅
- [x] Переименование `llama-panel` → `ai-ops`
- [x] Переименование `Llama Panel` → `AI Ops`
- [x] Создание `drivers/base.js` (InferenceDriver)
- [x] Создание `drivers/llama.js` (LlamaDriver)
- [x] Создание `drivers/vllm.js` (VLLMDriver)
- [x] Создание `drivers/tgi.js` (TGIDriver)
- [x] Создание `drivers/ollama.js` (OllamaDriver)
- [x] Создание `drivers/openai.js` (OpenAIDriver)
- [x] Создание `drivers/index.js` (DriverRegistry)
- [x] Обновление `backend/src/index.js`
- [x] Обновление `frontend/src/App.jsx`
- [x] Обновление `frontend/package.json`, `backend/package.json`, `package.json`
- [x] Обновление `MANIFEST.md`
- [x] Обновление `MEMORY.md`
- [x] Переименование `llama-panel.service` → `ai-ops.service`
- [x] Коммит: `5036292`

### Не выполнено ⬜
- [ ] Фикс тестов (4/11 — React import)
- [ ] Удаление legacy `backend/src/services/llama.js` (заменён на drivers/)
- [ ] Удаление legacy `backend/src/routes/llama.js` (заменён на drivers/)
- [ ] Desktop sidebar layout
- [ ] README
- [ ] Обновление systemd-сервиса на сервере

---

## 🎯 Следующие шаги

1. **Фикс тестов** — добавить `import React` в test-файлы или настроить JSX pragma
2. **Удаление legacy** — убрать `backend/src/services/llama.js` и `backend/src/routes/llama.js` (заменены на drivers/)
3. **README** — переписать под ai-ops с примерами драйверов
4. **Desktop layout** — добавить sidebar для десктопа
5. **Web UI для драйверов** — управление драйверами из интерфейса

---

## 📝 Примечания

- Старые routes (`backend/src/routes/llama.js`) и сервисы (`backend/src/services/llama.js`) **сохранены** для обратной совместимости
- Driver Registry — singleton, загружается при старте бэкенда
- Драйверы включаются через `DEFAULT_DRIVERS` в `drivers/index.js`
- Каждый драйвер independent — можно добавить/удалить без влияния на остальные
