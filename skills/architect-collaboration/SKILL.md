---
name: architect-collaboration
description: Guidelines for collaborating with the architect subagent. Use when delegating tasks to the architect agent, when architect tasks fail or produce incomplete results, or when deciding whether to use the architect for a given task. Covers task decomposition, context management, and fallback strategies.
---

# Architect Collaboration

Rules for working with the architect subagent based on real experience.

## Core Principle

The architect is a **specialist for ideas**, not for depth. It shares the same context window as you — when it reads too many files, the context overflows and the result is truncated mid-stream.

## When to Use the Architect

- **Brainstorming** — «как лучше организовать X», «какие проблемы могут быть»
- **Quick review** — 1-2 файла, конкретный вопрос
- **Comparison** — «библиотека X или Y для чего лучше»
- **Architecture sketch** — наметить структуру, не проверять каждую строку
- **Parallel tasks** — несколько независимых проверок одновременно

## When NOT to Use the Architect

- **Deep code review** — больше 5 файлов, требуется внимание к деталям
- **Full project analysis** — README + все файлы проекта
- **Debugging** — нужно читать стек трейсы, логи, несколько файлов
- **Writing documentation** — манифесты, полные спецификации
- **Any task requiring reading 10+ files**

## Context Overflow Pattern

**Symptom:** Result starts with reading files, then cuts off mid-sentence, or outputs code fragments instead of analysis.

**Root cause:** Architect reads files into context → context exceeds limit → result is truncated.

**Solution:** Limit the task to files that fit in ~20k tokens. Roughly:
- 1-3 files → architect is fine
- 4-7 files → architect might work if files are small
- 8+ files → read yourself

## Task Decomposition

When a task requires reading many files, split it:

```
❌ "Проведи ревью всего проекта llama-panel"
✅ "Проверь backend/src/services/config.js на проблемы с валидацией"
✅ "Проверь Dockerfile на корректность сборки"
```

After multiple architect tasks, synthesize results yourself.

## Fallback Strategy

When architect task fails (incomplete result):

1. **Don't retry the same task** — it will fail again
2. **Read the relevant files yourself** — you have the same context, just don't share it
3. **Use architect for validation** — give it your findings and ask to confirm/check for misses
4. **Document what worked** — in DECISIONS.md

## Example Workflow

```
1. You receive task: "check project X"
2. Quick scan: how many files? If > 5 → read yourself
3. If ≤ 5 → delegate to architect with specific focus
4. If architect fails → read files yourself, use architect for spot-checks
5. Synthesize, fix, commit
```

## Common Failure Modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Result is code, not analysis | Context overflow during read | Reduce files |
| Result cuts off mid-sentence | Context overflow at end | Reduce files or split task |
| Generic conclusions | Didn't read enough code | Give specific files |
| Misses critical bugs | Only read README | List specific files to check |

## Anti-Patterns

- **Don't** ask architect to "read everything and summarize" — guaranteed overflow
- **Don't** retry a failed architect task with the same prompt — it will fail again
- **Don't** trust architect's "all good" if it read fewer files than promised
- **Don't** let architect read files you haven't verified — garbage in, garbage out

## When Architect Succeeds

Document successful patterns. If architect nailed a task, note it — this pattern can be reused.
