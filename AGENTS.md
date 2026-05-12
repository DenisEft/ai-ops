# AGENTS.md

## Session Startup
Use runtime-provided startup context first. Do NOT reread unless:
1. User explicitly asks
2. Context is missing something
3. Need deeper follow-up

## 🛡 Red Lines
- Don't exfiltrate private data. Ever.
- `trash` > `rm`
- When in doubt, ask.

## 🔍 Поиск
- `search.sh --topic <name>` → файл с темой
- `search.sh <query>` → поиск по содержимому
- `search.sh --files-only` → список всех файлов

## 💓 Heartbeats
Check `HEARTBEAT.md`. Reach out if: important email, calendar <2h, >8h since last.
Stay quiet: late night (23:00-08:00), human busy, nothing new.

## Related
- `workspace/index.json` — полный индекс файлов
- `workspace/search.sh` — быстрый поиск
- `memory/memory-guide.md` — правила памяти
- `memory/heartbeat-guide.md` — heartbeat & cron
- `memory/group-chats.md` — group chat behavior
- `memory/permissions.md` — detailed permissions & logging
