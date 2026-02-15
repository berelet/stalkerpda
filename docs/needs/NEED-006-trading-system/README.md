# NEED-006: Trading System

## Статус
`done`

## Пріоритет
`P1`

## Метадані
| Поле | Значення |
|------|----------|
| Дата створення | 2026-01-07 |
| Дата завершення | 2026-01-07 |

---

## Вихідна потреба

### Хто
Гравці

### Що (проблема)
Потрібна віртуальна економіка: купівля/продаж предметів у NPC-торговців.

### Критерії успіху
- [x] Купівля предметів у NPC торговця
- [x] Продаж предметів з рюкзака
- [x] Комісії торговця (buy/sell %)
- [x] Trade sessions з таймаутом (5 хв)
- [x] Ідемпотентність (захист від дублювання)
- [x] Мертві гравці можуть купувати, але не продавати
- [x] Redeem механіка для їжі/напоїв

---

## Що реалізовано

### Backend
- `src/handlers/trade.py` — session, catalog, backpack, buy, sell, redeem
- Trade sessions: UUID, 5 хв таймаут, статуси PENDING/SUCCESS/FAILED
- Атомарні транзакції (MySQL)
- Перевірка відстані до NPC (≤20м)

### Ціни та комісії
- `buy_price = round(base_price * (1 + commission_buy_pct / 100))`
- `sell_price = round(base_price * (1 - commission_sell_pct / 100))`

### Предмети (item_definitions)
7 предметів: medkit, bandage, anti-rad, BBs, beer, energy drink, food

### NPC Traders
- Sidorovich — основний торговець
- Радіус взаємодії: 20м
- Каталог предметів з цінами

### Обмеження MVP
- Немає P2P торгівлі
- Немає повернень після підтвердження
- Немає фракційних модифікаторів цін

### Коди помилок
TRADER_TOO_FAR, TRADER_INACTIVE, SESSION_EXPIRED, INSUFFICIENT_FUNDS, INVENTORY_FULL, ITEM_NOT_IN_BACKPACK, ITEM_NOT_SELLABLE, INVALID_QUANTITY, PLAYER_DEAD_SELL_FORBIDDEN
