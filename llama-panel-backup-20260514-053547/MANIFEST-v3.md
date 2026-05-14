# Llama Panel v3 — Манифест и Гайдлайн

> **Статус:** Phase 1 ✅ | **Дата:** 2026-05-14
> **Цель:** Переосмыслить панель с нуля — mobile-first, быстрые метрики, понятная навигация

---

## 1. Философия

### Кто пользователь
IT-начальник логистической компании. Проверяет LLM-сервер со смартфона 2-3 раза в день по 30-60 секунд. Сценарий: «Сервер работает? GPU в порядке? Токены идут?»

### Главный принцип
> **2 секунды до ответа «всё ок» или «надо действовать».**

Всё, что не укладывается в этот сценарий — на второй уровень.

---

## 2. Проблемы текущей версии (v2)

| # | Проблема | Почему не работает |
|---|----------|-------------------|
| 1 | **9 вкладок** в горизонтальном скролле | На телефоне 360px — 6 вкладок не влезают, скролл неудобен |
| 2 | **Метрики не работают** | Dashboard.jsx дергает 5 endpoint'ов независимо — если один падает, секция пустая |
| 3 | **Мелкий текст** | 10-12px шрифты, progress bars 10px — нечитаемо с телефона |
| 4 | **Нет единого состояния** | Каждая секция сама решает, как грузить данные — нет общей стратегии fallback |
| 5 | **Дублирование** | system.js + metrics-config.js, useMetrics + useWebSocket, 5 endpoint'ов для одного dashboard |
| 6 | **Нет группировки** | «Управление», «Конфиг», «Логи», «Аудит» — всё на одном уровне, нет иерархии |

---

## 3. Навигация — 4 раздела, вложенные подвкладки

### Структура

```
┌──────────────────────────────────────┐
│ 🦙 Llama Panel          ● Connected │
├──────────────────────────────────────┤
│                                      │
│          КОНТЕНТ                     │
│                                      │
├──────────────────────────────────────┤
│ 🏠     📊     🔧     ⚙️             │
│ Обзор  Метрики Управление Настройки  │
└──────────────────────────────────────┘
```

### Mobile: Bottom Tab Bar (4 вкладки)

| Вкладка | Содержание |
|---------|-----------|
| 🏠 **Обзор** | Статус-бар, KPI-карточки (CPU/RAM/VRAM/Temp), health check, последние события |
| 📊 **Метрики** | Графики: GPU, CPU, RAM, токены. Time selector [1ч 6ч 24ч 7д] |
| 🔧 **Управление** | Сервисы, OpenClaw, AI-процессы, бэкапы |
| ⚙️ **Настройки** | Конфиг llama, Логи, Аудит, Алерты |

### Desktop: Sidebar + Content
- Sidebar слева (collapsible), контент справа
- Hover → tooltip

### Подвкладки (внутри разделов)

**🔧 Управление:**
```
▸ Сервисы          — статус + кнопки старт/стоп/рестарт
▸ OpenClaw         — gateway, sessions, resources
▸ AI Процессы      — обнаружение аномалий
▸ Бэкапы           — история, создать, восстановить
```

**⚙️ Настройки:**
```
▸ Конфиг llama     — параметры, сохранить
▸ Логи             — llama-8080, llama-panel
▸ Аудит            — история действий
▸ Алерты           — пороги, уведомления
```

### Почему 4 вкладки?
Apple HIG рекомендует 3-5 табов. 4 — идеально.
Подвкладки решают проблему перегрузки без горизонтального скролла.

---

## 4. Дизайн-система

### Цвета

| Роль | Цвет | Hex |
|------|------|-----|
| OK | 🟢 | `#10B981` |
| Warning | 🟡 | `#F59E0B` |
| Critical | 🔴 | `#EF4444` |
| Info | 🔵 | `#3B82F6` |
| Disabled | ⚪ | `#6B7280` |
| Background | — | `#030712` (gray-950) |
| Card bg | — | `#111827` (gray-900) |
| Border | — | `#1F2937` (gray-800) |
| Text primary | — | `#F9FAFB` (gray-50) |
| Text secondary | — | `#9CA3AF` (gray-400) |

### Типографика

