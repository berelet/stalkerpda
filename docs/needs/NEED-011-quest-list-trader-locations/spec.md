# NEED-011: Специфікація

## Acceptance Criteria

- AC1: Таб Available показує тільки квести від трейдерів (NPC) та бартендерів (is_bartender=1)
- AC2: Кнопка ACCEPT прибрана з Available табу та модалки
- AC3: Кожен квест показує ім'я та тип issuer'а (NPC Trader / Bartender)
- AC4: В модалці квесту є кнопка "Show on Map" → карта з центруванням на трейдері
- AC5: Backend GET /api/quests повертає координати issuer'а (latitude, longitude)
- AC6: Для бартендерів координати беруться з player_locations
- AC7: Квести без валідного трейдера/бартендера не показуються

## 0. Контекст

Гравець бачить доступні квести в PDA, але не може прийняти їх напряму — тільки через трейдера на карті.

## 1. Scope

- Backend: зміна `list_available_handler` — фільтр + додаткові поля
- Frontend: зміна `QuestsPage` — прибрати ACCEPT, додати issuer info + "Show on Map"
- Frontend: зміна MapPage — підтримка центрування через URL params

## 2. API Changes

Див. api.md

## 3. Database Changes

Немає.

## 4. Frontend Changes

**QuestsPage (Available tab):**
- Прибрати кнопку ACCEPT з модалки для available квестів
- В картці квесту: `📍 Sidorovich (NPC Trader)` або `📍 PlayerName (Bartender)`
- В модалці: кнопка "SHOW ON MAP" замість "ACCEPT"
- Кнопка навігує на `/map?lat={lat}&lng={lng}&zoom=17`

**MapPage:**
- Читати `lat`, `lng`, `zoom` з URL search params
- Якщо є — центрувати карту на цих координатах

## 5. Error Handling

- Issuer без координат → квест не показується (фільтр на backend)
- Бартендер без запису в player_locations → квест не показується

## 6. Security

Без змін — JWT авторизація як є.

## 7. Performance

Один додатковий JOIN — мінімальний вплив.

## 8. Testing

- Available показує тільки квести від трейдерів/бартендерів
- ACCEPT прибраний з Available
- "Show on Map" центрує карту на координатах трейдера

## 9. Migration Plan

Не потрібен — backward compatible.

## 10. Rollback

Повернути старий `list_available_handler` та `QuestsPage`.
