# NEED-008: Admin Panel (Game Master Dashboard)

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
Game Masters (організатори ігор)

### Що (проблема)
Потрібна окрема панель для управління грою: гравці, артефакти, зони, контракти.

### Критерії успіху
- [x] Окремий React додаток для GM
- [x] GM авторизація (is_gm=1)
- [x] Dashboard зі статистикою
- [x] Управління гравцями (пошук, фільтри, статус)
- [x] Спавн артефактів (карта, час, типи)
- [x] Створення зон (радіація, респаун)
- [x] Управління контрактами
- [x] Завантаження зображень через Lambda

---

## Що реалізовано

### Сторінки
- `LoginPage.tsx` — GM авторизація
- `DashboardPage.tsx` — огляд та статистика
- `PlayersPage.tsx` — управління гравцями (пошук, фільтри, toggle status)
- `ArtifactsPage.tsx` — спавн артефактів (карта + час)
- `ZonesPage.tsx` — створення/управління зонами
- `ContractsPage.tsx` — управління контрактами

### Функціонал
- ProtectedRoute з перевіркою GM статусу
- Image upload через Lambda (base64 → S3)
- Artifact management: Reset to Map, Delete
- Player status management (enable/disable)
- Spawned artifacts list зі статусами (Active, Collected, Expired, Lost)

### Деплой
- Окремий S3 bucket: pda-zone-admin-dev-707694916945
- CloudFront: d3gda670zz1dlb
- URL: https://d3gda670zz1dlb.cloudfront.net
