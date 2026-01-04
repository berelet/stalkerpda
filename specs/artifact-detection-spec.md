# Artifact Detection & Extraction System Specification

## Overview

Complete artifact system: detection on map (15m radius), pickup with button hold (2m radius, 30 sec), inventory management, and admin functions for reset/return artifacts.

---

## Database Schema

### artifact_types table
```sql
CREATE TABLE artifact_types (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rarity ENUM('common', 'uncommon', 'rare', 'legendary') NOT NULL,
    base_value DECIMAL(10, 2) NOT NULL,
    bonus_lives INT DEFAULT 0,
    radiation_resist INT DEFAULT 0,
    other_effects JSON,
    image_url VARCHAR(500),
    description TEXT,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### artifacts table (spawns on map)
```sql
CREATE TABLE artifacts (
    id VARCHAR(36) PRIMARY KEY,
    type_id VARCHAR(36) NOT NULL,  -- Reference to artifact_types
    state ENUM('hidden', 'visible', 'extracting', 'extracted', 'lost') DEFAULT 'hidden',
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Extraction tracking
    owner_id VARCHAR(36),  -- Player who picked it up (for tracking)
    extracting_by VARCHAR(36),
    extraction_started_at TIMESTAMP NULL,
    
    -- Timestamps
    spawned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,  -- When spawn becomes inactive (NULL = permanent)
    extracted_at TIMESTAMP NULL,
    
    FOREIGN KEY (type_id) REFERENCES artifact_types(id),
    INDEX idx_state (state),
    INDEX idx_owner (owner_id),
    INDEX idx_extracting (extracting_by),
    INDEX idx_location (latitude, longitude),
    INDEX idx_active_artifacts (state, spawned_at, expires_at)
);
```

### player_inventory table (player's collected items)
```sql
CREATE TABLE player_inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(36) NOT NULL,
    item_type ENUM('artifact', 'equipment', 'consumable') NOT NULL,
    item_id VARCHAR(36) NOT NULL,  -- Reference to artifact_types.id or equipment_types.id
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player (player_id),
    INDEX idx_item_type (player_id, item_type),
    UNIQUE KEY unique_player_item (player_id, item_type, item_id)  -- Prevent duplicates, use quantity
);
```

**Key Points:**
- `artifact_types` = artifact definitions (Moonlight, Flash, etc.)
- `artifacts` = spawns on map (coordinates, state, expiration)
- `player_inventory` = player's collected items (references to types, with quantity)
- Artifacts can stack in inventory (quantity field)
- Spawns are separate from inventory (one spawn can be picked by one player)

---

## Artifact Lifecycle

### Time-based Activation

Artifact is **active** if ALL conditions are met:

1. `state IN ('hidden', 'visible')` - not picked up or lost
2. `owner_id IS NULL` - not owned by player
3. `spawned_at <= NOW()` - activation time has come
4. `expires_at IS NULL OR expires_at > NOW()` - not expired or permanent

### States & Transitions

**States:**
- **hidden** - artifact exists but player not in detection radius (15m)
- **visible** - player within 15m, artifact shown on map
- **extracting** - player holding pickup button (30 sec), `extracting_by` set
- **extracted** - artifact picked up, in player inventory (`owner_id` set)
- **lost** - artifact removed from game (drop, sell, death without looting)

**State Transitions:**
```
hidden → visible (player enters 15m radius)
visible → extracting (player starts pickup within 2m)
extracting → visible (player releases button or exits 2m radius)
extracting → extracted (30 sec hold completed)
extracted → lost (drop, sell, death)
extracted → hidden (admin "Reset to Map" action)
```

### Important Rules

1. **Expired artifacts in inventory:**
   - If artifact is picked up (state='extracted'), `expires_at` no longer applies
   - Player can keep artifact in inventory indefinitely
   - `expires_at` only affects pickup availability from map

2. **Concurrent extraction:**
   - Only one player can extract at a time
   - First player to call `/extract/start` sets `extracting_by`
   - Second player gets error `ARTIFACT_BEING_EXTRACTED`
   - If first player cancels, second can start fresh

3. **Distance check on complete:**
   - `/extract/complete` re-checks distance
   - If player moved beyond 2m → error `TOO_FAR`
   - Extraction doesn't auto-cancel - player must call `/extract/cancel`

---

## Backend Implementation

### 1. Location Update Handler

**Endpoint:** `POST /api/location/update`

**Flow:**
1. Get player coordinates (latitude, longitude)
2. Get list of active artifacts (with caching)
3. For each artifact calculate distance (Haversine)
4. If distance <= 15m:
   - Add to `nearbyArtifacts` list
   - Update state to 'visible' (if was 'hidden')
   - Mark `canPickup: true` if distance <= 2m
5. Return list of artifacts with coordinates

**Response:**
```json
{
  "success": true,
  "nearbyArtifacts": [
    {
      "id": "artifact-uuid",
      "typeId": "artifact-type-uuid",
      "name": "Moonlight",
      "description": "A glowing artifact that emits soft light. Grants additional life force.",
      "rarity": "rare",
      "value": 5000,
      "imageUrl": "https://bucket.s3.amazonaws.com/artifacts/moonlight.jpg",
      "effects": {
        "bonusLives": 1,
        "radiationResist": 10
      },
      "latitude": 50.4501,
      "longitude": 30.5234,
      "distance": 12.3,
      "canPickup": false
    },
    {
      "id": "artifact-uuid-2",
      "typeId": "artifact-type-uuid-2",
      "name": "Flash",
      "description": "Electrically charged artifact. Dangerous but valuable.",
      "rarity": "uncommon",
      "value": 3000,
      "imageUrl": "https://bucket.s3.amazonaws.com/artifacts/flash.jpg",
      "effects": {
        "radiationResist": 5
      },
      "latitude": 50.4502,
      "longitude": 30.5235,
      "distance": 1.5,
      "canPickup": true  // Show "Pick Up" button
    }
  ],
  "currentZones": {
    "radiationZones": [...],
    "controlPoints": [...]
  }
}
```

### 2. Start Extraction Handler

**Endpoint:** `POST /api/artifacts/extract/start`

**Request:**
```json
{
  "artifactId": "artifact-uuid"
}
```

**Validation:**
1. Artifact exists and state IN ('hidden', 'visible')
2. owner_id IS NULL (not picked up)
3. Player within 2m of artifact
4. Artifact is active (spawned_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW()))
5. extracting_by IS NULL (not being extracted by another player)

**Action:**
1. Set `state = 'extracting'`
2. Set `extracting_by = player_id`
3. Set `extraction_started_at = NOW()`

**Response:**
```json
{
  "success": true,
  "extractionStartedAt": "2026-01-03T09:40:00Z",
  "extractionDuration": 30
}
```

**Errors:**
- `ARTIFACT_NOT_FOUND` - artifact doesn't exist
- `ARTIFACT_ALREADY_TAKEN` - owner_id not NULL
- `ARTIFACT_BEING_EXTRACTED` - extracting_by not NULL (another player extracting)
- `TOO_FAR` - distance > 2m
- `ARTIFACT_EXPIRED` - expires_at passed

### 3. Cancel Extraction Handler

**Endpoint:** `POST /api/artifacts/extract/cancel`

**Request:**
```json
{
  "artifactId": "artifact-uuid"
}
```

**Validation:**
1. `extracting_by = player_id` (only the one who started)

**Action:**
1. Set `state = 'visible'`
2. Clear `extracting_by = NULL`
3. Clear `extraction_started_at = NULL`

**Response:**
```json
{
  "success": true
}
```

### 4. Complete Extraction Handler

**Endpoint:** `POST /api/artifacts/extract/complete`

**Request:**
```json
{
  "artifactId": "artifact-uuid"
}
```

**Validation:**
1. `extracting_by = player_id`
2. `extraction_started_at + 30 seconds <= NOW()` (30 sec passed)
3. Player still within 2m radius
4. `owner_id IS NULL` (not picked up by another player meanwhile)

**Action:**
1. Mark spawn as extracted:
   ```sql
   UPDATE artifacts 
   SET state = 'extracted', owner_id = player_id, extracted_at = NOW(),
       extracting_by = NULL, extraction_started_at = NULL
   WHERE id = artifact_id AND owner_id IS NULL
   ```
2. Add to player inventory (creates reference to artifact type):
   ```sql
   INSERT INTO player_inventory (player_id, item_type, item_id, quantity)
   VALUES (player_id, 'artifact', artifact_type_id, 1)
   ON DUPLICATE KEY UPDATE quantity = quantity + 1
   ```
3. Update player stats:
   ```sql
   UPDATE players 
   SET total_artifacts_found = total_artifacts_found + 1,
       reputation = reputation + 5
   WHERE id = player_id
   ```

**Important:**
- Spawn record stays in `artifacts` table with `state='extracted'` (for tracking/admin)
- Player gets reference in `player_inventory` (not a copy of spawn)
- Multiple pickups of same artifact type will increment `quantity`
- Spawn is no longer available on map (state='extracted')

**Response:**
```json
{
  "success": true,
  "artifact": {
    "id": "artifact-uuid",
    "name": "Moonlight",
    "rarity": "rare",
    "value": 5000,
    "effects": {
      "bonusLives": 1,
      "radiationResist": 10
    }
  }
}
```

**Errors:**
- `NOT_EXTRACTING` - extracting_by != player_id
- `EXTRACTION_NOT_COMPLETE` - 30 sec not passed
- `TOO_FAR` - player moved beyond 2m radius
- `ALREADY_TAKEN` - owner_id not NULL (someone picked it up first)

### 5. Drop Artifact Handler

**Endpoint:** `POST /api/artifacts/drop`

**Request:**
```json
{
  "artifactId": "artifact-type-id"  // ID from player_inventory (artifact_types.id)
}
```

**Validation:**
1. Artifact in player inventory (player_inventory.item_id = artifactId)

**Action:**
1. Decrease quantity or remove from inventory:
   ```sql
   UPDATE player_inventory 
   SET quantity = quantity - 1 
   WHERE player_id = player_id AND item_type = 'artifact' AND item_id = artifact_type_id
   ```
2. If quantity reaches 0, delete record:
   ```sql
   DELETE FROM player_inventory 
   WHERE player_id = player_id AND item_type = 'artifact' AND item_id = artifact_type_id AND quantity <= 0
   ```

**Response:**
```json
{
  "success": true
}
```

**Note:** Dropped artifact does NOT return to map, it's permanently lost from game.

### 6. Sell Artifact Handler

**Endpoint:** `POST /api/artifacts/sell`

**Request:**
```json
{
  "artifactId": "artifact-type-id"  // ID from player_inventory (artifact_types.id)
}
```

**Validation:**
1. Artifact in player inventory (player_inventory.item_id = artifactId)
2. Player at bartender location (optional - geolocation check)

**Action:**
1. Calculate price with reputation modifier:
   ```python
   base_value = artifact_type.base_value
   reputation_modifier = 1 + (player.reputation / 100) * 0.3
   final_price = base_value * reputation_modifier
   ```
2. Add money to player
3. Decrease quantity or remove from inventory:
   ```sql
   UPDATE player_inventory 
   SET quantity = quantity - 1 
   WHERE player_id = player_id AND item_type = 'artifact' AND item_id = artifact_type_id
   ```
4. If quantity reaches 0, delete record:
   ```sql
   DELETE FROM player_inventory 
   WHERE player_id = player_id AND item_type = 'artifact' AND item_id = artifact_type_id AND quantity <= 0
   ```

**Response:**
```json
{
  "success": true,
  "soldFor": 5750,
  "newBalance": 12500
}
```

**Note:** Sold artifact is permanently removed from inventory (quantity decreased).

---

## In-Memory Cache

### Purpose

Avoid repeated DB queries on every location update.

### Implementation

```python
# Global cache (Lambda container reuse)
_artifacts_cache = {
    'data': None,
    'timestamp': None,
    'ttl': 300  # 5 minutes
}

