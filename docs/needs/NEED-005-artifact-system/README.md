# NEED-005: Artifact System

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
Гравці, Game Masters

### Що (проблема)
Потрібна система артефактів: GM розміщує на карті, гравці знаходять та підбирають.

### Критерії успіху
- [x] GM спавнить артефакти через admin panel (координати, час)
- [x] Гравці детектують артефакти в радіусі 15м
- [x] Екстракція з утриманням кнопки 30с (радіус 2м)
- [x] Артефакти мають типи, зображення, ефекти
- [x] Авто-респаун артефактів після підбору
- [x] Кеш-система з version-based інвалідацією

---

## Що реалізовано

### Backend
- `src/handlers/artifacts.py` — list, extract, complete, cancel, drop
- `src/handlers/admin.py` — spawn_artifact, get_spawned, delete_artifact
- `src/utils/respawn.py` — авто-респаун з затримкою та випадковим радіусом
- Стани артефакту: hidden → visible → extracting → extracted → lost
- Кеш: 15 хв TTL, інвалідація при spawn/pickup/reset/delete

### Admin Panel (Spawn Artifacts)
- Візуальний вибір типу артефакту (сітка з зображеннями)
- Інтерактивна Leaflet карта (клік для розміщення)
- Два режими часу: Duration (години) / Exact Time (діапазон)
- Список заспавнених артефактів зі статусами
- Reset to Map, Delete spawn

### Frontend (PDA)
- Детекція на карті (15м радіус)
- Модалка з деталями (зображення, опис, ефекти)
- Hold button 30с для екстракції (2м радіус)

### Artifact Types (seed data)
Moonlight, Flash, Droplet, Fireball, Gravi, Crystal, Battery, Mica

### Respawn (2026-01-11)
- Налаштовується per spawn: delay (хвилини), random radius (метри)
- Активується при підборі артефакту
- Інтеграція з location update
