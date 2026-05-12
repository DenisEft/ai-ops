# TASK: Рефакторинг llama-panel

## Кворум-анализ: OK (3 бесплатные модели, консенсус)

## Критические проблемы
1. Судо-пароль хардкод в `stats.js` и `llama.js` → env var
2. Порт 80 закрыт → убрать из мониторинга
3. JWT-секрет из users.json → env var

## Баги
1. 5/6 тестов падают (нет auth в тестах)
2. EADDRINUSE port 8081 (сервис уже запущен)
3. Дубли GPU-кода

## Задачи

### 1. Убрать хардкод пароля
- `stats.js` и `llama.js` → `process.env.SUDO_PASSWORD`
- `.env.example` добавить переменные
- `.env` в `.gitignore`

### 2. Auth для тестов
- middleware test mode для vitest
- `vitest.config.js` → `NODE_ENV=test`
- Тесты должны проходить без токена

### 3. Убрать дубли GPU-кода
- Один источник — `system.js` (более полный)
- `llama.js` убрать свой `getGpuMetrics`

### 4. Rate limiting
- `express-rate-limit`
- 100 req/min для auth, 200 для остального

### 5. JWT-секрет → env var
- `process.env.JWT_SECRET` fallback
- Обновить `.env.example`

### 6. Фронтенд-тесты
- Vitest + Testing Library
- Login компонент, Dashboard, Error boundary

## Ограничения
- НЕ трогать production (порт 8081/8081)
- НЕ менять API-контракт (совместимость)
- НЕ удалять существующие данные пользователей

## Формат отчёта
```markdown
## Задача: Рефакторинг llama-panel

### Что сделано
- [x] Убран хардкод пароля
- ...

### Файлы изменены
- ...

### Тесты
- ✅ passed / ❌ failed

### Заметки
- ...
```
