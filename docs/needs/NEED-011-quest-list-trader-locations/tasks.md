# NEED-011: Tasks

## Backend

- [ ] Task 1: Змінити `list_available_handler` в `backend/src/handlers/quests.py`
  - JOIN traders ON c.issuer_id = t.id
  - LEFT JOIN player_roles + player_locations для бартендерів
  - Фільтр: тільки де є трейдер або бартендер з координатами
  - Додати issuer type та координати в response

## Frontend

- [ ] Task 2: Змінити `QuestsPage` — Available tab
  - Прибрати ACCEPT кнопку з модалки (tab === 'available')
  - Додати issuer info в картку квесту (ім'я, тип)
  - Додати кнопку "SHOW ON MAP" в модалку
  - Навігація на `/map?lat={lat}&lng={lng}&zoom=17`

- [ ] Task 3: Змінити MapPage — підтримка URL params
  - Читати lat, lng, zoom з useSearchParams
  - Центрувати карту якщо params є

## Deploy

- [ ] Task 4: Deploy backend (sam sync)
- [ ] Task 5: Deploy frontend (make deploy-fe + invalidate cache)
