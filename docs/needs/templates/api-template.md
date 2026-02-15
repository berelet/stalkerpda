# API контракти: [Назва]

## Потреба
[Посилання на потребу](./README.md)

## Специфікація
[Посилання на специфікацію](./spec.md)

---

## Endpoints

### [Назва групи endpoints]

#### `METHOD /api/path`

**Опис:** [Що робить endpoint]

**Авторизація:** JWT / None

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "field1": "string",
  "field2": 123
}
```

**Request Parameters:**
| Параметр | Тип | Обов'язковий | Опис |
|----------|-----|--------------|------|
| field1 | string | так | [опис] |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {}
}
```

**Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Field X is required"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

## Моделі даних

### [Назва моделі]

| Поле | Тип | Опис |
|------|-----|------|
| id | string (uuid) | Унікальний ідентифікатор |
| field1 | string | [опис] |

---

## Коди помилок

| Код | HTTP Status | Опис |
|-----|-------------|------|
| VALIDATION_ERROR | 400 | Помилка валідації |
| UNAUTHORIZED | 401 | Не авторизований |
| FORBIDDEN | 403 | Немає доступу |
| NOT_FOUND | 404 | Ресурс не знайдено |
| INTERNAL_ERROR | 500 | Внутрішня помилка |

---

## Приклади використання

### cURL

```bash
curl -X POST https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev/api/path \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"field1": "value"}'
```

---

## ⚠️ CORS

Всі Lambda handlers МАЮТЬ повертати CORS headers:
```python
'headers': {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}
```
