# MEMORY.md — Долгосрочная память Лоры

_Последнее обновление: 2026-05-10_

---

## 👤 Денис

- Telegram: @cyberden8
- Часовой пояс: Asia/Vladovostok (UTC+10), Находка
- IT-начальник отдела, логистический бизнес
- Хобби: музыка 🎵

---

## 🖥 Сервер

- Ubuntu 24.04 LTS, AMD
- CPU: Ryzen 5 5600XT (12 cores)
- GPU: RTX 3090 (24 GB VRAM)
- RAM: 32 GB
- Сеть: один порт enp3s0 (192.168.0.181)
- sudo password: `XjiQmPeadrq888`

### Модель LLM
- Активна: Qwen3.6-35B-A3B IQ4_NL_XL (~159 t/s)
- Q6 не использован — 2-3x замедление за 10% качества

---

## 🏠 Умный дом — MajordomoSL

**IP:** 192.168.0.111 (порт 80 HTTP, 8001 WebSocket)
**Авторизация:** через cookies, нет пароля от admin
**Сессия:** `prj=tgrsnd3bmjhco9vub3g6a8epoi`

### Реле (свет)
| ID | Реле | Комната | Статус |
|----|------|---------|--------|
| 6 | Relay04 | Коридор | |
| 7 | Relay06 | Кухня подсветка | |
| 1 | Relay01 | Кухня | |
| 5 | Relay03 | Гостиная | |
| 4 | Relay02 | Детская (Диана) | |

### API
- Управление: `POST /objects/?method=RelayXX.SWITCH` (с cookies)
- Статус: `GET /ajax/devices.html?op=get_device&id=<ID>`
- WebSocket: `ws://192.168.0.111:8001/majordomo`
- ⚠️ API возвращает HTML, не JSON

### Сценарии (запланированы, не реализованы)
- «Доброе утро» — включить свет
- «Спокойной ночи» — выключить свет
- Cron-расписание, уведомления о забытом свете

### Модули системы
- MegaD (контроллер), MQTT (есть, но не настроен)
- GPS-трекер, медиа-плеер, сцены, шаблоны поведения
- ⚠️ Connect-сервер не подключён, systeminfo не найден

---

## 📊 llama-panel

Панель мониторинга для llama-server с живым дашбордом.

### Архитектура
- **Бэкенд:** порт 8080 (с `--metrics`)
- **Фронтенд:** порт 8081 (SPA + API proxy)
- **WebSocket:** live на :8081/ws
- **llama-server:** порт 8080, запускается с `--metrics`

### Пути
- Backend: `/home/den/.openclaw/workspace/llama-panel/backend/src/index.js`
- Frontend: `/home/den/.openclaw/workspace/llama-panel/frontend/src/`
- Сервисы: `llama-8080.service`, `llama-panel.service`

### Фичи
- Метрики CPU/RAM/GPU/диск в реальном времени
- Пользовательские метрики через UI (12 встроенных + кастомные)
- Методы сбора: command, nvidia-smi, systeminfo, prometheus, thermal, filesystem, procstat
- Графики (ChartCard), индикаторы (MetricCard), live-бейдж

### Известные баги (исправлены)
- CPU: NaN → fix: `isFinite` проверка в `n()` валидаторе
- GPU память: 0 → fix: парсинг `nvidia-smi --query-gpu=...`
- Диск: 16 KB → fix: поиск по `f.mount === '/'` вместо `f.fs === '/'`

### Известные проблемы
- Gateway restart → зацикливание ассистента (повторяющиеся сообщения)
- Vite dev-сервер нестабилен при переподключениях

---

## 🌐 Сеть и роутер

### Роутер: D-Link DIR-842 (MTS)
- LAN: 192.168.0.1/24
- WAN: 100.66.46.97 (carrier-NAT)
- IPv6: fd01::1/64 (ULA, не глобальный)
- WiFi: `MTSRouter-04B461` (2.4G) / `MTSRouter-5G-04B461` (5G)
- Проброс: TCP 6677 → 192.168.0.17:2222
- Порт LAN1: 10M-Half (подключён OpenClaw)
- ⚠️ Нет статического IP, нет глобального IPv6

### План фаервола
- Купить USB Ethernet адаптер (RTL8153) для второго порта
- Схема: Интернет → [Lora WAN] → nftables → [Lora LAN] → D-Link → устройства
- Варианты фаервола: nftables (рекомендую) / pfSense / OPNsense
- Мониторинг через Lora + уведомления в Telegram

---

## 📧 Email

- **Yandex:** den.eftimitsa@yandex.ru
- **IMAP:** imap.yandex.ru:993
- **App Password:** `gcmaepvsttghkwlx`
- INBOX: ~1189 сообщений (на момент 08.05)

---

## 📝 Уроки

### Gateway restart
- Прерывает активные tool/model операции
- Вызывает зацикливание ассистента (повторяющиеся ответы)
- После рестарта проверяй контекст — он может быть испорчен

### Контекст сессии
- Каждые несколько сообщений может быть сбой
- Дублирующиеся ответы — признак проблемы, не нормальное поведение
- При `assistant turn failed` — restart sentry сработает, но контекст мог быть потерян

### llama-server
- Для метрик обязательно нужен флаг `--metrics`
- `/metrics` без флага → 501

### MajordomoSL
- API возвращает HTML, не JSON — нужно парсить
- Управление через cookies — сессия может протухнуть

---

## 🎯 Актуальные задачи

### Высокий приоритет
- [ ] Фаервол: купить адаптер и настроить nftables
- [ ] llama-panel: стабилизация dev-сервера, fix `--metrics` endpoint

### Средний приоритет
- [ ] Умный дом: реализовать сценарии "Доброе утро / Спокойной ночи"
- [ ] Умный дом: cron-уведомления о забытом свете
- [ ] Email мониторинг: проверять почту периодически

### Низкий приоритет
- [ ] Подключить Connect-сервер к Majordomo
- [ ] Добавить MQTT датчики
- [ ] Интеграция с погодой для умного дома

---

## 🔑 Важно помнить

- `trash` > `rm` — всегда
- Один attempt на критические действия (restart, sudo, cron) → если не помоло, стоп и доложить
- Не повторяйся дважды в одной цепочке
- В group-чатах: качество > количество
- HEARTBEAT.md пустой — нет задач для периодической проверки

---

## 🌐 Telegram Bot API — resolved ✅

### Cloudflare Worker Proxy
- Worker URL: `https://twilight-sound-6bfb.den-eftimitsa.workers.dev`
- Код Worker: простой HTTPS-ретранслятор на api.telegram.org
- OpenClaw config: `apiRoot: "https://twilight-sound-6bfb.den-eftimitsa.workers.dev"`
- Работает! Telegram бот `@botNHKbot` активен.

### ⚠️ Security
- **sudo пароль был `XjiQmPeadrq888`** — написан в чат Telegram (сообщение #5683).
- **НЕОБХОДИМО СМЕНИТЬ ПАРОЛЬ!** Это критично.

### Mihomo (не использован)
- Скачан v1.19.24 в `~/.local/bin/mihomo`
- Не использован — Cloudflare Worker оказался проще и работает.
