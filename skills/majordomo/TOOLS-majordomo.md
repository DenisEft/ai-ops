# MajordomoSL — Умный дом

**IP:** 192.168.0.111 (HTTP 80, WS 8001)
**SSH:** 192.168.0.111:22 (user: den)
**Тип:** PHP/Apache MajordomoSL
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
- Управление: `GET /objects/?method=Relay0X.{switch|on|off}`
- Статус: `GET /ajax/devices.html?op=get_device&id=<ID>`
- ⚠️ API возвращает HTML, не JSON

### Готовые команды (curl)

```bash
# Реле 01 (Кухня)
curl -s "http://192.168.0.111/objects/?method=Relay01.switch"
curl -s "http://192.168.0.111/objects/?method=Relay01.on"
curl -s "http://192.168.0.111/objects/?method=Relay01.off"

# Реле 02 (Диана)
curl -s "http://192.168.0.111/objects/?method=Relay02.switch"
curl -s "http://192.168.0.111/objects/?method=Relay02.on"
curl -s "http://192.168.0.111/objects/?method=Relay02.off"

# Реле 03 (Кухня)
curl -s "http://192.168.0.111/objects/?method=Relay03.switch"
curl -s "http://192.168.0.111/objects/?method=Relay03.on"
curl -s "http://192.168.0.111/objects/?method=Relay03.off"

# Реле 04 (Коридор)
curl -s "http://192.168.0.111/objects/?method=Relay04.switch"
curl -s "http://192.168.0.111/objects/?method=Relay04.on"
curl -s "http://192.168.0.111/objects/?method=Relay04.off"

# Реле 05 (Диана)
curl -s "http://192.168.0.111/objects/?method=Relay05.switch"
curl -s "http://192.168.0.111/objects/?method=Relay05.on"
curl -s "http://192.168.0.111/objects/?method=Relay05.off"

# Все выключить
curl -s "http://192.168.0.111/objects/?method=Relay01.off" -s "http://192.168.0.111/objects/?method=Relay02.off" -s "http://192.168.0.111/objects/?method=Relay03.off" -s "http://192.168.0.111/objects/?method=Relay04.off" -s "http://192.168.0.111/objects/?method=Relay05.off"

# Все включить
curl -s "http://192.168.0.111/objects/?method=Relay01.on" -s "http://192.168.0.111/objects/?method=Relay02.on" -s "http://192.168.0.111/objects/?method=Relay03.on" -s "http://192.168.0.111/objects/?method=Relay04.on" -s "http://192.168.0.111/objects/?method=Relay05.on"

# Статус всех
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=6"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=7"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=1"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=5"
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=4"
```