| Элемент | Mobile | Desktop |
|---------|--------|---------|
| Body | 14px / 400 | 14px / 400 |
| Value (крупные числа) | 24px / 700 | 28px / 700 |
| Label | 11px / 600 | 12px / 600 |
| Header | 18px / 700 | 20px / 700 |
| Secondary text | 12px / 400 | 13px / 400 |

### Touch targets
- **Минимум 44×44px** (Apple HIG)
- Кнопки: min `12px 16px` padding

---

## 5. Обзор — Главный экран

### Layout (mobile, single column)

```
┌─────────────────────────┐
│ Status Bar              │ ← WS ● Llama ● OpenClaw
├─────────────────────────┤
│ ┌───────┐ ┌───────┐    │
│ │ CPU   │ │ RAM   │    │ ← KPI-карточки 2×2
│ │ 42%   │ │ 61%   │    │
│ │ ███░░ │ │ ████░ │    │
│ └───────┘ └───────┘    │
│ ┌───────┐ ┌───────┐    │
│ │ VRAM  │ │ Temp  │    │
│ │ 78%   │ │ 62°C  │    │
│ │ ████░ │ │ ██░░░ │    │
│ └───────┘ └───────┘    │
├─────────────────────────┤
│ 📋 Health Check         │
│ ✅ Llama Server         │
│ ✅ OpenClaw Gateway     │
│ ⚠️ GPU Temp: 62°C       │
│ ✅ AI Processes: 3      │
├─────────────────────────┤
│ 🔔 Последние события    │
│ 14:23 GPU temp warning  │
│ 12:01 Backup completed  │
└─────────────────────────┘
```

### KPI-карточки
- **2×2 grid** на mobile, **4×1** на desktop
- Label (мелкий), value (крупный), progress bar
- Цвет по threshold

### Thresholds

| Метрика | Warning | Critical |
|---------|---------|----------|
| CPU | >80% | >95% |
| RAM | >85% | >95% |
| VRAM | >85% | >95% |
| GPU Temp | >70°C | >85°C |
| Disk | >85% | >95% |

---

## 6. API — Единый endpoint

### Проблема
Dashboard.jsx делает 5 независимых fetch'ей. Если один падает — секция пустая.

### Решение: `/api/dashboard/overview`

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
    "cpu": { "usage": 42, "cores": 16, "temp": 45 },
    "memory": { "usedPercent": 61, "total": 32000, "used": 19520 },
    "gpu": { "temp": 62, "load": 68, "vramUsed": 12000, "vramTotal": 24000 },
    "llm": { "tokensPerSecond": 42, "queueSize": 3, "decoded": 52341 }
  },
  "health": [
    { "service": "Llama Server", "status": "ok", "detail": "42 t/s" },
    { "service": "OpenClaw", "status": "ok", "detail": "active" },
    { "service": "GPU", "status": "warning", "detail": "62°C" }
  ],
  "alerts": [
    { "time": "14:23", "level": "warning", "message": "GPU temp 62°C" },
    { "time": "12:01", "level": "info", "message": "Backup completed" }
  ]
}
```

### Fallback-стратегия

```
GPU metrics:
  1. nvidia-smi (NVIDIA GPU)
  2. systeminformation (fallback)
  3. null → UI: «GPU данные недоступны»

LLM metrics:
  1. Prometheus /metrics (если --metrics включён)
  2. journalctl stats (fallback)
  3. null → UI: «LLM метрики отключены»

System metrics:
  1. systeminformation + /proc/stat
  2. null → показать ошибку
```

### Новые endpoint'ы

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/dashboard/overview` | Единая точка для главного экрана |
| GET | `/api/metrics/history` | Графики: `?metric=gpu_temp&range=24h` |
| GET | `/api/services` | Список сервисов со статусом |
| POST | `/api/services/:name/restart` | Перезапуск сервиса |
| GET | `/api/openclaw/gateway` | Статус gateway |
| GET | `/api/openclaw/sessions` | Список сессий |
| GET | `/api/ai-processes` | AI процессы + аномалии |
| GET | `/api/backup` | История бэкапов |
| POST | `/api/backup` | Создать бэкап |
| GET | `/api/audit` | Аудит-лог |
| GET | `/api/logs/:service` | Логи сервиса |

---

## 7. Технологический стек

