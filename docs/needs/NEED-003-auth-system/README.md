# NEED-003: Auth System

## Статус
`done`

## Пріоритет
`P0`

## Метадані
| Поле | Значення |
|------|----------|
| Дата створення | 2026-01-02 |
| Дата завершення | 2026-01-06 |

---

## Вихідна потреба

### Хто
Гравці, Game Masters

### Що (проблема)
Потрібна система авторизації для гравців та GM з розділенням прав доступу.

### Критерії успіху
- [x] Реєстрація з вибором фракції
- [x] Логін з JWT токеном
- [x] Middleware для захисту ендпоінтів (@require_auth, @require_gm)
- [x] Система ролей (player, GM, bartender)
- [x] Валідація токена на кожній навігації (PDA + Admin)
- [x] Деактивація акаунтів (status=dead блокує логін)

---

## Що реалізовано

### Backend
- `src/handlers/auth.py` — login, register, me
- `src/utils/auth_simple.py` — JWT генерація/валідація, QR код
- `src/middleware/auth.py` — @require_auth, @require_gm декоратори
- Пароль: SHA256 (тимчасово, для production потрібен bcrypt)
- JWT: HS256, 7-денний термін, зберігається в cookies

### Ролі (player_roles таблиця)
- `is_gm` — Game Master (доступ до admin panel)
- `is_bartender` — Бармен (створення квестів, торгівля)
- `permissions` — JSON з додатковими правами

### Frontend
- Login/Register сторінка з вибором фракції
- JWT в cookies (pda_token, pda_player_id, pda_nickname)
- ProtectedRoute — валідація на кожній навігації
- Автоматичний logout при невалідному токені

### Admin Panel
- GM авторизація (перевірка is_gm=1)
- ProtectedRoute з перевіркою GM статусу
- Деактивація гравців (status toggle)
