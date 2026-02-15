# NEED-002: Database Schema & Migrations

## Статус
`done`

## Пріоритет
`P0`

## Метадані
| Поле | Значення |
|------|----------|
| Дата створення | 2026-01-02 |
| Дата завершення | 2026-01-11 |

---

## Вихідна потреба

### Хто
Технічна команда

### Що (проблема)
Потрібна схема БД для всіх ігрових механік: гравці, артефакти, зони, контракти, торгівля, квести.

### Критерії успіху
- [x] Всі таблиці створені та мігровані на RDS
- [x] Seed data завантажено (артефакти, екіпірування)
- [x] Система ролей працює (player_roles)
- [x] Торгова система (traders, items, sessions)
- [x] Квестова система (quests, progress, reputation)

---

## Що реалізовано

### Міграції (database/migrations/)
- `001_initial_schema.sql` — 18 базових таблиць (players, artifacts, zones, contracts тощо)
- `002_seed_data.sql` — 8 типів артефактів, 9 типів екіпірування
- `003_inventory_system_v2.sql` — ⏳ Pending (equipment slots + backpack)
- `004_trading_system.sql` — Торгівля (item_definitions, traders, trade_sessions, trade_transactions)
- `006_quest_system.sql` — Квести (quests, quest_progress, reputation)
- `007_artifact_respawn.sql` — Авто-респаун артефактів

### Ключові таблиці
- `players` — акаунти гравців (18 колонок)
- `player_roles` — GM/bartender права
- `player_locations` — поточна позиція (оновлюється кожні 15с)
- `artifacts` / `artifact_types` — артефакти на карті
- `zones` — радіаційні та респаун зони
- `contracts` — контракти/місії
- `item_definitions` / `player_items` — предмети та інвентар
- `traders` / `trader_inventory` — NPC торговці
- `trade_sessions` / `trade_transactions` — торгові сесії
- `cache_versions` — version-based кеш інвалідація

### Seed Data
- 8 артефактів: Moonlight, Flash, Droplet, Fireball, Gravi, Crystal, Battery, Mica
- 9 екіпірування: 3 броні, 3 кільця, 3 анти-ради
- 7 предметів: medkit, bandage, anti-rad, BBs, beer, energy drink, food
- NPC торговець: Sidorovich
