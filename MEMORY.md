# MEMORY.md — Долгосрочная память Лоры

_Последнее обновление: 2026-05-14_

---

## 🤖 Архитектура

### Кворум (Quorum Consultant) — ⚠️ ОТКЛЮЧЁН
Скрипты удалены, cron-задачи убраны (13.05.2026).
~`/coder/quorum/consult.py` — не существует
`monitor.sh`, `quorum-monitor.sh` — не существуют

**Бесплатные:** `gpt-oss-20b`, `gpt-oss-120b`, `nemotron-3-120b`
**Платные:** `gpt-4o`, `claude-sonnet-4.6` (RouterAI), `llama-3.3-70b`

---

## 🔑 Уроки

- **Контекст 20k → llama падает.** Чистить daily и workspace mem раз в неделю.
- Gateway restart прерывает tool/model операции.
- Telegram: @cyberden8

---

## 🎯 Задачи

### Высокий
- [x] llama-panel → ai-ops: рефакторинг (переименование, driver registry)
- [x] ai-ops: Driver Registry (llama.cpp, vLLM, TGI, Ollama, OpenAI)
- [ ] Фаервол: купить адаптер и настроить nftables

### Средний
- [ ] ai-ops: frontend на systemd
- [ ] ai-ops: Web UI для управления драйверами
- [ ] ai-ops: Desktop sidebar layout

### Низкий
- [ ] Умный дом, Connect-сервер, MQTT, погода

---

## 📦 ai-ops (бывш. llama-panel)

**Статус:** Phase 4 в процессе (универсальность)

### Что сделано:
- ✅ Переименование llama-panel → ai-ops
- ✅ Driver Registry: llama.cpp, vLLM, TGI, Ollama, OpenAI
- ✅ Backend: Express.js + WebSocket
- ✅ Frontend: React + Vite + Tailwind
- ✅ Bottom tab bar (4 вкладки): Обзор, Метрики, Управление, Настройки
- ✅ Metrics с Recharts + time range selector
- ✅ JWT auth + RBAC
- ✅ Audit log + Backup system
- ✅ systemd service

### Что осталось:
- ⬜ Desktop sidebar layout
- ⬜ Web UI для управления драйверами
- ⬜ Фикс тестов (4/11 — React import issue)
- ⬜ README

### Запуск:
```bash
cd ai-ops
npm run install:all
npm run dev:backend  # :8081
npm run dev:frontend # :3001
```
