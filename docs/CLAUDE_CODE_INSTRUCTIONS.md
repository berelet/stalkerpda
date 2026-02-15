# 🤖 Інструкція для нових сесій AI-асистента

**Ця інструкція для AI-асистента** — прочитай її повністю перед початком роботи.

---

## 🎯 Decision Framework

Перед будь-якою зміною запитай себе:

> **Чи робить це STALKER PDA кращим, надійнішим, або зручнішим для гравців та організаторів?**

Якщо відповідь "ні" — переглянь рішення.

---

## 📋 Алгоритм читання документації

### Крок 1: Базове розуміння проекту (ОБОВ'ЯЗКОВО)

```
1. README.md                        # Огляд системи, архітектура
2. AGENT_GUIDE.md                   # Детальна архітектура, деплой, статус
```

### Крок 2: Специфікації (за потребою)

```
3. specs/game-mechanics/FINAL-SPEC.md  # Ігрові механіки
4. specs/api/endpoints.md              # API ендпоінти
5. specs/database/schema.md            # Схема БД
6. specs/frontend/ui-spec.md           # UI/UX специфікація
```

### Крок 3: Workflow розробки (ОБОВ'ЯЗКОВО)

```
7. docs/needs/WORKFLOW.md              # Повний workflow (8 етапів, апрув-гейти)
8. docs/needs/README.md                # Структура документації
```

### Крок 4: Шаблони (для нових потреб)

```
docs/needs/templates/
  need-template.md      # README потреби
  spec-template.md      # Специфікація (10 розділів)
  api-template.md       # API контракти
  ui-template.md        # UI/UX дизайн
  errors-template.md    # Обробка помилок
  tasks-template.md     # Задачі
  tests-template.md     # Тест-кейси
  changelog-template.md # Історія змін
  quickfix-template.md  # Швидкі фікси
```

---

## 🎯 Сценарії роботи

### Сценарій A: Нова потреба

**Що читати:**
1. AGENT_GUIDE.md
2. docs/needs/WORKFLOW.md

**Що робити:**
1. Слідувати WORKFLOW.md (8 етапів)
2. Створити папку `docs/needs/NEED-XXX-назва/`
3. Заповнити всі документи

---

### Сценарій B: Робота з існуючою потребою

**Що читати:**
1. docs/needs/INDEX.md
2. docs/needs/NEED-XXX-назва/README.md
3. docs/needs/NEED-XXX-назва/spec.md

**Що робити:**
1. Зрозуміти поточний стан
2. Продовжити з потрібного етапу WORKFLOW

---

### Сценарій C: QUICKFIX (баг/дрібна зміна)

**Що читати:**
1. docs/needs/WORKFLOW.md (секція QUICKFIX)

**Що робити:**
1. Описати проблему та рішення
2. Запросити апрув
3. Виконати
4. Створити docs/needs/QUICKFIX-XXX-назва/README.md

---

### Сценарій D: Розуміння системи (onboarding)

**Що читати:**
1. README.md
2. AGENT_GUIDE.md
3. docs/needs/INDEX.md
4. docs/needs/GLOSSARY.md

---

## 📁 Структура документації

```
docs/needs/
  INDEX.md                  # Реєстр всіх потреб
  WORKFLOW.md               # Інструкція для AI (8 етапів)
  GLOSSARY.md               # Терміни проекту
  DECISIONS.md              # Архітектурні рішення (ADR)
  README.md                 # Опис структури
  templates/                # Шаблони документів
  NEED-XXX-назва/           # Папка потреби
    README.md               # Проблема + прес-реліз + рішення
    spec.md                 # Специфікація (10 розділів + AC)
    api.md                  # API контракти
    ui.md                   # UI/UX дизайн
    errors.md               # Обробка помилок
    tasks.md                # Задачі
    tests.md                # Тест-кейси
    changelog.md            # Історія змін
```

---

## ⚡ Quick Reference

### Деплой:
| Ситуація | Команда | Час |
|:---------|:--------|:----|
| Backend код | `./sync.sh` (sam sync --watch) | 10-20 сек |
| template.yaml | `sam deploy` | 3-5 хв |
| Frontend | `make deploy-fe` + invalidate cache | 1-2 хв |
| Admin panel | `make deploy-admin` + invalidate cache | 1-2 хв |

### Тестування:
```bash
make smoke-test    # Швидкий тест (30 сек)
make test          # Повний тест
```

---

## ✅ Checklist для нової сесії

- [ ] Прочитав AGENT_GUIDE.md
- [ ] Прочитав docs/needs/WORKFLOW.md
- [ ] Зрозумів яка задача (A/B/C/D)
- [ ] Готовий слідувати workflow

---

## 🚀 Після прочитання цієї інструкції

**Запитай користувача:**

> Який тип задачі будемо робити?
> - **A** — Нова потреба
> - **B** — Робота з існуючою потребою
> - **C** — QUICKFIX (баг/дрібна зміна)
> - **D** — Розуміння системи (onboarding)
