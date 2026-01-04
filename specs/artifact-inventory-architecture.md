# Artifact & Inventory System - Architecture Summary

**Date:** 2026-01-04  
**Status:** Implemented and Deployed

---

## Key Architecture Decisions

### 1. Three-Table System

**artifact_types** - Artifact definitions
- Contains: name, rarity, effects, image, description
- One record per artifact type (Moonlight, Flash, etc.)
- Shared across all players

**artifacts** - Spawns on map
- Contains: coordinates, state, expiration, extraction tracking
- One record per spawn instance
- When picked up: `state='extracted'`, `owner_id` set (for tracking)
- Spawn stays in table (not deleted) for admin/history

**player_inventory** - Player's collected items
- Contains: player_id, item_type, item_id (reference to type), quantity
- One record per artifact type per player
- Quantity increments when same artifact picked multiple times
- Used for: artifacts, equipment, consumables

### 2. Artifact Pickup Flow

```
1. Player near spawn (15m) → spawn visible on map
2. Player starts extraction (2m, hold 30s) → spawn.state='extracting'
3. Player completes extraction:
   a. spawn.state='extracted', spawn.owner_id=player_id
   b. INSERT INTO player_inventory (item_id=artifact_type_id, quantity=1)
      ON DUPLICATE KEY UPDATE quantity=quantity+1
4. Spawn no longer visible on map (state='extracted')
5. Player sees artifact in inventory (from player_inventory)
```

### 3. Inventory Display Logic

**Backend (get_backpack_items):**
```python
# Read from player_inventory
SELECT pi.item_id, at.name, pi.quantity
FROM player_inventory pi
JOIN artifact_types at ON pi.item_id = at.id
WHERE pi.player_id = ? AND pi.item_type = 'artifact'

# Expand quantity into separate items for UI
for item in artifacts:
    for i in range(item['quantity']):
        backpack.append({
            'id': f"{item['id']}-{i}",  # Unique ID per instance
            'typeId': item['type_id'],
            'name': item['name'],
            ...
        })
```

**Frontend:**
- Displays each artifact as separate card
- 3x Moonlight = 3 cards in backpack grid
- Each takes 1 slot (capacity: 3/50)
- No visual stacking indicator

### 4. Equipment vs Artifacts Storage

**Equipment (armor, rings, consumables):**
- Stored in: `player_equipment` table
- Fields: `slot_type` (backpack/armor/ring), `slot_position` (0/1/2)
- Each record = one physical item instance
- No quantity field (each item is unique)

**Artifacts:**
- Stored in: `player_inventory` table
- Fields: `item_id` (artifact_types.id), `quantity`
- Multiple same artifacts = one record with quantity > 1
- Expanded to separate items in UI

### 5. Why This Architecture?

**Spawns separate from inventory:**
- Admin can track who picked what and when
- Spawn can be "reset to map" without affecting inventory
- History preserved for game analytics

**Artifacts use player_inventory:**
- Allows stacking in database (saves records)
- Flexible for future features (trading, crafting)
- Consistent with equipment/consumables storage

**No stacking in UI:**
- Each artifact feels unique to player
- Matches game mechanics (each pickup is an event)
- Simpler UX (no quantity numbers to track)

---

## Database Queries

### Get Player Artifacts (Backpack)
```sql
SELECT 
    pi.id,
    pi.item_id as type_id,
    at.name,
    at.rarity,
    at.base_value,
    at.bonus_lives,
    at.radiation_resist,
    pi.quantity
FROM player_inventory pi
JOIN artifact_types at ON pi.item_id = at.id
WHERE pi.player_id = ? AND pi.item_type = 'artifact'
```

### Get Active Spawns (Map)
```sql
SELECT 
    a.id,
    a.type_id,
    a.latitude,
    a.longitude,
    a.state,
    at.name,
    at.description,
    at.image_url
FROM artifacts a
JOIN artifact_types at ON a.type_id = at.id
WHERE a.state IN ('hidden', 'visible')
  AND a.owner_id IS NULL
  AND a.spawned_at <= NOW()
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
```

### Pickup Artifact
```sql
-- 1. Mark spawn as extracted
UPDATE artifacts 
SET state = 'extracted', 
    owner_id = ?,
    extracted_at = NOW(),
    extracting_by = NULL
WHERE id = ? AND owner_id IS NULL;

-- 2. Add to inventory (or increment quantity)
INSERT INTO player_inventory (player_id, item_type, item_id, quantity)
VALUES (?, 'artifact', ?, 1)
ON DUPLICATE KEY UPDATE quantity = quantity + 1;
```

### Drop/Sell Artifact
```sql
-- Decrease quantity
UPDATE player_inventory 
SET quantity = quantity - 1 
WHERE player_id = ? AND item_type = 'artifact' AND item_id = ?;

-- Remove if quantity reaches 0
DELETE FROM player_inventory 
WHERE player_id = ? AND item_type = 'artifact' AND item_id = ? AND quantity <= 0;
```

---

## API Endpoints

### Artifact Pickup
- `POST /api/artifacts/extract/start` - Start 30s timer
- `POST /api/artifacts/extract/complete` - Add to player_inventory
- `POST /api/artifacts/extract/cancel` - Cancel extraction

### Inventory Management
- `GET /api/inventory` - Get equipped + backpack (reads from player_inventory)
- `POST /api/inventory/equip` - Equip artifact (not implemented for artifacts yet)
- `POST /api/inventory/drop` - Decrease quantity in player_inventory
- `POST /api/inventory/sell` - Decrease quantity, add money

### Admin
- `POST /api/admin/artifacts/spawn` - Create spawn in artifacts table
- `GET /api/admin/artifacts/spawned` - List all spawns with status
- `POST /api/admin/artifacts/{id}/reset` - Reset spawn to map (state='hidden')

---

## Migration Notes

### Existing Data
If players have artifacts with old schema (artifacts.owner_id set, no player_inventory):

```sql
-- Migrate to new system
INSERT INTO player_inventory (player_id, item_type, item_id, quantity)
SELECT 
    owner_id as player_id,
    'artifact' as item_type,
    type_id as item_id,
    COUNT(*) as quantity
FROM artifacts
WHERE owner_id IS NOT NULL AND state = 'extracted'
GROUP BY owner_id, type_id
ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity);
```

### Future Improvements
1. **Artifact instances:** Add `instance_id` to player_inventory for unique artifacts
2. **Equipped artifacts:** Track which artifact instance is equipped (currently not implemented)
3. **Trading:** Transfer records between players in player_inventory
4. **Crafting:** Combine artifacts (decrease quantities, create new)

---

## Testing Checklist

- [ ] Spawn artifact on map → visible to players within 15m
- [ ] Pickup artifact → added to player_inventory with quantity=1
- [ ] Pickup same artifact again → quantity=2 in database
- [ ] Inventory displays 2 separate cards for 2x same artifact
- [ ] Drop artifact → quantity decreases, removed if 0
- [ ] Sell artifact → quantity decreases, money added
- [ ] Spawn reset by admin → spawn.state='hidden', inventory unchanged
- [ ] Multiple players can't pickup same spawn
- [ ] Expired spawns not visible on map
- [ ] Picked artifacts not visible on map (state='extracted')

---

**Last Updated:** 2026-01-04 08:21
