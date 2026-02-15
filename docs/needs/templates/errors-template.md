# Обробка помилок: [Назва]

## Потреба
[Посилання на потребу](./README.md)

## Специфікація
[Посилання на специфікацію](./spec.md)

---

## Класифікація помилок

### За джерелом

| Тип | Опис | Приклад |
|-----|------|---------|
| Client Error | Помилка на стороні клієнта | Невалідні дані |
| Server Error | Помилка на стороні сервера | Внутрішня помилка Lambda |
| Database Error | Проблеми з БД | MySQL connection timeout |
| External Service | Помилка зовнішнього сервісу | AWS service unavailable |

---

## Сценарії помилок

### ERR-01: [Назва помилки]

**Опис:** [Що відбувається]
**Причина:** [Чому виникає]

**Обробка (Python Lambda):**
```python
try:
    # операція
except Exception as e:
    return {
        'statusCode': 500,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
    }
```

**Fallback:** [Що робить система замість основної дії]

**Повідомлення користувачу:**
```
Помилка. Спробуйте пізніше.
```

---

## Fallback стратегії

### Стратегія 1: Кешовані дані
**Коли:** БД недоступна
**Як:** Використати cache_versions + локальний кеш Lambda

### Стратегія 2: Graceful degradation
**Коли:** Частина функціоналу недоступна
**Як:** Продовжити без опціональних даних

---

## Чекліст

- [ ] Всі помилки класифіковані
- [ ] Для кожної помилки є fallback
- [ ] CORS headers повертаються навіть при помилках
- [ ] Повідомлення користувачу зрозумілі
