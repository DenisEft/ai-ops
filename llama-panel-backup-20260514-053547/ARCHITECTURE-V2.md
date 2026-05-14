# Llama Panel v2 — Архитектура и дизайн-документ

> **Цель:** Переписать панель мониторинга LLM-сервера для мобильной проверки инфраструктуры логистической IT-команды.
> **Авторы:** AI-архитектор, Денис (заказчик)
> **Дата:** 2026-05-14
> **Статус:** Draft v1

---

## 1. Концепция

### Целевая аудитория

IT-начальник логистической компании. Проверяет LLM-сервер (Qwen3.6-35B MoE) со смартфона, 3-5 раз в день по 30-60 секунд. Сценарий: «Сервер работает? GPU в порядке? Токены идут?»

### Приоритеты

1. **Mobile-first** — 80% проверок с телефона (360-400px). Bottom tab bar
2. **Status at a glance** — статус всего за 2 секунды
3. **Progressive disclosure** — overview → drill-down
4. **Graceful degradation** — null/ошибки не ломают UI
5. **Dark theme, minimal** — только статусные акценты

### Цветовая система

| Цвет | Код | Значение |
|------|-----|----------|
| 🟢 | `#10B981` | OK |
| 🟡 | `#F59E0B` | warning (CPU>80%, VRAM>90%, temp>70°C) |
| 🔴 | `#EF4444` | critical (server down, disk>95%) |
| ⚪ | `#6B7280` | unavailable / null |
| 🔵 | `#3B82F6` | accent / interactive |
| 🟣 | `#A855F7` | prompt tokens |
| 🟠 | `#F59E0B` | output/eval tokens |

---

## 2. Структура навигации

### Новая структура: 4 вкладки

```
┌─────────────────────────────────────────┐
│  🦙 Llama Panel           ● Connected  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  🟢 Llama Server: RUNNING       │   │
│  │  CPU 42%  RAM 61%  VRAM 78%    │   │
│  │  Temp 62°C  ⚡ 245W             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────────┐ ┌──────────┐             │
│  │ Запросов │ │ Токенов  │             │
│  │  1,247   │ │  3.2M    │             │
│  └──────────┘ └──────────┘             │
│                                         │
│  ┌──────────┐ ┌──────────┐             │
│  │ Скорость │ │ VRAM     │             │
│  │  42 т/с  │ │ 12.4/16G │             │
│  └──────────┘ └──────────┘             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Последние запросы  [▶]         │   │
│  │  #3  512→128  1.2s  107 т/с     │   │
│  │  #7  1024→256 3.4s  75 т/с       │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  🏠     📊      🔧      ⚙️            │
│  Обзор   Токены Управление Конфиг      │
└─────────────────────────────────────────┘
```

### Вкладки

| Вкладка | Контент | Иконка |
|---------|---------|--------|
| **Обзор** | Главный экран: статус, KPI-карточки, последние запросы, быстрые действия | 🏠 |
| **Токены** | Статистика: графики токенов/запросов, распределение, скорость, таблица | 📊 |
| **Управление** | Сервисы (старт/стоп/рестарт), логи, чат с LLM | 🔧 |
| **Конфиг** | Параметры llama-server, редактирование, systemd unit | ⚙️ |

### Навигация

**Mobile (md:hidden):** Bottom tab bar — 4 вкладки помещаются, палец достает.
**Desktop (hidden md:flex):** Top horizontal tabs — вместо bottom bar.

```jsx
<div className="hidden md:flex border-b border-gray-800 bg-gray-900/50">
  {/* desktop tabs */}
</div>
<div className="fixed bottom-0 left-0 right-0 md:hidden border-t border-gray-800 bg-gray-900/95 z-50">
  {/* mobile tabs */}
</div>
```

---

## 3. Dashboard дизайн

### 3.1. Обзор (главный экран)

**Sticky header:**
```
🦙 Llama Panel  ● Подключено    обновлено 14:32:15  [↻]
```

