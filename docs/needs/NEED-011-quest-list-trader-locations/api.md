# NEED-011: API Contracts

## GET /api/quests (MODIFIED)

**Зміни:** додано фільтр по issuer type + координати issuer'а в response.

**SQL фільтр:** тільки квести де issuer_id є в `traders` АБО issuer є бартендером (player з is_bartender=1).

**Response:**
```json
{
  "quests": [{
    "id": "uuid",
    "title": "Quest title",
    "description": "...",
    "questType": "patrol",
    "reward": 5000,
    "status": "available",
    "failed": false,
    "failedReason": null,
    "autoComplete": true,
    "issuer": {
      "id": "uuid",
      "nickname": "Sidorovich",
      "type": "npc",
      "latitude": 34.76462856,
      "longitude": 32.42416978
    },
    "factionRestriction": null,
    "expiresAt": "2026-02-20T12:00:00Z",
    "acceptedAt": null,
    "createdAt": "2026-02-15T10:00:00Z"
  }]
}
```

**issuer.type values:**
- `"npc"` — NPC трейдер (координати з `traders`)
- `"bartender"` — гравець-бартендер (координати з `player_locations`)

**Фільтрація:**
- Квести де issuer не є трейдером і не є бартендером — НЕ повертаються
- Квести де issuer не має координат — НЕ повертаються