def get_active_artifacts(cursor):
    """Get active artifacts with 5-minute cache"""
    from datetime import datetime
    
    now = datetime.utcnow()
    
    # Check cache
    if (_artifacts_cache['data'] is not None and 
        _artifacts_cache['timestamp'] is not None and
        (now - _artifacts_cache['timestamp']).total_seconds() < _artifacts_cache['ttl']):
        return _artifacts_cache['data']
    
    # Query database
    cursor.execute("""
        SELECT a.id, at.name, a.latitude, a.longitude, a.state, 
               a.spawned_at, a.expires_at, a.owner_id, a.extracting_by
        FROM artifacts a
        JOIN artifact_types at ON a.type_id = at.id
        WHERE a.state IN ('hidden', 'visible')
          AND a.owner_id IS NULL
          AND a.spawned_at <= NOW()
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
    """)
    
    artifacts = cursor.fetchall()
    
    # Update cache
    _artifacts_cache['data'] = artifacts
    _artifacts_cache['timestamp'] = now
    
    return artifacts
```

### Cache Invalidation

- **TTL:** 5 minutes (automatic)
- **Manual:** On new artifact spawn (optional)
- **Lambda cold start:** Cache resets automatically

### Performance Benefits

**Without Cache:**
- Every location update = DB query
- 20 players × 6 updates/min = 120 queries/min
- High DB load

**With Cache (5 min TTL):**
- First request = DB query
- Next ~30 requests = cache hit
- 20 players × 6 updates/min = 4 queries/min (97% reduction)

---

## Death & Looting Integration

### On Player Death

**Endpoint:** `POST /api/players/death`

**Action for artifacts:**
1. Get all artifacts from player inventory
2. For each artifact after looting:
   - If not stolen during looting (1-3% chance)
   - Apply 1-20% loss chance
   - If lost: `state = 'lost'`, delete from inventory

### Looting Artifacts

```python
# In looting handler
victim_artifacts = get_player_artifacts(victim_id)

