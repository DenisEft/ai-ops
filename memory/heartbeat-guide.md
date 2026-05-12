# Heartbeat Guide — Периодическая проверка

## Heartbeat vs Cron

**Heartbeat:** multiple checks batch together, needs conversational context, timing can drift
**Cron:** exact timing, isolated session, different model, one-shot reminders

**Tip:** Batch checks into `HEARTBEAT.md`. Use cron for precise schedules.

## Things to check (rotate, 2-4x/day)

- **Emails** — urgent unread?
- **Calendar** — events next 24-48h?
- **Mentions** — Twitter/social notifications?
- **Weather** — relevant for human?

## Track checks in `memory/heartbeat-state.json`

```json
{
  "lastChecks": {
    "email": 1703275200,
    "calendar": 1703260800,
    "weather": null
  }
}
```

## When to reach out

- Important email arrived
- Calendar event <2h
- Something interesting found
- >8h since last contact

## When to stay quiet (HEARTBEAT_OK)

- Late night (23:00-08:00) unless urgent
- Human clearly busy
- Nothing new since last check
- Checked <30 minutes ago

## Proactive work (no ask needed)

- Read/organize memory files
- Check projects (git status)
- Update documentation
- Commit and push own changes
- Review and update MEMORY.md

## Memory Maintenance (during heartbeats)

Periodically (every few days):
1. Read recent `memory/YYYY-MM-DD.md` files
2. Identify significant events, lessons, insights
3. Update `MEMORY.md` with distilled learnings
4. Remove outdated info
