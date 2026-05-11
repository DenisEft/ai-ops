# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

### 🔐 Секреты

Все пароли хранятся в `pass` (GPG-хранилище):

```bash
pass show sudo-password         # sudo
pass show yandex-app-password   # email app password
pass show yandex-login          # den.eftimitsa@yandex.ru
pass show webdav-password       # yandex disk
pass show openclaw-gateway-token
pass show telegram-bot-token
```

**GPG ключ:** `B4E6D7FBA487E1B3` (Denis (pass) <den@lora>)

> ⚠️ В самом TOOLS.md секреты НЕ пишу. Если нужны — читаю из pass.

---

### Email

- Provider: Yandex
- Address: `pass show yandex-login`
- App Password: `pass show yandex-app-password`

### WebDAV (Yandex Disk)

- URL: https://webdav.yandex.ru
- Login: `pass show yandex-login`
- Password: `pass show webdav-password`

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

### MajordomoSL (Умный дом)

- **IP:** 192.168.0.111
- **Port:** 80 (HTTP), 8001 (WebSocket)
- **SSH:** 192.168.0.111:22 (user: den, password: не нужен)
- **Тип:** PHP/Apache система умного дома (MajordomoSL)
- **Доступ:** нет пароля от admin, но API открыт

**Устройства (реле):**
| ID | Реле | Устройство | Статус |
|----|------|-----------|--------|
| 6 | Relay04 | Свет в коридоре | on |
| 7 | Relay06 | Подсветка кухни | on |
| 1 | Relay01 | Свет кухня | off |
| 5 | Relay03 | Свет в гостинной | off |
| 4 | Relay02 | Свет у Дианы | on |

**API Majordomo:**
- Переключить реле: `GET /objects/?method=Relay0X.switch` (toggle)
- Включить: `GET /objects/?method=Relay0X.on` (если есть)
- Выключить: `GET /objects/?method=Relay0X.off` (если есть)
- Проверить статус: `GET /ajax/devices.html?op=get_device&id=<ID>`
  → возвращает JSON с HTML, проверяй `on`/`off` в классе
- Все устройства: `GET /ajax/devices.html?op=get_device&id=ALL`

**Готовые команды (curl):**

```bash
# Коридор (Relay01)
curl -s "http://192.168.0.111/objects/?method=Relay01.switch"
curl -s "http://192.168.0.111/objects/?method=Relay01.on"
curl -s "http://192.168.0.111/objects/?method=Relay01.off"

# Кухня подсветка (Relay02)
curl -s "http://192.168.0.111/objects/?method=Relay02.switch"
curl -s "http://192.168.0.111/objects/?method=Relay02.on"
curl -s "http://192.168.0.111/objects/?method=Relay02.off"

# Кухня свет (Relay03)
curl -s "http://192.168.0.111/objects/?method=Relay03.switch"
curl -s "http://192.168.0.111/objects/?method=Relay03.on"
curl -s "http://192.168.0.111/objects/?method=Relay03.off"

# Гостиная (Relay04)
curl -s "http://192.168.0.111/objects/?method=Relay04.switch"
curl -s "http://192.168.0.111/objects/?method=Relay04.on"
curl -s "http://192.168.0.111/objects/?method=Relay04.off"

# Диана (Relay05)
curl -s "http://192.168.0.111/objects/?method=Relay05.switch"
curl -s "http://192.168.0.111/objects/?method=Relay05.on"
curl -s "http://192.168.0.111/objects/?method=Relay05.off"
```

**Все сразу:**

```bash
# Выключить весь свет
curl -s "http://192.168.0.111/objects/?method=Relay01.off" \
     -s "http://192.168.0.111/objects/?method=Relay02.off" \
     -s "http://192.168.0.111/objects/?method=Relay03.off" \
     -s "http://192.168.0.111/objects/?method=Relay04.off" \
     -s "http://192.168.0.111/objects/?method=Relay05.off"

# Включить весь свет
curl -s "http://192.168.0.111/objects/?method=Relay01.on" \
     -s "http://192.168.0.111/objects/?method=Relay02.on" \
     -s "http://192.168.0.111/objects/?method=Relay03.on" \
     -s "http://192.168.0.111/objects/?method=Relay04.on" \
     -s "http://192.168.0.111/objects/?method=Relay05.on"

# Получить статус всех устройств
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=6"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=7"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=1"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=5"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=4"
```

## Related

- [Agent workspace](/concepts/agent-workspace)
