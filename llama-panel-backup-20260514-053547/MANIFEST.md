# llama-panel v2 — Product & Architecture Manifest

_Версия: 2.0.0 | Дата: 2026-05-14 | Статус: Дизайн-спецификация_

---

## 1. Executive Summary

**llama-panel** — мониторинговая панель для управления LLM-инфраструктурой (llama.cpp server + OpenClaw).

### Целевая аудитория
- **Логистический IT-начальник** — 30-40 лет, технарь, проверяет работу LLM-сервера 2-3 раза в день
- **Основной сценарий:** открыть с телефона → быстро оценить здоровье системы → принять решение
- **Вторичный сценарий:** детальная отладка с десктопа

### Ключевые принципы
1. **Mobile-first** — 80% проверок с телефона, bottom tab bar, крупные элементы
2. **3-секундное правило** — главный экран должен дать ответ «всё ли ок» за 3 секунды
3. **Progressive Disclosure** — сначала overview, потом drill-down по клику
4. **Graceful Degradation** — если метрика недоступна, не показывать null/spinner, а показать понятный fallback
5. **Dark Theme по умолчанию** — минималистичный, контрастный, без визуального шума

---

## 2. Навигация — 5 вкладок вместо 9

### Текущая проблема
9 горизонтальных табов → горизонтальный скролл на телефоне → не влезает.

### Новая структура

```
🏠 Главная (Dashboard)
├── Status Bar (верх экрана)
├── KPI Cards (2x2 grid)
├── Quick Health Check
└── Recent Alerts

📊 Метрики
├── GPU (Temp, Load, VRAM)
├── CPU / RAM
├── LLM Performance (tokens/sec, queue)
└── Время: график за 1ч/6ч/24ч/7д

🔧 Управление
├── Сервисы (llama-8080, llama-panel)
├── OpenClaw (Gateway, Sessions, Start/Stop/Restart)
└── AI Процессы (аномалии, обнаружение, restart)

💾 Бэкапы
├── История бэкапов
├── Создать / Восстановить
└── Настройки автобэкапа

⚙️ Настройки
├── Конфиг llama
├── Аудит
└── Логи
```

**Почему так:**
- «Главная» — single source of truth, всё критичное сразу видно
- «Метрики» — только цифры и графики
- «Управление» — всё что можно контролировать (сервисы, OpenClaw, процессы)
- «Бэкапы» — отдельная зона ответственности
- «Настройки» — всё остальное (конфиг, аудит, логи)

### Мобильная навигация
- **Bottom Tab Bar** — 5 иконок с подписями (стандарт iOS/Android)
- **Desktop** — sidebar слева (collapsible), контент справа
- **Hover на desktop** — tooltip с названием вкладки

---

## 3. Dashboard Design — Главный экран

### Layout (mobile — single column)

```
┌─────────────────────────┐
│ 🔴 🟡 🟢 Status Bar     │ ← WS, llama, OpenClaw
├─────────────────────────┤
│ ┌──────┐ ┌──────┐      │
│ │ GPU  │ │ CPU  │      │ ← Gauge 80x80
│ │ 72°C │ │ 45%  │      │
│ └──────┘ └──────┘      │
│ ┌──────┐ ┌──────┐      │
│ │ RAM  │ │ LLM  │      │
│ │ 68%  │ │ 42t/s│      │ ← tokens/sec
│ └──────┘ └──────┘      │
├─────────────────────────┤
│ 📋 Health Check         │
│ ✅ Llama Server         │
│ ✅ OpenClaw Gateway     │
│ ⚠️ GPU Temp: 72°C       │ ← warning threshold
│ ✅ AI Processes: 3      │
├─────────────────────────┤
│ 🔔 Recent Alerts (3)    │
│ 14:23 GPU temp warning  │
│ 12:01 Process anomaly   │
│ 09:45 Backup completed  │
└─────────────────────────┘
```

### Ключевые элементы

| Элемент | Размер | Описание |
|---------|--------|----------|
| **Status Bar** | full width | 3 точки: WS 🟢, Llama 🟢, OpenClaw 🟢. Красная точка = проблема |
| **Gauge Cards** | 2x2 grid | GPU Temp/Load, CPU/RAM. Circle gauge 80px, крупный шрифт |
| **LLM Card** | full width | tokens/sec, queue size, decoded tokens. Зелёный = ok, жёлтый = нагрузка |
| **Health Check** | list | Быстрая проверка всех сервисов. ✅/⚠️/❌ |
| **Recent Alerts** | collapsible | Последние 3 алерта, раскрывается до полного списка |

### Цветовая система