**Сервисный статус-бар:**
```
🟢 Llama Server: RUNNING    🟢 llama-panel: active    GPU: NVIDIA RTX 3080
```

**4 KPI-карточки** (2×2 mobile / 4×1 desktop):
```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ CPU    │ │ RAM    │ │ VRAM   │ │ TEMP   │
│ 42%    │ │ 61%    │ │ 78%    │ │ 62°C   │
│ ░░░░░  │ │ ░░░░░  │ │ ░░░░░  │ │ ░░░░░  │
└────────┘ └────────┘ └────────┘ └────────┘
```

**Последние запросы** (сворачиваемая секция, 3 строки):
```
┌──────────────────────────────────┐
│ Последние запросы  [▶]           │
│ #3  512→128  1.2s  107 т/с     │
│ #7  1024→256 3.4s  75 т/с       │
│ ...                              │
└──────────────────────────────────┘
```

**Быстрые действия:** `[↻ Обновить] [🔄 Рестарт] [📋 Логи]`

### 3.2. Когда что использовать

| Элемент | Когда | Пример |
|---------|-------|--------|
| KPI-карточка | Одно число с контекстом | CPU%, VRAM%, скорость |
| Progress bar | Значение с порогом | Прогресс-бар загрузки |
| Таблица | Множество строк | Последние запросы, логи |
| График | Тренд во времени | Токены за неделю |
| Donut chart | Доли от целого | Prompt vs Output |

### 3.3. Mobile Layout

```css
.kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
.kpi-card { min-height: 80px; padding: 12px; }
button, .tab-item { min-height: 44px; } /* touch target */
body { font-size: 14px; }
.value { font-size: 18px; font-weight: 700; }
```

### 3.4. Цветовые состояния

```jsx
function MetricColor({ value, thresholds }) {
  if (value >= thresholds.critical) return 'text-red-400'
  if (value >= thresholds.warning) return 'text-amber-400'
  return 'text-white'
}

const thresholds = {
  cpu:  { warning: 80, critical: 95 },
  ram:  { warning: 85, critical: 95 },
  vram: { warning: 85, critical: 95 },
  temp: { warning: 70, critical: 85 },
  disk: { warning: 85, critical: 95 },
}
```

### 3.5. Единый SectionCard для всех секций

```jsx
function SectionCard({ title, status, children, error, onRetry }) {
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">{title}</span>
        {status === 'loading' && <Spinner size="sm" />}
        {status === 'error' && (
          <button onClick={onRetry} className="text-[10px] text-blue-400">↻</button>
        )}
        {status === 'ok' && <LiveDot />}
      </div>
      {status === 'loading' && <div className="flex items-center justify-center py-8">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>}
      {status === 'error' && <div className="text-center py-4 text-xs text-gray-500">Данные недоступны</div>}
      {status === 'ok' && children}
    </div>
  )
}
```

---

## 4. Метрики — что реально нужно

### 4.1. Проблемы v1

1. **5 endpoint'ов** для метрик — `/api/metrics/system`, `/gpu`, `/llama`, `/service`, `/openclaw/status`
2. **Дублирование GPU:** system.js → `systeminformation`, llama.js → `nvidia-smi`. Два набора null
3. **Prometheus** на порту 8080 — требует `--metrics`, часто отключён
4. **nvidia-smi** — только NVIDIA, нет fallback
5. **useMetrics + useWebSocket** — два хука для одной функции

### 4.2. Единый endpoint: `/api/dashboard`

