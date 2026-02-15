# NEED-004: Location Tracking

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
Потрібна система відстеження GPS-позиції гравців в реальному часі для ігрових механік (артефакти, зони, квести).

### Критерії успіху
- [x] GPS координати відправляються кожні 15 секунд
- [x] Haversine формула для розрахунку відстаней
- [x] GPS accuracy компенсація (динамічний радіус)
- [x] Детекція артефактів при оновленні позиції
- [x] Детекція зон радіації
- [x] GM бачить всіх гравців на карті

---

## Що реалізовано

### Backend
- `POST /api/location/update` — оновлення позиції з детекцією зон/артефактів
- `src/utils/geo.py` — Haversine distance, radius checks
- GPS accuracy компенсація: `effective_radius = base_radius + min(accuracy, max_buffer)`

### GPS Accuracy Compensation
| Механіка | Base | Max Buffer | Effective |
|----------|------|------------|-----------|
| Artifact detection | 15m | 15m | 15-30m |
| Artifact pickup | 2m | 5m | 2-7m |
| Control point | 2m | 10m | 2-12m |
| Zone entry/exit | radius | 15m | +0-15m |
| Quest points | radius | 10m | +0-10m |

### Frontend
- `useGeolocation` — отримання GPS координат
- `useLocationTracking` — відправка кожні 15 секунд
- Leaflet карта з позицією гравця

### GM Map
- `GET /api/admin/players` — всі живі гравці з позиціями
- Маркери по фракціях (кольори, іконки)
- Popup з інфо про гравця (нікнейм, фракція, життя, радіація)
- Автооновлення кожні 10 секунд