```
🟢 Green (#10b981): OK, норма
🟡 Amber (#f59e0b): Warning, внимание
🔴 Red (#ef4444): Critical, действие требуется
🔵 Blue (#3b82f6): Info, нейтрально
⚪ Gray (#6b7280): Disabled, недоступно
```

### Правила отображения метрик

| Правило | Пример |
|---------|--------|
| Не показывать null | Если Prometheus недоступен → «Prometheus не настроен» |
| Показывать threshold | Температура GPU > 80°C → жёлтый, > 90°C → красный |
| Показывать trend | Стрелка ↑↓ рядом с метрикой, если есть изменения |
| Не перегружать | Максимум 8 KPI на экране, остальное — drill-down |

---

## 4. Метрики — Единый API

### Проблема
Dashboard.jsx дергает 5 разных endpoint'ов:
- `/api/metrics/system` — CPU, RAM, OpenClaw uptime
- `/api/metrics/gpu` — GPU temp, utilization, VRAM
- `/api/metrics/llama` — tokens/sec, queue, metrics
- `/api/metrics/service` — service status
- `/api/openclaw/status` — OpenClaw gateway

### Решение: единый `/api/dashboard/overview`

```json
{
  "timestamp": "2026-05-14T00:00:00Z",
  "status": {
    "websocket": "connected",
    "llama": "ok",
    "openclaw": "ok",
    "panel": "ok"
  },
  "gauge": {
    "gpu": { "temp": 72, "load": 68, "vramUsed": 12000, "vramTotal": 24000, "unit": "°C" },
    "cpu": { "usage": 45, "cores": 16 },
    "memory": { "usedPercent": 68, "total": 32000, "used": 21760 },
    "llm": { "tokensPerSecond": 42, "queueSize": 3 }
  },
  "health": [
    { "service": "Llama Server", "status": "ok", "detail": "42 t/s" },
    { "service": "OpenClaw", "status": "ok", "detail": "active" },
    { "service": "GPU", "status": "warning", "detail": "72°C" }
  ],
  "alerts": [
    { "time": "14:23", "level": "warning", "message": "GPU temp 72°C" },
    { "time": "12:01", "level": "info", "message": "Process anomaly detected" }
  ]
}
```

**Backend:** новый service `dashboard.js` — агрегирует все данные в один вызов.

---

## 5. Графики

### Что использовать
- **Recharts** — лёгкий (50KB gzipped), React-first, поддержка line/bar/circle/gauge
- **Альтернативы рассмотрены:**
  - `chart.js` — больше вес, DOM-ориентированный
  - `visx` — от Airbnb, тяжёлый, перебор
  - `plotly.js` — слишком тяжёлый для нашего случая
  - `lightweight-charts` — только для financial charts

### Графики на странице «Метрики»

| График | Тип | Данные |
|--------|-----|--------|
| GPU Temp (1ч) | Line | 10s интервал |
| GPU Load (1ч) | Line | 10s интервал |
| Tokens/sec (24ч) | Bar | 1min интервал |
| CPU/RAM (24ч) | Line | 1min интервал |
| Queue Size (7д) | Area | 5min интервал |

### Time range selector
```
[1ч] [6ч] [24ч] [7д]
```
- Кнопки, не dropdown
- Активная кнопка выделена синим

---

## 6. Технологический стек

### Frontend
| Компонент | Выбор | Обоснование |
|-----------|-------|-------------|
| Фреймворк | **React 18 + Vite** | Оставляем текущий, всё работает |
| Стили | **TailwindCSS** | Уже есть, mobile-first утилиты |
| Графики | **Recharts** | Лёгкий, React-first, circle gauge есть |
| Стейт | **Zustand** | Проще Context API, нет boilerplate |
| WebSocket | **useWebSocket hook** | Текущий оставить, улучшить |
| Иконки | **Lucide React** | Лёгкие, 1000+ иконок, tree-shakeable |
| Свайпы | **use-gesture** | Для mobile gestures (свайп для refresh) |

### Backend
| Компонент | Выбор | Обоснование |
|-----------|-------|-------------|
| Runtime | **Node.js + Express** | Текущий, не меняем |
| Метрики | **dashboard.js** | Новый агрегирующий service |
| WebSocket | **ws** | Текущий, оставить |
| Тесты | **Vitest** | Текущий, оставить |

---

## 7. Best Practices

### Mobile Design
- **Touch targets** — минимум 44x44px (Apple HIG)
- **Font size** — минимум 16px на mobile, 14px для secondary text
- **Gauge** — минимум 80px diameter для читаемости
- **Bottom padding** — 16px для safe area на iPhone
- **No horizontal scroll** — всё в single column

