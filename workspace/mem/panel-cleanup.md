# llama-panel — Audit & Cleanup Log

_Обновлено: 2026-05-13 23:00 UTC_

## Текущая архитектура (после коммита 6059550)

### Вкладки App.jsx (8 штук → 9 штук)
| # | Вкладка | Компонент | Описание |
|---|---------|-----------|----------|
| 1 | 📊 Метрики | Dashboard.jsx | Чистый overview: OpenClaw, Llama Server, Llama Panel, CPU/RAM/GU, LLM |
| 2 | 🐾 OpenClaw | inline (App.jsx) | Gateway, Sessions, Resources, Start/Stop/Restart |
| 3 | 📈 Статистика | Stats.jsx | Статистика за период |
| 4 | 🛠 Управление | inline | Управление сервисами (llama-8080, llama-panel) |
| 5 | ⚙️ Конфиг | inline | Редактирование конфига llama-8080 |
| 6 | 🔍 AI Процессы | ProcessMonitor.jsx | AI Process Intelligence (аномалии, обнаружение, restart) |
| 7 | 💾 Бэкапы | BackupManager.jsx | Config backups |
| 8 | 📋 Аудит | AuditLog.jsx | Audit trail |
| 9 | 📄 Логи | inline | Логи сервисов |

### Файлы frontend/src/components/
| Файл | Статус |
|------|--------|
| Dashboard.jsx | ✅ Переписан — убраны вложенные табы |
| Stats.jsx | ✅ Активен |
| ProcessMonitor.jsx | ✅ Очищен — убраны дублирующие метрики |
| BackupManager.jsx | ✅ Активен |
| AuditLog.jsx | ✅ Активен |
| GaugeWidget.jsx | ✅ Активен |
| Header.jsx | ✅ Активен |
| ErrorBoundary.jsx | ✅ Активен |
| ~~MetricsManager.jsx~~ | ❌ УДАЛЁН (мёртвый код, не рендерился) |
| ~~ChartWidget.jsx~~ | ❌ УДАЛЁН (мёртвый код, не импортировался) |
| ~~WidgetSettings.jsx~~ | ❌ УДАЛЁН (мёртвый код, не импортировался) |

---

## Что сделано (2026-05-13)

### ✅ Шаг 1: Удалён мёртвый код
- Удалён `MetricsManager.jsx` (~19KB) — импортировался в App.jsx, но нигде не рендерился
- Удалён `ChartWidget.jsx` (~9KB) — создан, но не импортирован нигде
- Удалён `WidgetSettings.jsx` — не импортировался нигде

### ✅ Шаг 2: Переработан Dashboard.jsx
- **Убраны вложенные табы** (были: Overview, OpenClaw, Llama, GPU)
- Теперь один чистый overview:
  - 3 карточки сервисов: OpenClaw, Llama Server, Llama Panel
  - 4 gauge-виджета: CPU, RAM, GPU Temp, GPU Load
  - LLM metrics: tokens/sec, decoded, promoted, context
- Статус-бар вверху: WS status, llama status, OpenClaw status

### ✅ Шаг 3: Очищен ProcessMonitor.jsx
- **Убраны дублирующие метрики** (GPU temp/VRAM, CPU Load, RAM, LLM metrics) — теперь они только в Dashboard
- Оставлена только AI-специфика:
  - Аномалии (критические/предупреждения)
  - Обнаруженные AI-процессы со статусом
  - Кнопка restart для stopped процессов
  - История алертов
- Кнопка переименована: "▶ Мониторинг" → "▶ Авто-обновление 10с"

### ✅ Шаг 4: Добавлена вкладка OpenClaw
- OpenClaw вынесен из вложенных табов Dashboard в отдельную вкладку "🐾 OpenClaw"
- Содержит:
  - Gateway info (model, sessions, version, port, healthy)
  - Start/Stop/Restart кнопки
  - Resources (RAM total/used/free, CPU cores)
  - Sessions list
- Данные загружаются через `authFetch` при открытии вкладки

### Итог
- Вкладок: 8 → 9 (добавилась OpenClaw, убраны вложенные табы из Dashboard)
- Файлов удалено: 3 (28KB мёртвого кода)
- Дублирование метрик устранено
- UI стал плоским и понятным

---

## План дальнейшей работы

### TODO
- [ ] `npm test` — проверить тесты
- [ ] `npm run build` — проверить сборку
- [ ] Рассмотреть объединение вкладок "Управление" и "Конфиг" — если мало используются отдельно
- [ ] Stats.jsx — проверить, нужен ли или дублируется
- [ ] Backend: проверить, нужны ли все 8 routes

---

_Документация ведётся по запросу Дениса: "контекст сбрасывается, документируй"_