for artifact in victim_artifacts:
    if random.random() < 0.03:  # 1-3% chance to steal
        # Transfer to looter
        cursor.execute("""
            UPDATE artifacts 
            SET owner_id = %s 
            WHERE id = %s
        """, (looter_id, artifact['id']))
        
        cursor.execute("""
            UPDATE player_inventory 
            SET player_id = %s 
            WHERE player_id = %s AND item_id = %s AND item_type = 'artifact'
        """, (looter_id, victim_id, artifact['type_id']))
        
        looted_artifacts.append(artifact)

# After looting - loss of remaining artifacts
remaining_artifacts = [a for a in victim_artifacts if a not in looted_artifacts]

for artifact in remaining_artifacts:
    if random.random() < 0.20:  # 1-20% chance to lose
        cursor.execute("""
            UPDATE artifacts 
            SET state = 'lost', owner_id = NULL 
            WHERE id = %s
        """, (artifact['id'],))
        
        cursor.execute("""
            DELETE FROM player_inventory 
            WHERE player_id = %s AND item_id = %s AND item_type = 'artifact'
        """, (victim_id, artifact['type_id']))
```

---

## Admin Panel Functions

### 1. List Spawned Artifacts

**Endpoint:** `GET /api/admin/artifacts/spawned`

**Response:**
```json
{
  "artifacts": [
    {
      "id": "artifact-uuid",
      "typeName": "Moonlight",
      "latitude": 50.4501,
      "longitude": 30.5234,
      "state": "extracted",
      "status": "Collected",
      "collectedBy": "Player123",
      "collectedByPlayerId": "player-uuid",
      "spawnedAt": "2026-01-03T08:00:00Z",
      "expiresAt": "2026-01-03T14:00:00Z",
      "extractedAt": "2026-01-03T09:30:00Z"
    },
    {
      "id": "artifact-uuid-2",
      "typeName": "Flash",
      "latitude": 50.4502,
      "longitude": 30.5235,
      "state": "visible",
      "status": "Active",
      "collectedBy": null,
      "spawnedAt": "2026-01-03T08:00:00Z",
      "expiresAt": null
    },
    {
      "id": "artifact-uuid-3",
      "typeName": "Gravi",
      "latitude": 50.4503,
      "longitude": 30.5236,
      "state": "hidden",
      "status": "Expired",
      "collectedBy": null,
      "spawnedAt": "2026-01-03T08:00:00Z",
      "expiresAt": "2026-01-03T10:00:00Z"
    }
  ]
}
```

**Status Logic:**
- `state = 'extracted'` → "Collected"
- `state = 'lost'` → "Lost"
- `expires_at < NOW()` → "Expired"
- `spawned_at > NOW()` → "Scheduled"
- Otherwise → "Active"

### 2. Reset Artifact to Map

**Endpoint:** `POST /api/admin/artifacts/{id}/reset`

**Purpose:** Return artifact to map WITHOUT removing from player inventory

**Action:**
1. Set `state = 'hidden'`
2. Clear `extracting_by = NULL`
3. Clear `extraction_started_at = NULL`
4. **DO NOT touch** `owner_id` (stays with player)
5. **DO NOT delete** from `player_inventory`

**Use Case:** GM wants artifact to reappear on map for other players, but first player keeps it in inventory (duplicate artifact).

**Response:**
```json
{
  "success": true,
  "message": "Artifact returned to map (player keeps copy in inventory)"
}
```

### 3. Remove from Inventory & Reset

**Endpoint:** `POST /api/admin/artifacts/{id}/remove-and-reset`

**Purpose:** Take artifact from player AND return to map

**Action:**
1. Delete from `player_inventory` (WHERE item_id = artifact_type_id AND player_id = owner_id)
2. Set `state = 'hidden'`
3. Clear `owner_id = NULL`
4. Clear `extracting_by = NULL`
5. Clear `extraction_started_at = NULL`
6. Clear `extracted_at = NULL`

**Use Case:** GM wants to fully reset artifact - take from player and return to map.

**Response:**
```json
{
  "success": true,
  "message": "Artifact removed from player inventory and returned to map"
}
```

### 4. Delete Artifact Spawn

**Endpoint:** `DELETE /api/admin/artifacts/{id}`

**Purpose:** Completely remove artifact spawn from game

**Action:**
1. If `owner_id` not NULL - delete from `player_inventory`
2. Delete record from `artifacts` table

**Response:**
```json
{
  "success": true,
  "message": "Artifact spawn deleted"
}
```

### Admin UI Display

**Spawned Artifacts List:**
- Show all spawned artifacts with status badges
- Status colors:
  - "Collected" - green badge
  - "Active" - blue badge
  - "Expired" - red badge
  - "Scheduled" - yellow badge
  - "Lost" - gray badge

**Actions per artifact:**
- "Reset to Map" button (only if state='extracted')
- "Remove & Reset" button (only if state='extracted')
- "Delete Spawn" button (always available)
- "Edit" button (change location/time)

---

## Frontend Implementation

### Map Display

**Requirements:**
1. Show artifact markers on map
2. Update list on every location update (every 10-30 sec)
3. Show distance to artifact
4. Highlight artifacts within pickup range (2m)
5. On marker click → show modal with artifact details:
   - Image (from artifact_types.image_url)
   - Name
   - Rarity badge (common/uncommon/rare/legendary)
   - Description
   - Effects (bonus lives, radiation resist, etc.)
   - Distance
   - Value
   - "Hold to Pick Up" button (if within 2m) or "Move closer" message

**Leaflet Integration:**
```typescript
// Add artifact markers
nearbyArtifacts.forEach(artifact => {
  const icon = artifact.canPickup ? artifactIconHighlighted : artifactIcon;
  
  const marker = L.marker([artifact.latitude, artifact.longitude], {
    icon: icon,
    title: `${artifact.name} (${artifact.distance}m)`
  });
  
  // On click - show artifact details modal
  marker.on('click', () => {
    showArtifactModal(artifact);
  });
  
  marker.addTo(map);
});

