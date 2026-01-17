# API Specification v1.0

Based on Game Mechanics and Database Schema

**Base URL:** `https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev`

**Authentication:** JWT Bearer token in `Authorization` header

---

## Authentication

### POST /api/auth/register
Register new player

**Request:**
```json
{
  "nickname": "string",
  "email": "string",
  "password": "string",
  "faction": "stalker|bandit|mercenary|duty|freedom|loner"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "nickname": "string",
  "email": "string",
  "faction": "string",
  "qrCode": "string",
  "token": "jwt_token"
}
```

**Errors:**
- `400` - Invalid input
- `409` - Nickname or email already exists

---

### POST /api/auth/login
Login player

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "nickname": "string",
  "email": "string",
  "faction": "string",
  "token": "jwt_token"
}
```

**Errors:**
- `401` - Invalid credentials

---

### GET /api/auth/me
Get current player info

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "nickname": "string",
  "email": "string",
  "faction": "string",
  "status": "alive|wounded|dead",
  "balance": 1000.00,
  "reputation": 0,
  "currentLives": 4,
  "currentRadiation": 0,
  "qrCode": "string",
  "stats": {
    "kills": 0,
    "deaths": 0,
    "artifactsFound": 0,
    "contractsCompleted": 0
  }
}
```

---

## Location

### POST /api/location
Update player location

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "latitude": 59.3293,
  "longitude": 18.0686,
  "accuracy": 10.5
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "currentZones": {
    "radiationZones": [
      {
        "id": "uuid",
        "name": "Anomaly Alpha",
        "radiationLevel": 50,
        "timeInZone": 120  // seconds
      }
    ],
    "controlPoints": [
      {
        "id": "uuid",
        "name": "Checkpoint Bravo",
        "controlledBy": "duty",
        "distance": 5.2  // meters
      }
    ]
  },
  "nearbyArtifacts": [
    {
      "id": "uuid",
      "name": "Moonlight",
      "distance": 12.3,  // meters
      "latitude": 59.3294,
      "longitude": 18.0687
    }
  ]
}
```

**Errors:**
- `401` - Unauthorized
- `400` - Invalid coordinates

---

### GET /api/location/me
Get my last location

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "latitude": 59.3293,
  "longitude": 18.0686,
  "accuracy": 10.5,
  "updatedAt": "2026-01-02T10:00:00Z"
}
```

---

## Artifacts

### GET /api/artifacts
Get my artifacts

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "artifacts": [
    {
      "id": "uuid",
      "name": "Moonlight",
      "rarity": "rare",
      "value": 2500,
      "effects": {
        "bonusLives": 1,
        "radiationResist": 20
      },
      "extractedAt": "2026-01-02T09:30:00Z"
    }
  ]
}
```

---

### POST /api/artifacts/{id}/extract
Start extracting artifact

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "latitude": 59.3293,
  "longitude": 18.0686
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "extractionStarted": true,
  "completesAt": "2026-01-02T10:00:30Z"  // 30 seconds from now
}
```

**Errors:**
- `400` - Too far from artifact (>2m)
- `409` - Already extracting
- `404` - Artifact not found

---

### POST /api/artifacts/{id}/complete
Complete extraction (after 30 seconds)

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "artifact": {
    "id": "uuid",
    "name": "Moonlight",
    "rarity": "rare",
    "value": 2500,
    "effects": {...}
  }
}
```

**Errors:**
- `400` - Extraction not started or interrupted
- `409` - Timer not completed

---

### POST /api/artifacts/{id}/cancel
Cancel extraction

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### POST /api/artifacts/{id}/drop
Drop artifact (lost forever)

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Equipment

### GET /api/equipment
Get my equipment

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "armor": {
    "id": "uuid",
    "name": "Heavy Armor",
    "bonusWounds": 3,
    "radiationResist": 10
  },
  "rings": [
    {
      "id": "uuid",
      "name": "Lead Ring",
      "radiationResist": 20
    }
  ],
  "consumables": [
    {
      "id": "uuid",
      "name": "Anti-Rad",
      "radiationRemoval": 50,
      "quantity": 2
    }
  ],
  "totalRadiationResist": 50  // 10 + 20 + 20 (if 2 rings)
}
```

---

### POST /api/equipment/{id}/use
Use consumable (anti-rad)

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "radiationBefore": 80,
  "radiationAfter": 30,
  "radiationRemoved": 50
}
```

**Errors:**
- `404` - Item not found
- `400` - Not a consumable

---

## Contracts

### GET /api/contracts
Get available contracts

**Headers:** `Authorization: Bearer {token}`

**Query params:**
- `status` - available|accepted|completed (default: available)
- `type` - escort|delivery|artifact_extraction|zone_control

**Response:** `200 OK`
```json
{
  "contracts": [
    {
      "id": "uuid",
      "type": "escort",
      "title": "Escort Scientist",
      "description": "Target: Dr. Sakharov",
      "reward": 5000,
      "issuer": {
        "id": "uuid",
        "nickname": "Barman"
      },
      "targetPlayer": {
        "id": "uuid",
        "nickname": "Sakharov",
        "faction": "ecologist"
      },
      "status": "available",
      "factionRestriction": "mercenary",
      "expiresAt": "2026-01-02T18:00:00Z"
    }
  ]
}
```

---

### GET /api/contracts/my
Get my contracts (accepted/completed)

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "active": [...],
  "completed": [...]
}
```

