# MEMORY.md — Долгосрочная память Лоры

_Последнее обновление: 2026-05-11_

---

## 👤 Денис

- Telegram: @cyberden8
- Часовой пояс: Asia/Vladivostok (UTC+10), Находка
- IT-начальник отдела, логистический бизнес
- Хобби: музыка 🎵

---

## 🖥 Сервер

- Ubuntu 24.04 LTS, AMD
- CPU: Ryzen 5 5600XT (12 cores), RAM: 32 GB
- GPU: RTX 3090 (24 GB VRAM)
- Сеть: enp3s0 (192.168.0.181)
- sudo password: см. TOOLS.md (критично — менять!)

### Модель LLM
- Qwen3.6-35B-A3B IQ4_NL_XL (~159 t/s), `--reasoning off`

---

## 🏠 Умный дом — MajordomoSL

**IP:** 192.168.0.111 (HTTP 80, WS 8001)
**Сессия:** `prj=tgrsnd3bmjhco9vub3g6a8epoi`

### Реле (свет)
| ID | Реле | Комната |
|----|------|---------|
| 6 | Relay04 | Коридор |
| 7 | Relay06 | Кухня подсветка |
| 1 | Relay01 | Кухня |
| 5 | Relay03 | Гостиная |
| 4 | Relay02 | Детская (Диана) |

### API
- Управление: `POST /objects/?method=RelayXX.SWITCH` (с cookies)
- Статус: `GET /ajax/devices.html?op=get_device&id=<ID>`
- ⚠️ API возвращает HTML, не JSON

### Сценарии (в планах)
- «Доброе утро» — включить свет / «Спокойной ночи» — выключить
- Cron-уведомления о забытом свете

---

## 📊 llama-panel

**Бэкенд:** :8080, **Фронтенд:** :8081, **llama-server:** :8080
**Пути:** `~/.openclaw/workspace/llama-panel/{backend,frontend}/`
**Сервисы:** `llama-8080.service`, `llama-panel.service`
**Важно:** llama-server нужен `--metrics` для дашборда

---

## 🌐 Сеть

### Роутер: D-Link DIR-842 (MTS)
- LAN: 192.168.0.1/24, WAN: 100.66.46.97 (carrier-NAT)
- IPv6: fd01::1/64 (ULA), WiFi: `MTSRouter-04B461` / `MTSRouter-5G-04B461`
- Проброс: TCP 6677 → 192.168.0.17:2222
- ⚠️ Нет статического IP, нет глобального IPv6

### Фаервол (план)
- USB Ethernet адаптер (RTL8153) для второго порта
- Схема: Интернет → [Lora WAN] → nftables → [Lora LAN] → D-Link

---

## 📧 Email

- Yandex: den.eftimitsa@yandex.ru (App Password: см. TOOLS.md)

---

## 🌐 Telegram Bot

- Worker: `https://twilight-sound-6bfb.den-eftimitsa.workers.dev`
- Бот `@botNHKbot` активен ✅

---

## 🔑 Уроки

### Контекст
- MEMORY.md большой → инжектит 10-15k токенов до разговора
- Keep it short! Пересматривай и чисти раз в неделю
- HEARTBEAT.md пустой — нет задач для периодической проверки

### Gateway restart
- Прерывает tool/model операции, зацикливание ассистента
- После рестарта проверяй контекст

### llama-server
- Нужен `--metrics` для метрик, иначе 501

---

## 🎯 Задачи

### Высокий приоритет
- [ ] Фаервол: купить адаптер и настроить nftables
- [ ] Сменить sudo пароль (был в Telegram)

### Средний
- [ ] Умный дом: сценарии "Доброе утро / Спокойной ночи"
- [ ] Умный дом: cron-уведомления о забытом свете
- [ ] llama-panel: стабилизация

### Низкий
- [ ] Connect-сервер, MQTT датчики, погода для умного дома
