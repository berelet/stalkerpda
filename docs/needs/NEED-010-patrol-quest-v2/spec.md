# NEED-010: Spec — Patrol Quest v2

## Acceptance Criteria

1. Patrol квест: чекпоінти відвідуються тільки послідовно
2. Радіус кожного чекпоінта — 30м (з GPS accuracy compensation)
3. Прибрано required_time_minutes / accumulated_time_seconds
4. Квест auto-complete при відвідуванні всіх чекпоінтів
5. При auto-complete нараховується: гроші + репутація + предмети + stats
6. Location response повертає quest progress + quest completed info
7. Фронтенд показує попап при завершенні квесту з нагородою

---

## 1. quest_data формат

```json
{
  "checkpoints": [
    {"lat": 50.123, "lng": 30.456, "radius": 30, "visited": false},
    {"lat": 50.124, "lng": 30.457, "radius": 30, "visited": false},
    {"lat": 50.125, "lng": 30.458, "radius": 30, "visited": false}
  ],
  "checkpoint_visits": []
}
```

Прибрано: `required_time_minutes`, `accumulated_time_seconds`

## 2. Логіка послідовних чекпоінтів

- Знайти перший невідвіданий чекпоінт (index = кількість відвіданих)
- Перевірити чи гравець в радіусі 30м від ЦЬОГО чекпоінта
- Якщо так — позначити visited, додати в checkpoint_visits
- Інші чекпоінти ігноруються (навіть якщо гравець поруч)

## 3. Auto-complete з нагородою

При завершенні (всі чекпоінти visited):
- `contracts.status = 'completed'`, `completed_at = NOW()`
- `players.balance += reward`
- `players.total_contracts_completed += 1`
- Якщо є `reward_reputation` — нарахувати через `add_reputation()`
- Якщо є `reward_item_id` — додати предмет через INSERT/ON DUPLICATE KEY

## 4. Location response — quest updates

```json
{
  "questUpdates": [
    {
      "questId": "uuid",
      "type": "checkpoint_reached",
      "checkpointIndex": 1,
      "totalCheckpoints": 3,
      "visitedCount": 2
    }
  ],
  "questCompleted": [
    {
      "questId": "uuid",
      "title": "Patrol Zone A",
      "reward": 1500,
      "rewardReputation": 50
    }
  ]
}
```

## 5. Frontend попап

```
┌─────────────────────────────────┐
│     ✅ QUEST COMPLETED!         │
│                                 │
│     📜 Patrol Zone A            │
│                                 │
│     Rewards:                    │
│     💰 1,500                    │
│     ⭐ +50 reputation           │
│                                 │
│         [OK]                    │
└─────────────────────────────────┘
```

## 6. Карта — маркери чекпоінтів

- Відвіданий — зелений з галочкою ✅
- Наступний активний — яскравий жовтий/зелений
- Майбутній — сірий/тьмяний
- Номери на маркерах (1, 2, 3...)

## 7. Створення patrol квесту

```python
quest_data = {
    'checkpoints': body.get('checkpoints', []),
    'checkpoint_visits': []
}
```

## 8. Файли для зміни

| Файл | Зміна |
|------|-------|
| `backend/src/utils/quest.py` | Переписати `update_patrol_progress()` — послідовність, без часу |
| `backend/src/handlers/location.py` | Прибрати delta_time, додати rewards при auto-complete, questUpdates/questCompleted в response |
| `backend/src/handlers/quests.py` | Прибрати `required_time_minutes` при створенні patrol |
| `frontend/` | Попап завершення квесту, маркери чекпоінтів на карті |

## 9. Обробка помилок

- Якщо quest_data пошкоджена — skip (не крашити location update)
- Нових error codes немає

## 10. Тестування

- Послідовність: чекпоінт 2 не зараховується поки не відвіданий чекпоінт 1
- Auto-complete: всі visited → completed + нагорода
- Reward: гроші + репутація + предмет нараховані
- Response: questUpdates та questCompleted коректні