---

### POST /api/contracts
Create contract (player-issued)

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "type": "escort",
  "title": "Escort to Safe Zone",
  "description": "Need protection",
  "reward": 3000,
  "destinationLat": 59.3300,
  "destinationLng": 18.0700,
  "expiresAt": "2026-01-02T16:00:00Z"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "escrowHeld": true,
  "balanceAfter": 7000
}
```

**Errors:**
- `400` - Insufficient balance
- `400` - Invalid contract data

---

### POST /api/contracts/{id}/accept
Accept contract

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "contract": {...}
}
```

**Errors:**
- `409` - Already accepted
- `403` - Faction restriction

---

### POST /api/contracts/{id}/complete
Mark contract as completed (executor)

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "proof": "optional_photo_url_or_description"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "awaitingConfirmation": true
}
```

---

### POST /api/contracts/{id}/confirm
Confirm contract completion (issuer/GM/bartender)

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "rewardPaid": 5000,
  "executorBalance": 12000
}
```

**Errors:**
- `403` - Not authorized to confirm
- `400` - Not marked as completed

---

### POST /api/contracts/{id}/cancel
Cancel contract

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "escrowReturned": 3000
}
```

**Errors:**
- `403` - Not issuer or GM

---

## Zones

### GET /api/zones/radiation
Get all radiation zones

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "zones": [
    {
      "id": "uuid",
      "name": "Anomaly Alpha",
      "centerLat": 59.3300,
      "centerLng": 18.0700,
      "radius": 50,
      "radiationLevel": 50
    }
  ]
}
```

---

### GET /api/zones/control
Get all control points

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "controlPoints": [
    {
      "id": "uuid",
      "name": "Checkpoint Bravo",
      "latitude": 59.3310,
      "longitude": 18.0710,
      "controlledByFaction": "duty",
      "controlledByPlayer": {
        "id": "uuid",
        "nickname": "Commander"
      },
      "capturedAt": "2026-01-02T09:00:00Z"
    }
  ]
}
```

---

### POST /api/zones/control/{id}/capture
Start capturing control point

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "latitude": 59.3310,
  "longitude": 18.0710
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "captureStarted": true,
  "completesAt": "2026-01-02T10:00:30Z"
}
```

**Errors:**
- `400` - Too far (>2m)
- `409` - Already capturing

---

### POST /api/zones/control/{id}/complete
Complete capture

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "controlledByFaction": "stalker",
  "controlledByPlayer": "uuid"
}
```

---

### POST /api/zones/control/{id}/cancel
Cancel capture

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Death & Looting

### POST /api/player/death
Mark self as dead

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "livesRemaining": 3,
  "radiationReset": true,
  "artifactsLost": ["uuid1", "uuid2"],
  "equipmentLost": [
    {
      "id": "uuid",
      "name": "Heavy Armor"
    }
  ],
  "outOfLives": false
}
```

---

