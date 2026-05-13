# Architect Task Patterns

## Good Prompt Templates

### Quick file check
```
Проверь файл {path} на:
1. Баги и ошибки
2. Проблемы безопасности
3. Нарушения паттернов проекта

Отвечай конкретно, с ссылками на строки кода.
```

### Architecture comparison
```
Сравни {optionA} и {optionB} для:
- {use_case}
- {constraint_1}
- {constraint_2}

Дай рекомендацию с аргументами.
```

### Brainstorming
```
Придумай {N} вариантов решения для:
{problem_description}

Для каждого варианта: +, -, когда подходит.
```

### Spot-check validation
```
Я нашёл проблему: {your_finding} в {file}:{line}.

Проверь:
1. Подтверждаешь?
2. Есть ли такая же проблема в {other_file}?
3. Не упустил что-то важное рядом?
```

## Bad Prompt Templates

### ❌ Too broad
```
Проведи ревью всего проекта
```

### ❌ Too many files
```
Прочитай все файлы в директории и найди проблемы
```

### ❌ No focus
```
Что думаешь об этом коде?
```

## Context Budget Estimator

Rough token estimates per file:
- Small file (<50 строк) ~ 200 tokens
- Medium file (50-200 строк) ~ 800 tokens
- Large file (200+ строк) ~ 2000 tokens

Context overhead per task: ~3000 tokens (instructions, formatting)

**Safe limit:** ~20k tokens total

Safe file counts:
- Small files only: 6-8 файлов
- Medium files: 3-5 файлов
- Large files: 1-2 файла
- Mixed: 2-4 файла