```json
{
  "timestamp": "2026-05-14T14:32:15.000Z",
  "refreshInterval": 3000,

  "llama": {
    "status": "running",
    "health": { ... },
    "props": { ... },
    "metrics": {
      "promptTotal": 1247,
      "evalTotal": 52341,
      "queueTime": 12.5,
      "promptTime": 45.2,
      "evalTime": 23.1
    },
    "metricsError": null
  },

  "service": {
    "llama8080": { "active": true, "pid": 1234, "status": "active" },
    "llamaPanel": { "active": true, "pid": 5678, "status": "active" }
  },

  "gpu": {
    "name": "NVIDIA RTX 3080",
    "vramUsed": 12416, "vramTotal": 16384, "vramPercent": 76,
    "temperature": 62, "powerDraw": 245, "clock": 1890, "fanSpeed": 45,
    "source": "nvidia-smi"
  },

  "system": {
    "cpu": { "brand": "AMD Ryzen 9 5900X", "usage": 42, "cores": 12, "threads": 24 },
    "memory": { "used": 12582, "total": 20480, "percent": 61 },
    "load": { "load1": 2.45, "load5": 1.82, "load15": 1.34 },
    "filesystem": { "used": 450, "total": 1000, "percent": 45 }
  }
}
```

### 4.3. Fallback-стратегия

```
GPU metrics (приоритет):
1. nvidia-smi (если GPU NVIDIA)
2. Prometheus /metrics (если включён)
3. systeminformation (fallback, less accurate)
4. null → UI показывает «недоступно»

LLM metrics (приоритет):
1. Prometheus /metrics (если включён)
2. Stats from journalctl (уже в stats.js)
3. null → UI показывает «метрики отключены»

System metrics:
1. systeminformation (уже работает)
2. /proc/stat (уже для CPU usage)
3. null → критично, показать ошибку
```

### 4.4. Backend: новый service `dashboard.js`

```js
// backend/src/services/dashboard.js
export async function getDashboard() {
  const results = await Promise.allSettled([
    getLlamaStatus(),
    getServiceStatus('llama-8080.service'),
    getServiceStatus('llama-panel.service'),
    getGpuMetrics(),
    getSystemMetrics(),
  ])

  const [llama, svc8080, svcPanel, gpu, system] = results.map(r =>
    r.status === 'fulfilled' ? r.value : null
  )

  return {
    timestamp: new Date().toISOString(),
    refreshInterval: 3000,
    llama,
    service: { llama8080: svc8080, llamaPanel: svcPanel },
    gpu,
    system,
  }
}
```

### 4.5. Что отбрасываем

| Было | Станет | Почему |
|------|--------|--------|
| `/api/metrics/system` | в `/api/dashboard` | объединение |
| `/api/metrics/gpu` | в `/api/dashboard` | объединение |
| `/api/metrics/llama` | в `/api/dashboard` | объединение |
| `/api/metrics/service` | в `/api/dashboard` | объединение |
| `/api/openclaw/status` | удалить | не относится к llama-panel |
| metrics-config.js | удалить | дублирование с system.js |
| useMetrics.js hook | удалить | заменяется на useDashboard |
| useWebSocket.js hook | заменить | единый useDashboard с fallback на polling |

---

## 5. Технологический стек

### 5.1. Фреймворк: React + Vite — оставить

Текущий стек OK. Нет смысла менять:
- React 19 — актуальный, stable
- Vite 6 — быстрый dev, отличный production build
- TailwindCSS 3 — utility-first, отлично для dashboard

### 5.2. UI-библиотека: TailwindCSS — оставить, расширить

Не добавлять shadcn/ui или MUI — overhead для такого проекта. Добавить кастомные компоненты в `@layer components`:

```css
@layer components {
  .kpi-card {
    @apply bg-gray-900/80 border border-gray-800 rounded-xl p-3 min-h-[80px];
  }
  .kpi-label {
    @apply text-[10px] text-gray-500 mb-0.5;
  }
  .kpi-value {
    @apply text-sm md:text-base font-bold text-white;
  }
  .kpi-bar {
    @apply w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1;
  }
  .kpi-bar-fill {
    @apply h-full rounded-full transition-all duration-500;
  }
  .status-dot {
    @apply w-2 h-2 rounded-full;
  }
  .status-dot--ok { @apply bg-emerald-400; }
  .status-dot--warn { @apply bg-amber-400; }
  .status-dot--error { @apply bg-red-400; }
  .status-dot--off { @apply bg-gray-600; }
  .live-dot {
    @apply w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse;
  }
}
```