// Artifact details modal
function showArtifactModal(artifact) {
  const modal = `
    <div class="artifact-modal">
      <img src="${artifact.imageUrl}" alt="${artifact.name}" />
      <h2>${artifact.name}</h2>
      <p class="rarity ${artifact.rarity}">${artifact.rarity}</p>
      <p class="description">${artifact.description}</p>
      <div class="effects">
        ${artifact.effects.bonusLives ? `<p>+${artifact.effects.bonusLives} Lives</p>` : ''}
        ${artifact.effects.radiationResist ? `<p>+${artifact.effects.radiationResist}% Radiation Resist</p>` : ''}
      </div>
      <p class="distance">Distance: ${artifact.distance}m</p>
      <p class="value">Value: ${artifact.value} credits</p>
      ${artifact.canPickup ? 
        '<button class="pickup-btn" onmousedown="startExtraction()" onmouseup="cancelExtraction()">Hold to Pick Up (30s)</button>' : 
        '<p class="too-far">Move closer to pick up (within 2m)</p>'
      }
    </div>
  `;
  
  openModal(modal);
}
```

### Extraction UI Flow

**Step 0: Click on artifact marker**
- Show modal with artifact details:
  - Image (artifact_types.image_url)
  - Name and rarity badge
  - Description text
  - Effects list (bonus lives, radiation resist)
  - Distance and value
  - Action button (pickup or "move closer")

**Step 1: Show "Hold to Pick Up" button**
- Condition: `artifact.canPickup === true` (distance <= 2m)
- Button appears in artifact details modal

**Step 2: Start extraction**
- User presses and holds button (mousedown/touchstart)
- Call `POST /api/artifacts/extract/start`
- Show progress bar (0-30 seconds)
- Show "Release to cancel" message
- Button text changes to "Extracting... (Xs remaining)"

**Step 3: Hold for 30 seconds**
- Update progress bar every second
- If user releases (mouseup/touchend) → call `POST /api/artifacts/extract/cancel`
- If user moves beyond 2m → auto-cancel and show error

**Step 4: Complete extraction**
- After 30 seconds → call `POST /api/artifacts/extract/complete`
- Show success animation with artifact details
- Update inventory UI
- Remove artifact marker from map
- Close modal

**Error Handling:**
- `ARTIFACT_BEING_EXTRACTED` → "Another player is picking up this artifact"
- `TOO_FAR` → "You moved too far from the artifact"
- `ARTIFACT_ALREADY_TAKEN` → "Artifact was picked up by another player"
- `EXTRACTION_NOT_COMPLETE` → "Hold the button for 30 seconds"

---

## Testing

### Unit Tests

1. **Active artifacts query:**
   - Artifact with `spawned_at` in future → not returned
   - Artifact with `expires_at` in past → not returned
   - Artifact with `expires_at = NULL` → returned
   - Artifact with `state = 'extracted'` → not returned
   - Artifact with `owner_id` set → not returned

2. **Cache behavior:**
   - First call → DB query
   - Second call (within 5 min) → cache hit
   - Call after 5 min → DB query

3. **Distance calculation:**
   - Artifact at 10m → returned, canPickup=false
   - Artifact at 1.5m → returned, canPickup=true
   - Artifact at 20m → not returned
   - Artifact at exactly 15m → returned

4. **Extraction flow:**
   - Start extraction → state='extracting', extracting_by set
   - Cancel extraction → state='visible', extracting_by cleared
   - Complete before 30 sec → error
   - Complete after 30 sec → state='extracted', owner_id set

5. **Concurrent extraction:**
   - Player A starts → success
   - Player B starts (same artifact) → error ARTIFACT_BEING_EXTRACTED
   - Player A cancels → success
   - Player B starts → success

### Integration Tests

1. **Location update flow:**
   - Player moves near artifact → artifact appears in response
   - Player moves away → artifact disappears
   - Artifact expires → no longer returned

2. **Extraction flow:**
   - Start extraction → progress tracked
   - Move beyond 2m → complete fails with TOO_FAR
   - Complete after 30 sec → artifact in inventory

3. **Admin functions:**
   - Spawn artifact → appears in list
   - Player picks up → status "Collected"
   - Reset to map → artifact reappears, player keeps copy
   - Remove & reset → artifact removed from inventory, reappears on map

---

## Migration Steps

### 1. Add Composite Index

```sql
ALTER TABLE artifacts 
ADD INDEX idx_active_artifacts (state, spawned_at, expires_at);
```

**Execution:**
```bash
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"$DB_PASSWORD" pda_zone \
      -e "ALTER TABLE artifacts ADD INDEX idx_active_artifacts (state, spawned_at, expires_at);"