### Frontend
| Компонент | Выбор | Обоснование |
|-----------|-------|-------------|
| Фреймворк | React 18 + Vite | Текущий, не меняем |
| Стили | TailwindCSS | Уже есть, mobile-first |
| Графики | Recharts | Лёгкий, React-first |
| Иконки | Lucide React | Tree-shakeable, 1000+ иконок |
| State | React hooks | Zustand избыточен |

### Backend
| Компонент | Выбор | Обоснование |
|-----------|-------|-------------|
| Runtime | Node.js + Express | Текущий |
| Метрики | dashboard.js | Новый агрегирующий service |
| WebSocket | ws | Текущий |

---

## 8. Правила разработки

### Mobile-First
- Верстаем сначала для 360px, потом расширяем
- Bottom tab bar на mobile, sidebar на desktop
- Touch targets ≥ 44×44px
- Font: 14px base, 24px для value
- No horizontal scroll

### Graceful Degradation
- Если метрика недоступна → «Данные недоступны», не null/spinner
- Если API упал → polling fallback 3 сек
- Retry logic: 3 попытки, exponential backoff

### Performance
- Polling overview: каждые 3 сек
- Debounce для поиска в логах
- React.memo для KPI-карточек
- Virtualization для списков > 50 элементов
- Lazy load для вкладок

### Code Quality
- Каждый компонент — один файл
- Компонент ≤ 200 строк
- Hooks — один файл на hook
- No inline styles
- Thresholds в constants, не хардкод
- No dead code — удалять при рефакторинге

### Error Handling
- Error boundaries на каждой секции
- Retry button на секциях с ошибкой
- Консистентные сообщения

---

## 9. File Structure (v3)

```
llama-panel/
├── backend/
│   └── src/
│       ├── services/
│       │   ├── dashboard.js      # NEW: /api/dashboard/overview
│       │   ├── metrics.js        # NEW: /api/metrics/history
│       │   ├── system.js         # оставить (CPU/RAM/thermal)
│       │   ├── llama.js          # оставить (llama.cpp metrics)
│       │   ├── service.js        # оставить (systemd)
│       │   ├── openclaw.js       # оставить
│       │   ├── process-monitor.js# оставить
│       │   ├── config-backup.js  # оставить
│       │   ├── auth.js           # оставить
│       │   ├── websocket.js      # оставить
│       │   └── config.js         # оставить
│       └── routes/
│           ├── dashboard.js      # NEW: /api/dashboard/*
│           ├── metrics.js        # NEW: /api/metrics/*
│           ├── service.js        # оставить
│           ├── auth.js           # оставить
│           ├── process.js        # оставить
│           ├── backup.js         # оставить
│           ├── audit.js          # оставить
│           └── openclaw.js       # оставить
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── App.jsx           # переписать: tabs + layout
│       │   ├── Header.jsx        # sticky header
│       │   ├── BottomTabBar.jsx  # NEW: mobile bottom bar
│       │   ├── Overview.jsx      # NEW: главный экран
│       │   ├── Metrics.jsx       # NEW: графики
│       │   ├── Management.jsx    # NEW: подвкладки управления
│       │   ├── Settings.jsx      # NEW: подвкладки настроек
│       │   ├── KPICard.jsx       # NEW: KPI карточка
│       │   ├── SectionCard.jsx   # NEW: унифицированная секция
│       │   ├── ServiceCard.jsx   # NEW: карточка сервиса
│       │   ├── HealthCheck.jsx   # NEW: health check list
│       │   ├── EventList.jsx     # NEW: последние события
│       │   ├── AlertBanner.jsx   # NEW: алерт-баннер
│       │   └── ErrorBoundary.jsx # оставить
│       ├── hooks/
│       │   ├── useDashboard.js   # NEW: единый hook
│       │   ├── useWebSocket.js   # оставить
│       │   └── useAuth.js        # перенести из contexts/
│       └── main.jsx
│
└── MANIFEST-v3.md              # этот файл
```

---

## 10. План реализации