### 5.3. Графики: Recharts — оставить

Recharts уже в зависимостях, работает. Для v2:
- Использовать только на вкладке «Токены»
- На «Обзоре» — только KPI-карточки (без графиков)
- Добавить `@recharts/plugin-zoom` для скролла/зуминга

### 5.4. State management: Zustand — оставить, добавить useDashboard

Здесь не нужен ни Zustand, ни Redux — данные простые. Использовать React hooks:

```jsx
// hooks/useDashboard.js
import { useState, useEffect, useCallback } from 'react'

const REFRESH_INTERVAL = 3000

export function useDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [connected, setConnected] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, loading, error, lastUpdated, connected, refetch: fetchData }
}
```

### 5.5. WebSocket: оставить как опциональный real-time слой

Текущий useWebSocket.js — хороший костыль для real-time обновления. Для v2:
- Оставить как **опциональный** layer поверх polling
- Если WS подключён — показывать «Live» индикатор
- Если WS отключён — polling каждые 3 сек

```jsx
// hooks/useDashboard.js — с WS fallback
export function useDashboard() {
  const [wsConnected, setWsConnected] = useState(false)

  // WebSocket для real-time
  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/ws`)
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'metric-update') setData(data.payload)
    }
    return () => ws.close()
  }, [])

  // Polling как fallback
  // ... (см. выше)

  return { ...rest, wsConnected }
}
```

### 5.6. Auth: JWT — оставить

Текущий JWT auth через `/api/auth/login` работает. Для v2:
- Добавить auto-refresh токена
- Добавить remember-me
- Добавить logout в header

---

## 6. Best practices для dashboard

### 6.1. Информационная плотность без перегрузки

**Правило 80/20:** 20% информации дают 80% понимания. На главном экране — только:
1. Статус сервера
2. CPU, RAM, VRAM, Temp
3. Скорость т/с
4. Последние 3 запроса

Всё остальное — по нажатию.

### 6.2. Progressive disclosure

```
Уровень 1 (Обзор): статус + KPI + последние 3
  ↓ click
Уровень 2 (Токены): графики за день/неделю/месяц
  ↓ click
Уровень 3 (Детали): конкретный запрос, логи, конфиг
```

### 6.3. Real-time vs polling — баланс

| Метрика | Частота | Метод |
|---------|---------|-------|
| Статус сервера | 3 сек | Polling |
| GPU метрики | 3 сек | Polling |
| System metrics | 3 сек | Polling |
| LLM metrics | 1 сек | WebSocket |
| Logs | on-demand | Polling |
| Stats (histogram) | on-demand | Polling |

**Правило:** только то, что меняется быстро → WS. Остальное → polling.

### 6.4. Accessibility

- **Контраст:** WCAG AA минимум (4.5:1 для текста)
- **Размер шрифта:** минимум 14px body, 18px для value
- **Touch targets:** минимум 44×44px
- **Color не единственный индикатор:** статус + иконка + цвет
- **Focus states:** visible для keyboard navigation

```css
/* Accessibility overrides */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.5. Performance

- **Memoization:** `React.memo()` для KPI-карточек (не ререндерить при обновлениях других метрик)
- **Virtualization:** для логов и длинных списков (>100 строк)
- **Debounced search:** для поиска в логах
- **Lazy loading:** вкладки загружаются по требованию
- **Service Worker:** кэширование `/api/dashboard` для offline