```

### 2. Add extracting_by Index (if not exists)

```sql
ALTER TABLE artifacts 
ADD INDEX idx_extracting (extracting_by);
```

---

## Rollout Plan

1. ✅ Create specification (this document)
2. ⏳ Add composite indexes to database
3. ⏳ Update `location.py` handler with cache and canPickup flag
4. ⏳ Create extraction handlers (start, cancel, complete)
5. ⏳ Create drop/sell handlers
6. ⏳ Update admin handlers (reset, remove-and-reset)
7. ⏳ Test with sample artifacts
8. ⏳ Update frontend map to display artifacts
9. ⏳ Implement extraction UI with hold button
10. ⏳ Deploy and monitor performance

---

## Monitoring

**Metrics to track:**
- Cache hit rate (should be >95%)
- DB query time (should be <10ms with index)
- Location update latency (should be <200ms)
- Artifact detection accuracy (15m radius)
- Extraction completion rate (started vs completed)

**Logs to add:**
```python
print(f"[CACHE] Hit: {cache_hit}, Artifacts: {len(artifacts)}, Query time: {query_time}ms")
print(f"[DETECTION] Player: {player_id}, Nearby: {len(nearby_artifacts)}, Pickupable: {pickupable_count}")
print(f"[EXTRACTION] Player: {player_id}, Artifact: {artifact_id}, Action: {action}, Duration: {duration}s")
```

---

## API Summary

### Player Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/location/update` | Update location, get nearby artifacts |
| POST | `/api/artifacts/extract/start` | Start artifact extraction (hold button) |
| POST | `/api/artifacts/extract/cancel` | Cancel extraction (release button) |
| POST | `/api/artifacts/extract/complete` | Complete extraction (after 30 sec) |
| POST | `/api/artifacts/drop` | Drop artifact from inventory |
| POST | `/api/artifacts/sell` | Sell artifact to bartender |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/artifacts/spawned` | List all spawned artifacts |
| POST | `/api/admin/artifacts/spawn` | Spawn new artifact |
| POST | `/api/admin/artifacts/{id}/reset` | Reset to map (player keeps copy) |
| POST | `/api/admin/artifacts/{id}/remove-and-reset` | Remove from inventory & reset |
| DELETE | `/api/admin/artifacts/{id}` | Delete artifact spawn |