### Performance
- **Virtualization** — для списков > 50 элементов (alerts, sessions)
- **Memoization** — `useMemo` для gauge данных, `useCallback` для обработчиков
- **Debounced polling** — 10s polling, не чаще
- **WebSocket fallback** — если WS отвалился, fallback на polling 30s
- **Code splitting** — lazy load для вкладок (React.lazy + Suspense)

### Accessibility
- **Контраст** — WCAG AA (4.5:1 для текста)
- **Color not only** — красный/зелёный не единственный индикатор (иконка + текст)
- **Font size** — 16px base, responsive
- **Semantic HTML** — `aria-label`, `role` где нужно

### Error Handling
- **Graceful degradation** — если метрика недоступна, показать «Данные недоступны»
- **Retry logic** — 3 попытки с exponential backoff
- **Offline state** — показывать banner «Нет подключения»
- **Loading skeleton** — не spinner, а skeleton screen

---

## 8. Roadmap

### Phase 1: MVP (1-2 недели)
- [ ] Рефактор навигации: 9 вкладок → 5
- [ ] Mobile-first layout: bottom tab bar
- [ ] Единый `/api/dashboard/overview` endpoint
- [ ] Dashboard: 2x2 gauge cards + health check
- [ ] Убрать дублирование метрик (system.js vs metrics-config.js)
- [ ] Graceful fallback для null метрик
- [ ] Удалить мёртвый код (оставшиеся компоненты)

### Phase 2: Графики (2-3 недели)
- [ ] Подключить Recharts
- [ ] Графики GPU/CPU/RAM/tokens
- [ ] Time range selector (1ч/6ч/24ч/7д)
- [ ] WebSocket для real-time обновления графиков
- [ ] Stats.jsx → переделать в график-страницу

### Phase 3: Advanced (2-4 недели)
- [ ] Custom widgets (drag & drop)
- [ ] Alerts & notifications (Telegram bot)
- [ ] AI Process Intelligence → отдельная страница с drill-down
- [ ] Backup history → timeline view
- [ ] Audit log → search & filter
- [ ] Dark/Light theme toggle

---

## 9. API Reference (v2)

### GET /api/dashboard/overview
Единая точка для главного экрана. Возвращает: status, gauge, health, alerts.

### GET /api/metrics/history
Параметры: `metric=gpu_temp&range=24h&interval=1m`
Возвращает: [{ timestamp, value }, ...]

### GET /api/services
Возвращает: [{ name, status, pid, port, uptime }]

### POST /api/services/:name/restart
Перезапуск сервиса.

### GET /api/openclaw/gateway
Возвращает: { model, sessions, version, healthy }

### GET /api/openclaw/sessions
Возвращает: [{ id, label, kind, lastActive }]

### POST /api/openclaw/:action
Actions: start, stop, restart

### GET /api/ai-processes
Возвращает: { processes: [...], anomalies: [...] }

### POST /api/ai-processes/:id/restart
Restart AI process.

### GET /api/backup
Возвращает: [{ id, type, size, created, status }]

### POST /api/backup
Создать бэкап: { type: 'auto'|'manual' }

### POST /api/backup/:id/restore
Восстановить бэкап.

### GET /api/audit
Возвращает: [{ timestamp, action, user, details }]

### GET /api/logs/:service
Параметры: `lines=100&follow=false`
Возвращает: [{ timestamp, level, message }]

---

## 10. File Structure (v2)

```
llama-panel/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── dashboard.js          # NEW: агрегация метрик
│   │   │   ├── metrics.js            # объединённый сборщик
│   │   │   ├── system.js             # CPU/RAM/thermal
│   │   │   ├── llama.js              # llama.cpp metrics
│   │   │   ├── openclaw.js           # OpenClaw API
│   │   │   ├── process-monitor.js    # AI process detection
│   │   │   ├── config-backup.js      # Backup management
│   │   │   ├── audit.js              # Audit logging
│   │   │   ├── rbac.js               # Role-based access
│   │   │   ├── https.js              # TLS management
│   │   │   ├── auth.js               # JWT auth
│   │   │   ├── rate-limit.js         # Rate limiting
│   │   │   ├── websocket.js          # WS broadcasting
│   │   │   └── config.js             # App config
│   │   ├── routes/
│   │   │   ├── dashboard.js          # NEW: /api/dashboard/*
│   │   │   ├── metrics.js            # /api/metrics/*
│   │   │   ├── metrics-config.js     # /api/metrics/config
│   │   │   ├── process.js            # /api/process/*
│   │   │   ├── backup.js             # /api/backup/*
│   │   │   ├── audit.js              # /api/audit/*
│   │   │   ├── service.js            # /api/service/*
│   │   │   ├── auth.js               # /api/auth/*
│   │   │   └── openclaw.js           # /api/openclaw/*
│   │   └── index.js                  # Server entry
├── frontend/