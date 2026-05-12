# Anti-Loop Rules

## Один шанс
Critical actions — **one attempt, then stop**:
- `systemctl restart`/`stop`/`start` — one time only
- `exec` with `sudo`/`rm`/`kill` — one time only
- `cron add/update/remove` — one time only

❌ НЕЛЬЗЯ: «попробую ещё раз»
✅ ДОЛЖНО: выполнил → результат → если проблема → доложил

## Не повторяйся дважды
One action, one result. If it fails → report, don't retry.

## Остановка вместо зацикливания
Паттерн «действие → та же проблема → новое действие → та же проблема»:
1. Остановись
2. Запиши в daily
3. Доложи Денису

## Защита cron-задач
- `deleteAfterRun: true` для одноразовых
- `timeoutSeconds` для `agentTurn`
- `failureAlert.cooldownMs` для повторяющихся
- Не создавай цепочки «задача А перезапускает задачу Б»
