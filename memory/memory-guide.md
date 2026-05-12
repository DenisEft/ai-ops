# Memory Guide — Память Лоры

## 📅 Daily Memory (`memory/YYYY-MM-DD.md`)

**Один файл на день**, пополняется в течение дня:

```
# YYYY-MM-DD — Day

## 📌 Ключевые события
- ...

## ⚡ Решения и действия
- ...

## 🐛 Проблемы
- ...

## 📋 Задачи на завтра
- ...

## 💡 Контекст / заметки
- [10:30] [краткое описание]
```

**Правила:**
- Не создавай отдельные файлы с таймстампами — один файл = один день
- Перед закрытием сессии добавь итог в секцию «Ключевые события»
- При загрузке новой сессии — прочитай только последние 2-3 daily-файла
- Старые daily-файлы > 7 дней — пересмотри на предмет переноса в MEMORY.md

### 🛡 Memory State Guard

**`memory/state.json`** — три поля:
- `lastDailyWritten` — дата последнего daily-файла (YYYY-MM-DD)
- `lastMemoryMaintenance` — дата последней чистки MEMORY.md
- `lastCommit` — хеш последнего коммита

**Правила:**
1. При запуске сессии — читай `state.json`. Если `lastDailyWritten != сегодня` → создай daily-файл
2. При каждом взаимодействии — добавь одну строку в daily
3. Перед закрытием сессии — обнови `state.json` и закоммить
4. Heartbeat проверяет `state.json` → если не сегодня → допиши и закоммить

### 📝 Write It Down

- Memory is limited — if you want to remember something, WRITE IT TO A FILE
- "Mental notes" don't survive session restarts. Files do.
- When you learn a lesson → update AGENTS.md, TOOLS.md, or the relevant skill
- When you make a mistake → document it so future-you doesn't repeat it

### 🧠 MEMORY.md

- **ONLY load in main session** (direct chats with your human)
- **DO NOT load in shared contexts** (group chats, sessions with other people)
- This is for **security** — contains personal context that shouldn't leak
- Write significant events, thoughts, decisions, opinions, lessons learned
- Periodically review daily files and update MEMORY.md with what's worth keeping