### POST /api/player/loot
Loot player (scan QR)

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "victimQrCode": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "loot": {
    "money": 250,
    "equipment": [
      {
        "id": "uuid",
        "name": "Lead Ring"
      }
    ],
    "artifacts": [
      {
        "id": "uuid",
        "name": "Moonlight"
      }
    ]
  },
  "yourBalance": 10250
}
```

**Errors:**
- `404` - Player not found
- `409` - Already looted this death
- `400` - Invalid QR code

---

## Shop & Trading

### GET /api/shop/inventory
Get bartender's shop inventory

**Headers:** `Authorization: Bearer {token}`

**Query params:**
- `bartenderId` - uuid (optional, default: any active bartender)

**Response:** `200 OK`
```json
{
  "bartender": {
    "id": "uuid",
    "nickname": "Barman"
  },
  "inventory": [
    {
      "id": "uuid",
      "name": "Heavy Armor",
      "description": "+3 wounds",
      "price": 5000,
      "priceWithReputation": 4500,  // Your price with reputation
      "stock": 5,
      "category": "equipment"
    }
  ]
}
```

---

### POST /api/shop/purchase
Create purchase transaction (bartender)

**Headers:** `Authorization: Bearer {token}`

**Permissions:** Bartender only

**Request:**
```json
{
  "playerId": "uuid",
  "items": [
    {
      "itemId": "uuid",
      "quantity": 1
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "transactionId": "uuid",
  "qrCode": "base64_qr_image",
  "totalAmount": 4500,
  "expiresAt": "2026-01-02T10:05:00Z"  // 5 min expiry
}
```

---

### POST /api/shop/scan
Scan purchase QR (player)

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "qrCode": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "items": [
    {
      "name": "Heavy Armor",
      "quantity": 1
    }
  ],
  "totalPaid": 4500,
  "balanceAfter": 5500
}
```

**Errors:**
- `400` - Insufficient balance
- `404` - Transaction not found
- `410` - Transaction expired

---

## Admin (GM)

### GET /api/admin/players
Get all players (real-time map)

**Headers:** `Authorization: Bearer {token}`

**Permissions:** GM only

**Response:** `200 OK`
```json
{
  "players": [
    {
      "id": "uuid",
      "nickname": "Stalker_01",
      "faction": "stalker",
      "status": "alive",
      "lives": 3,
      "radiation": 45,
      "location": {
        "latitude": 59.3293,
        "longitude": 18.0686,
        "updatedAt": "2026-01-02T10:00:00Z"
      }
    }
  ]
}
```

---

### GET /api/admin/players/{id}/history
Get player location history

**Headers:** `Authorization: Bearer {token}`

**Permissions:** GM only

**Query params:**
- `from` - ISO timestamp
- `to` - ISO timestamp

**Response:** `200 OK`
```json
{
  "player": {
    "id": "uuid",
    "nickname": "Stalker_01"
  },
  "track": [
    {
      "latitude": 59.3293,
      "longitude": 18.0686,
      "timestamp": "2026-01-02T09:00:00Z"
    }
  ]
}
```

---

### POST /api/admin/artifacts/spawn
Spawn artifact

**Headers:** `Authorization: Bearer {token}`

**Permissions:** GM only

**Request:**
```json
{
  "typeId": "uuid",
  "latitude": 59.3300,
  "longitude": 18.0700
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Moonlight",
  "location": {
    "latitude": 59.3300,
    "longitude": 18.0700
  }
}
```

---

### POST /api/admin/zones/radiation
Create radiation zone

**Headers:** `Authorization: Bearer {token}`

**Permissions:** GM only

**Request:**
```json
{
  "name": "Anomaly Delta",
  "centerLat": 59.3320,
  "centerLng": 18.0720,
  "radius": 100,
  "radiationLevel": 75
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Anomaly Delta",
  "active": true
}
```

---

### POST /api/admin/zones/control
Create control point

**Headers:** `Authorization: Bearer {token}`

**Permissions:** GM only

**Request:**
```json
{
  "name": "Checkpoint Echo",
  "latitude": 59.3330,
  "longitude": 18.0730
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Checkpoint Echo"
}
```

---

### POST /api/admin/broadcast
Broadcast message to all players

**Headers:** `Authorization: Bearer {token}`

**Permissions:** GM only

**Request:**
```json
{
  "message": "Emission in 10 minutes!",
  "targetPlayerId": "uuid"  // Optional, null = all players
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "sentTo": 15  // Number of players
}
```

---

## WebSocket Events

**URL:** `wss://08xq76njp7.execute-api.eu-north-1.amazonaws.com/dev`

### Connection
```json
{
  "action": "connect",
  "token": "jwt_token"
}
```

### Events from Server

**Player Location Update (GM only):**
```json
{
  "type": "player_location_update",
  "data": {
    "playerId": "uuid",
    "nickname": "Stalker_01",
    "faction": "stalker",
    "location": {
      "lat": 59.3293,
      "lng": 18.0686
    }
  }
}
```

**Zone Transition:**
```json
{
  "type": "zone_transition",
  "data": {
    "playerId": "uuid",
    "fromZone": "safe_zone",
    "toZone": "anomaly_alpha"
  }
}
```

**Artifact Extracted:**
```json
{
  "type": "artifact_extracted",
  "data": {
    "playerId": "uuid",
    "artifactId": "uuid",
    "artifactName": "Moonlight"
  }
}
```

**Contract Completed:**
```json
{
  "type": "contract_completed",
  "data": {
    "contractId": "uuid",
    "executorId": "uuid",
    "reward": 5000
  }
}
```

**Broadcast Message:**
```json
{
  "type": "broadcast",
  "data": {
    "message": "Emission in 10 minutes!",
    "from": "GM"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - 401
- `FORBIDDEN` - 403
- `NOT_FOUND` - 404
- `CONFLICT` - 409
- `VALIDATION_ERROR` - 400
- `INSUFFICIENT_BALANCE` - 400
- `OUT_OF_LIVES` - 403

---

## Rate Limiting

- Location updates: Max 1 per 10 seconds
- Artifact scans: Max 1 per 30 seconds
- General API: 100 requests per minute per user

---

## Next Steps

1. ✅ Game mechanics defined
2. ✅ Database schema designed
3. ✅ API specification complete
4. ⏭️ Implementation (Backend Lambda handlers)
5. ⏭️ Frontend specification