```jsx
// React.memo для KPI-карточек
const KPICard = React.memo(function KPICard({ label, value, unit, thresholds }) {
  const color = MetricColor(value, thresholds)
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}{unit}</div>
      <div className="kpi-bar">
        <div
          className={`kpi-bar-fill ${BarColor(value, thresholds)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
})
```

---

## 7. Roadmap

### Phase 1: MVP (2-3 дня)

**Цель:** Рабочий mobile-first dashboard с 4 вкладками

- [ ] Создать `backend/src/services/dashboard.js` — единый endpoint
- [ ] Добавить `/api/dashboard` route
- [ ] Удалить `/api/metrics/*` routes
- [ ] Удалить `useMetrics.js`, заменить на `useDashboard.js`
- [ ] Удалить `Dashboard.jsx` (старый), создать `Overview.jsx`
- [ ] Создать `TokenStats.jsx` — вкладка «Токены»
- [ ] Создать `Management.jsx` — вкладка «Управление»
- [ ] Создать `Config.jsx` — вкладка «Конфиг»
- [ ] Создать `BottomTabBar.jsx` — мобильная навигация
- [ ] Адаптировать `Header.jsx` — sticky header
- [ ] Добавить `SectionCard.jsx` — унифицированные секции
- [ ] Настроить mobile/desktop breakpoints
- [ ] Удалить `/api/openclaw/*` (не относится)
- [ ] Удалить metrics-config.js (дублирование)
- [ ] Добавить fallback-стратегию для GPU/LLM metrics
- [ ] Протестировать на телефоне (360px width)

### Phase 2: Графики и аналитика (3-4 дня)

**Цель:** Визуализация трендов, фильтры, экспорт

- [ ] Добавить графики в «Токены» (Recharts)
  - [ ] Line chart: токены за день/неделю/месяц
  - [ ] Bar chart: скорость т/с по часам
  - [ ] Donut: prompt vs output токены
- [ ] Добавить brush для навигации по временной шкале
- [ ] Добавить фильтр по дате
- [ ] Добавить экспорт данных (CSV, JSON)
- [ ] Добавить сравнение периодов
- [ ] Добавить `@recharts/plugin-zoom` для desktop
- [ ] Оптимизировать графики (virtualization для больших датасетов)
- [ ] Добавить WebSocket для real-time метрик LLM

### Phase 3: Alerts и кастомизация (5-7 дней)

**Цель:** Умные уведомления, кастомные виджеты, настройки

- [ ] Система алертов:
  - [ ] Настройка порогов (CPU, RAM, VRAM, temp, disk)
  - [ ] Уведомления в Telegram (через @cyberden8)
  - [ ] Push-уведомления (PWA)
- [ ] Кастомные виджеты:
  - [ ] Drag & drop layout
  - [ ] Сохранение layout в localStorage
  - [ ] Шаблоны layout (monitoring, debugging, reporting)
- [ ] Dark/Light theme toggle
- [ ] Локализация (RU/EN)
- [ ] PWA: Service Worker, offline mode, add to home screen
- [ ] Настройка refresh interval
- [ ] Группировка метрик по тэгам

---

## 8. Структура файлов v2

```
llama-panel/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── dashboard.js      # ← новый: единый endpoint
│   │   │   ├── llama.js          # ← оставить (health/props/metrics)
│   │   │   ├── service.js        # ← оставить (systemd services)
│   │   │   ├── stats.js          # ← оставить (journalctl stats)
│   │   │   ├── system.js         # ← оставить (systeminfo)
│   │   │   └── websocket.js      # ← оставить (WS broadcast)
│   │   ├── routes/
│   │   │   ├── dashboard.js      # ← новый: GET /api/dashboard
│   │   │   ├── auth.js           # ← оставить
│   │   │   ├── service.js        # ← оставить
│   │   │   └── stats.js          # ← оставить
│   │   ├── config.js
│   │   └── index.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.jsx           # ← переписать: tabs + layout
│   │   │   ├── Header.jsx        # ← sticky header
│   │   │   ├── BottomTabBar.jsx  # ← новый: mobile tabs
│   │   │   ├── SectionCard.jsx   # ← новый: унифицированные секции
│   │   │   ├── KPICard.jsx       # ← новый: KPI карточки
│   │   │   ├── Overview.jsx      # ← новый: главный экран
│   │   │   ├── TokenStats.jsx    # ← новый: графики + таблица
│   │   │   ├── Management.jsx    # ← новый: сервисы + логи + чат
│   │   │   ├── Config.jsx        # ← новый: конфиг + системная инфо
│   │   │   ├── LiveDot.jsx       # ← новый: пульсирующая точка
│   │   │   ├── Spinner.jsx       # ← новый: спиннер
│   │   │   └── MetricBar.jsx     # ← новый: прогресс-бар метрики
│   │   ├── hooks/
│   │   │   ├── useDashboard.js   # ← новый: единый hook
│   │   │   ├── useWebSocket.js   # ← оставить (optional)
│   │   │   └── useAuth.js        # ← переместить из contexts/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # ← оставить
│   │   ├── index.css             # ← обновить: @layer components
│   │   └── main.jsx
│   └── package.json
```

---

## 9. Сравнение v1 vs v2

| Аспект | v1 | v2 |
|--------|----|----|
| Вкладки | 5 (скролл) | 4 (tab bar) |
| Метрики | 5 endpoints | 1 endpoint |
| GPU | nvidia-smi + systeminfo | единый с fallback |
| LLM metrics | Prometheus (null если откл) | Prometheus + journalctl + null |
| Навигация | Горизонтальный скролл | Bottom tab bar (mobile) + top tabs (desktop) |
| Состояния | Нет | Loading/Error/OK для каждой секции |
| Touch targets | Разные | Минимум 44×44px |
| Цвета | Нет системы | Цветовая система по статусам |
| Графики | ChartWidget (удалён) | Recharts (только на вкладке «Токены») |
| State | 2 хука | 1 хук (useDashboard) |
| WS | Обязательный | Опциональный (fallback на polling) |
| Auth | JWT | JWT + auto-refresh + remember-me |
| Mobile | Нет адаптивности | Mobile-first, 360px tested |

---

## 10. Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|----------|
| Prometheus недоступен | Высокая | Среднее | Fallback на journalctl stats |
| nvidia-smi недоступен | Средняя | Среднее | Fallback на systeminformation |
| WebSocket падает | Средняя | Низкое | Polling fallback 3 сек |
| Мобильный layout ломается | Низкая | Высокое | Тестировать на реальных устройствах |
| JWT токены истекают | Высокая | Среднее | Auto-refresh + remember-me |
| Большой dataload для графиков | Средняя | Низкое | Pagination + virtualization |
| Темная тема не везде | Низкая | Низкое | CSS custom properties |

---

## 11. Checklist для запуска

### Pre-launch
- [ ] Все метрики собираются корректно
- [ ] Fallback работает при отсутствии nvidia-smi
- [ ] Fallback работает при отсутствии Prometheus
- [ ] WS reconnect при обрыве
- [ ] Polling работает без WS
- [ ] Mobile layout на 360px
- [ ] Desktop layout на 1920px
- [ ] JWT auto-refresh
- [ ] Error boundaries на каждом компоненте

### Post-launch monitoring
- [ ] Счётчик ошибок (Sentry или аналог)
- [ ] Время загрузки страницы (< 2 сек)
- [ ] Количество запросов к /api/dashboard
- [ ] Время ответа /api/dashboard (< 500 мс)

---

## 12. Итог

v2 — это **переосмысление** панели с нуля, а не патч v1:

1. **4 вкладки вместо 5** — bottom tab bar для мобильных
2. **1 endpoint вместо 5** — единый `/api/dashboard`
3. **Единый hook вместо 2** — `useDashboard`
4. **Graceful degradation** — null не ломает UI
5. **Mobile-first** — 360px tested
6. **Цветовая система** — статус через цвет + иконку + текст

**Приоритет разработки:** Phase 1 → Phase 2 → Phase 3

**Ожидаемый результат:** Панель, которую Денис может открыть со смартфона за 2 секунды и сразу понять: «всё работает» или «надо что-то делать».

---

*Документ создан 2026-05-14. Обсудить с Денисом перед началом разработки.*