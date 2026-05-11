---
name: majordomo
description: >
  Управление российским умным домом MajordomoSL (MajorDoMo). Используйте когда пользователь просит:
  включить/выключить свет, управление розетками, реле, климат-контролем, сценами, таймерами,
  или спрашивает про статус устройств. Поддерживает: освещение, реле, датчики, плееры, термостаты.
  Триггеры: свет, выключить, включить, реле, умный дом, Majordomo, устройство, розетка.
---

# MajordomoSL — Управление умным домом

## Сервер

- **IP:** 192.168.0.111
- **HTTP:** 80
- **WebSocket:** 8001

## API

### Переключение устройств

```bash
# Toggle (вкл/выкл)
curl -s "http://192.168.0.111/objects/?method=<RelayID>.switch"

# Включить
curl -s "http://192.168.0.111/objects/?method=<RelayID>.on"

# Выключить
curl -s "http://192.168.0.111/objects/?method=<RelayID>.off"
```

### Статус устройств

```bash
# Получить HTML устройства в формате JSON
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=<DEVICE_ID>"
```

**Статус:** проверяй наличие `class="device-icon on` (вкл) или `off` (выкл) в JSON-поле HTML.

### Получение всех устройств

```bash
curl -s "http://192.168.0.111/objects/?method=objects.getAll"
```

## Управление устройствами

### Выключатель света (реле)

```bash
# Переключить реле (toggle)
curl -s "http://192.168.0.111/objects/?method=Relay03.switch"

# Принудительно выключить
curl -s "http://192.168.0.111/objects/?method=Relay03.off"

# Принудительно включить
curl -s "http://192.168.0.111/objects/?method=Relay03.on"
```

### Сценарии

```bash
# Запустить сценарий
curl -s "http://192.168.0.111/objects/?script=<название_сценария>"
```

### Терминалы и плееры

```bash
# Управление плеером (terminal ID)
curl -s "http://192.168.0.111/objects/?method=Player.<action>"
# actions: play, pause, stop, next, previous, setvolume
```

## Методы работы

### 1. Включение/выключение света

```bash
# Выключить свет в гостиной
curl -s "http://192.168.0.111/objects/?method=Relay04.off"

# Включить
curl -s "http://192.168.0.111/objects/?method=Relay04.on"

# Переключить (toggle)
curl -s "http://192.168.0.111/objects/?method=Relay04.switch"
```

### 2. Проверка статуса

```bash
# Получить статус устройства по ID
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=4" | python3 -c "
import sys, json
d = json.load(sys.stdin)
html = d.get('HTML', '')
print('on' if 'device-icon on' in html else 'off')
"
```

### 3. Сцена «Всё выключено»

```bash
for relay in Relay01 Relay02 Relay03 Relay04 Relay05; do
  curl -s "http://192.168.0.111/objects/?method=$relay.off"
done
```

### 4. Поиск реле по названию

Если не знаешь ID реле, но знаешь название — ищи в `/admin.php?action=devices&type=relay`:

```bash
curl -s "http://192.168.0.111/admin.php?action=devices&type=relay" | grep -oE 'device-[0-9]+"|device-header[^<]*'
```

## Важные нюансы

- **Метод `.switch`** — toggle (переключает в противоположное состояние)
- **Методы `.on`/`.off`** — если поддерживаются реле (зависит от класса)
- **WebSocket порт 8001** — Majordomo использует его для real-time обновлений, но API через HTTP работает без подключения
- **Нет аутентификации** — API открыт, любые команды принимаются
- **Задержки** — давай 1-2 сек после команды перед чтением статуса

## Типовые команды Majordomo

```bash
# Получить список всех объектов
curl -s "http://192.168.0.111/objects/?method=objects.getAll"

# Получить параметры объекта
curl -s "http://192.168.0.111/objects/?method=Relay03.getProperties"

# Установить параметр
curl -s "http://192.168.0.111/objects/?method=Relay03.setProperty&param=status&value=0"

# Запустить сценарий
curl -s "http://192.168.0.111/objects/?script=МояСцена"

# Выполнить действие (action)
curl -s "http://192.168.0.111/objects/?method=<Object>.<Action>"
```

## Поддержка термостатов и датчиков

```bash
# Получить значение датчика
curl -s "http://192.168.0.111/objects/?method=TemperatureSensor.getProperty&param=current_value"

# Установить температуру термостата
curl -s "http://192.168.0.111/objects/?method=Thermostat01.setProperty&param=setpoint&value=23"
```

## Словарь устройств (если известен)

| Устройство | Реле | ID | Статус |
|-----------|------|-----|--------|
| Свет в коридоре | Relay01 | 6 | - |
| Подсветка кухни | Relay02 | 7 | - |
| Свет кухня | Relay03 | 1 | - |
| Свет в гостинной | Relay04 | 5 | - |
| Свет у Дианы | Relay05 | 4 | - |

> ⚠️ ID устройств и соответствия Relay могут отличаться — проверяй через `get_device` endpoint.

## Примеры

### Выключить весь свет

```bash
for relay in Relay01 Relay02 Relay03 Relay04 Relay05; do
  curl -s "http://192.168.0.111/objects/?method=$relay.off" &
done
wait
```

### Включить свет в гостиной и проверить

```bash
# Включить
curl -s "http://192.168.0.111/objects/?method=Relay04.on"
sleep 2
# Проверить
curl -s "http://192.168.0.111/ajax/devices.html?op=get_device&id=5" | python3 -c "
import sys, json
d = json.load(sys.stdin)
on = 'device-icon on' in d.get('HTML', '')
print('✅ Включён' if on else '❌ Не включился')
"
```

### Установить яркость (если поддерживается)

```bash
# Проверить параметры реле
curl -s "http://192.168.0.111/objects/?method=Relay04.getProperties"
```