### Phase 1: Фундамент ✅ ЗАВЕРШЕНО (2026-05-14)
- [x] Создать `backend/src/services/dashboard.js` — единый `/api/dashboard/overview`
- [x] Добавить route `/api/dashboard/*`
- [x] Создать `frontend/src/hooks/useDashboard.js` — polling 3 сек
- [x] Создать `KPICard.jsx` — карточка с threshold цветами
- [x] Создать `SectionCard.jsx` — унифицированная секция
- [x] Создать `Overview.jsx` — главный экран: 2x2 KPI + health check + алерты
- [x] Создать `BottomTabBar.jsx` — 4 вкладки, 44px targets
- [x] Создать `Management.jsx` — подвкладки: Сервисы, OpenClaw, AI Процессы, Бэкапы
- [x] Создать `Settings.jsx` — подвкладки: Конфиг, Логи, Аудит, Алерты
- [x] Рефактор `App.jsx` — 4 вкладки вместо 9
- [x] Удалить мёртвый код: Dashboard.jsx, GaugeWidget.jsx, useMetrics.js, AlertManager.jsx, SessionList.jsx
- [x] Обновить `index.css` — убрать zoom-хаки, добавить safe area
- [x] Обновить тесты — 4/4 проходят
- [x] Сборка frontend — OK
- [x] Бэкенд запущен, endpoint `/api/dashboard/overview` — OK

### Phase 2: Управление и Настройки (2-3 дня)
- [ ] `Management.jsx` — подвкладки: Сервисы, OpenClaw, AI Процессы, Бэкапы
- [ ] `Settings.jsx` — подвкладки: Конфиг, Логи, Аудит, Алерты
- [ ] Адаптировать существующие компоненты (ProcessMonitor, BackupManager, AuditLog)
- [ ] Desktop sidebar layout

### Phase 3: Графики (2-3 дня)
- [ ] `Metrics.jsx` — график-страница
- [ ] Подключить Recharts
- [ ] Time range selector [1ч 6ч 24ч 7д]
- [ ] `/api/metrics/history` с агрегацией по интервалам
- [ ] WebSocket для real-time обновления графиков

### Phase 4: Полировка (1-2 дня)
- [ ] Lucide React иконки
- [ ] Skeleton loading вместо спиннеров
- [ ] Offline banner
- [ ] Dark/Light theme toggle
- [ ] Тестирование на реальном телефоне
- [ ] Документация в README

---

## 11. Сравнение v1 → v2 → v3

| Аспект | v1 (текущий) | v2 (черновик) | v3 (этот манифест) |
|--------|-------------|---------------|-------------------|
| Вкладки | 9 (скролл) | 4-5 (tab bar) | **4 (tab bar) + подвкладки** |
| Метрики | 5 endpoints | 1 endpoint | **1 endpoint + fallback** |
| Мобильность | Нет | Bottom bar | **Bottom bar + 44px targets** |
| Читаемость | 10-12px | 14px base | **14px base, 24px value** |
| Фоллбэк | Нет | Частичный | **Полный: API → polling → UI** |
| Код | Дублирование | Частично | **Удаление мёртвого кода** |
| Иконки | Emoji | Emoji | **Lucide React** |

---

## 12. Критерии готовности (Definition of Done)

### UX
- [x] Главный экран загружается < 1 сек
- [x] Статус системы виден за 2 секунды
- [x] Bottom tab bar работает на 360px
- [x] Нет горизонтального скролла
- [x] Все кнопки ≥ 44px

### Функционал
- [x] `/api/dashboard/overview` возвращает все метрики за 1 запрос
- [ ] Если метрика недоступна → показывается понятное сообщение (fallback в dashboard.js)
- [x] Все 4 вкладки работают
- [x] Подвкладки работают
- [ ] Графики — Phase 3

### Код
- [x] Нет дублирования метрик
- [x] Thresholds в constants (dashboard.js)
- [x] Компоненты ≤ 200 строк
- [x] Error boundaries (ErrorBoundary.jsx оставлен)
- [ ] README — Phase 4

---

## 13. Риски

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| Контекст архитектора режется на полпути | Высокая | Читать самому, не полагаться на подпагента |
| Recharts тяжёлый для mobile | Средняя | Code splitting, lazy load |
| WebSocket нестабилен на мобильном интернете | Высокая | Polling fallback 3 сек |
| Бэкенд тормозит при aggregation | Низкая | Promise.allSettled, таймаут 2 сек |
| Смена дизайна ломает существующие скрипты | Средняя | Сохранить совместимость API |

---

*Документ создан 2026-05-14. Обсудить с Денисом перед началом разработки.*