# Artifact Respawn System Specification

**Status:** Draft for MVP implementation  
**Date:** 2026-01-11  
**Related:** Artifact system (existing), Quest system (artifact_collection quests)

---

## 1. Overview

**Problem:** Currently, when an artifact is picked up, it disappears forever. This limits replayability and makes artifact collection quests impossible to repeat.

**Solution:** Add optional respawn mechanism for artifacts:
- GM enables respawn per artifact spawn
- After pickup, artifact automatically respawns after delay
- Respawn location is randomized within radius
- Works seamlessly with quest system

---

## 2. Respawn Configuration

### 2.1 Admin Panel: Artifact Spawn Form

**Add new fields to spawn form:**

```
┌─────────────────────────────────────┐
│ Spawn Artifact                      │
├─────────────────────────────────────┤
│ Artifact Type: [Moonlight ▼]        │
│ Location: [Click Map]               │
│ Coordinates: 50.123, 30.456         │
│                                     │
│ Time Settings:                      │
│ ○ Duration (hours): [24]            │
│ ○ Exact Time: [Start] [End]        │
│                                     │
│ ✅ Enable Respawn                   │  ← NEW
│                                     │
│ Respawn Settings:                   │  ← NEW SECTION
│ ├─ Delay (minutes): [30]           │
│ └─ Random Radius (meters): [50]    │
│                                     │
│ [Spawn Artifact] [Cancel]           │
└─────────────────────────────────────┘
```

**Field details:**
- **Enable Respawn** (checkbox, default: OFF)
  - When OFF: artifact disappears after pickup (current behavior)
  - When ON: shows respawn settings

- **Respawn Delay** (integer, minutes, default: 30)
  - Time between pickup and next spawn
  - Range: 1-1440 minutes (1 min to 24 hours)
  - Example: 30 = respawns 30 minutes after pickup

- **Random Radius** (integer, meters, default: 50)
  - Artifact respawns within this radius from original location
  - Range: 0-500 meters
  - 0 = exact same location
  - 50 = random point within 50m circle

---

## 3. Database Schema

### 3.1 Extend `artifacts` Table

```sql
ALTER TABLE artifacts
ADD COLUMN respawn_enabled BOOLEAN DEFAULT FALSE COMMENT 'Auto-respawn after pickup',
ADD COLUMN respawn_delay_minutes INT NULL COMMENT 'Minutes until respawn (NULL = no respawn)',
ADD COLUMN respawn_radius_meters INT NULL COMMENT 'Random spawn radius in meters',
ADD COLUMN original_latitude DECIMAL(10,8) NULL COMMENT 'Original spawn location (for respawn)',
ADD COLUMN original_longitude DECIMAL(11,8) NULL COMMENT 'Original spawn location (for respawn)',
ADD COLUMN pickup_count INT DEFAULT 0 COMMENT 'How many times artifact was picked up',
ADD COLUMN last_pickup_at TIMESTAMP NULL COMMENT 'When artifact was last picked up';

CREATE INDEX idx_respawn_enabled ON artifacts(respawn_enabled);
CREATE INDEX idx_spawned_at ON artifacts(spawned_at);
```

**Field usage:**
- `respawn_enabled` - Master switch (set by GM on spawn)
- `respawn_delay_minutes` - How long to wait before respawn
- `respawn_radius_meters` - Randomization radius
- `original_latitude/longitude` - Store initial coordinates (never changes)
- `pickup_count` - Statistics (how many times respawned)
- `last_pickup_at` - For calculating next spawn time

---

## 4. Respawn Logic

### 4.1 On Artifact Pickup

**Current flow:**
1. Player picks up artifact
2. Artifact state → `extracted`
3. Artifact added to player inventory

**New flow with respawn:**
1. Player picks up artifact
2. Check if `respawn_enabled = TRUE`
3. **If respawn disabled:**
   - Artifact state → `extracted` (current behavior)
4. **If respawn enabled:**
   - Artifact state → `respawning` (NEW state)
   - Update fields:
     ```sql
     UPDATE artifacts SET
       state = 'respawning',
       pickup_count = pickup_count + 1,
       last_pickup_at = NOW(),
       spawned_at = NOW() + INTERVAL respawn_delay_minutes MINUTE,
       latitude = RANDOM_POINT_IN_RADIUS(original_latitude, original_longitude, respawn_radius_meters),
       longitude = RANDOM_POINT_IN_RADIUS(original_latitude, original_longitude, respawn_radius_meters)
     WHERE id = :artifact_id;
     ```
   - Artifact added to player inventory (same as before)

### 4.2 Respawn State Machine

```
┌─────────┐  GM spawns   ┌─────────┐  Player    ┌────────────┐
│ (none)  │─────────────→│ hidden  │───────────→│ extracting │
└─────────┘              └─────────┘  detects   └────────────┘
                              ↑                         │
                              │                         │ pickup
                              │                         ↓
                         ┌────────────┐  time    ┌────────────┐
                         │   hidden   │←─────────│ respawning │
                         │ (respawned)│  passes  └────────────┘
                         └────────────┘
```

**State definitions:**
- `hidden` - Artifact on map, not yet detected by players
- `extracting` - Player holding pickup button
- `respawning` - Artifact picked up, waiting for respawn timer
- `extracted` - Artifact picked up, no respawn (final state)

### 4.3 Respawn Activation

**Background job (Lambda cron or location update check):**

```python
def check_artifact_respawns():
    """
    Called every 1 minute (CloudWatch Events) or on every location update
    """
    # Find artifacts ready to respawn
    cursor.execute("""
        SELECT id, latitude, longitude
        FROM artifacts
        WHERE state = 'respawning'
          AND spawned_at <= NOW()
    """)
    
    for artifact in cursor.fetchall():
        # Activate respawn
        cursor.execute("""
            UPDATE artifacts
            SET state = 'hidden'
            WHERE id = %s
        """, (artifact['id'],))
        
        # Notify players via WebSocket (if near artifact)
        notify_nearby_players(artifact['id'], artifact['latitude'], artifact['longitude'])
```

**Trigger options:**
1. **CloudWatch Events** - Run Lambda every 1 minute (simple, reliable)
2. **Location update hook** - Check on every player location update (no extra Lambda)
3. **Hybrid** - Check on location update + fallback cron every 5 minutes

**Recommendation:** Option 2 (location update hook) for MVP - no extra infrastructure needed.

### 4.4 Random Location Generation

**Algorithm:**
```python
import random
import math

def random_point_in_radius(center_lat, center_lng, radius_meters):
    """
    Generate random point within radius from center.
    Uses uniform distribution in circle.
    """
    # Earth radius in meters
    EARTH_RADIUS = 6371000
    
    # Random distance (0 to radius)
    # Use sqrt for uniform distribution in circle
    distance = math.sqrt(random.random()) * radius_meters
    
    # Random angle (0 to 2π)
    angle = random.random() * 2 * math.pi
    
    # Convert to lat/lng offset
    lat_offset = (distance * math.cos(angle)) / EARTH_RADIUS * (180 / math.pi)
    lng_offset = (distance * math.sin(angle)) / EARTH_RADIUS * (180 / math.pi) / math.cos(center_lat * math.pi / 180)
    
    new_lat = center_lat + lat_offset
    new_lng = center_lng + lng_offset
    
    return new_lat, new_lng
```

**Edge cases:**
- `radius = 0` → exact same location
- `radius > 500m` → capped at 500m (prevent artifacts spawning too far)
- Coordinates outside map bounds → clamp to map boundaries

---

## 5. Quest Integration

### 5.1 Artifact Collection Quests

**Problem:** If quest requires "Collect 3 Moonlight" and only 1 Moonlight exists, quest is impossible.

**Solution with respawn:**
1. GM spawns 1 Moonlight with respawn enabled (30 min delay)
2. Player 1 picks up → quest progress 1/3
3. Artifact respawns after 30 min at new location
4. Player 1 picks up again → quest progress 2/3
5. Artifact respawns again
6. Player 1 picks up third time → quest complete 3/3

**Quest map markers:**
- Show 50m radius circle around artifact location
- If artifact is in `respawning` state → marker disappears
- When artifact respawns (`hidden` state) → marker reappears at new location
- Players see updated marker in real-time (WebSocket notification)

### 5.2 Multiple Players

**Scenario:** 2 players have same quest "Collect 3 Moonlight"

**Behavior:**
1. Player A picks up artifact → progress 1/3
2. Artifact enters `respawning` state (30 min)
3. Player B arrives → artifact not visible (already picked up)
4. After 30 min, artifact respawns at new location
5. Player B picks up → progress 1/3
6. Both players can complete quest independently

**Fairness:**
- First player to reach artifact gets it
- Other players must wait for respawn
- Encourages exploration (respawn location is random)

---

## 6. UI/UX

### 6.1 Admin Panel: Spawned Artifacts List

**Add respawn info to table:**

```
┌────────────────────────────────────────────────────────────────┐
│ ID      │ Type      │ Status      │ Pickups │ Next Respawn    │
├────────────────────────────────────────────────────────────────┤
│ abc-123 │ Moonlight │ Hidden      │ 3       │ -               │
│ def-456 │ Flash     │ Respawning  │ 1       │ in 15 min       │
│ ghi-789 │ Droplet   │ Extracted   │ 0       │ No respawn      │
└────────────────────────────────────────────────────────────────┘
```

**Columns:**
- **Pickups** - `pickup_count` (how many times artifact was collected)
- **Next Respawn** - Time until respawn (if `state = 'respawning'`)

### 6.2 Player PDA: Quest Map Markers

**Artifact marker behavior:**

| Artifact State | Marker Visible | Marker Color | Tooltip |
|----------------|----------------|--------------|---------|
| `hidden` | ✅ Yes | 🟢 Green | "Artifact nearby (50m)" |
| `extracting` | ✅ Yes | 🟡 Yellow | "Someone extracting..." |
| `respawning` | ❌ No | - | - |
| `extracted` | ❌ No | - | - |

**Real-time updates:**
- When artifact picked up → marker disappears immediately (WebSocket)
- When artifact respawns → marker appears at new location (WebSocket)
- Players near respawn location get notification: "New artifact detected!"

---

## 7. Configuration & Limits

### 7.1 Default Values

```python
# In src/config.py
ARTIFACT_RESPAWN_DEFAULTS = {
    'enabled': False,
    'delay_minutes': 30,
    'radius_meters': 50,
    'min_delay_minutes': 1,
    'max_delay_minutes': 1440,  # 24 hours
    'min_radius_meters': 0,
    'max_radius_meters': 500
}
```

### 7.2 GM Presets (Optional)

**Quick respawn presets in Admin UI:**
- **Fast** - 5 min delay, 20m radius (for testing)
- **Normal** - 30 min delay, 50m radius (default)
- **Slow** - 2 hours delay, 100m radius (rare artifacts)
- **Custom** - Manual input

---

## 8. API Changes

### 8.1 Admin Endpoints

**Extend existing spawn endpoint:**
```
POST /api/admin/artifacts/spawn
Body: {
  "typeId": "uuid",
  "latitude": 50.123,
  "longitude": 30.456,
  "expiresAt": "2026-01-11T18:00:00Z",
  "respawnEnabled": true,        // NEW
  "respawnDelayMinutes": 30,     // NEW
  "respawnRadiusMeters": 50      // NEW
}
```

**New endpoint for respawn stats:**
```
GET /api/admin/artifacts/respawn-stats
Response: {
  "totalRespawnEnabled": 5,
  "totalPickups": 23,
  "currentlyRespawning": 2,
  "artifacts": [
    {
      "id": "abc-123",
      "type": "Moonlight",
      "pickupCount": 7,
      "nextRespawnAt": "2026-01-11T10:30:00Z"
    }
  ]
}
```

### 8.2 Player Endpoints

**No changes needed** - respawn is transparent to players. They just see artifacts appear/disappear on map.

---

## 9. Implementation Priority

### Phase 1: Database & Backend (2 hours)
1. ✅ Database migration (add columns)
2. ✅ Update artifact pickup handler (set respawn state)
3. ✅ Random location generation utility
4. ✅ Respawn activation logic (location update hook)

### Phase 2: Admin UI (2 hours)
1. ✅ Add respawn fields to spawn form
2. ✅ Add respawn info to spawned artifacts table
3. ✅ Validation (min/max values)

### Phase 3: Player UI (1 hour)
1. ✅ Update map markers (hide respawning artifacts)
2. ✅ WebSocket notifications for respawns

### Phase 4: Testing (1 hour)
1. ✅ Test respawn cycle (pickup → wait → respawn)
2. ✅ Test random location generation
3. ✅ Test quest integration (multiple pickups)

**Total:** ~6 hours

---

## 10. Edge Cases & Testing

### 10.1 Edge Cases

1. **Artifact expires before respawn:**
   - If `expires_at < spawned_at + respawn_delay`, artifact won't respawn
   - Solution: Check `expires_at` before activating respawn

2. **Player picks up artifact twice:**
   - Not possible - artifact enters `respawning` state immediately
   - Second player must wait for respawn

3. **Respawn location outside map:**
   - Clamp coordinates to map boundaries
   - Or regenerate random point until valid

4. **GM deletes artifact while respawning:**
   - Delete works normally (CASCADE)
   - No special handling needed

5. **Quest requires artifact that's respawning:**
   - Quest marker disappears (artifact not available)
   - Reappears when artifact respawns
   - Player sees "Artifact respawning, check back later" message

### 10.2 Testing Checklist

- [ ] Spawn artifact with respawn enabled
- [ ] Pick up artifact → verify state = `respawning`
- [ ] Wait for respawn delay → verify state = `hidden`
- [ ] Verify new coordinates within radius
- [ ] Pick up respawned artifact → verify `pickup_count` increments
- [ ] Test with quest (collect 3 of same artifact)
- [ ] Test with multiple players (race condition)
- [ ] Test respawn with `radius = 0` (exact location)
- [ ] Test respawn with `radius = 500` (max radius)
- [ ] Test artifact expiration during respawn

---

## 11. Future Enhancements (Post-MVP)

1. **Respawn limits** - Max N respawns per artifact (then disappears forever)
2. **Respawn schedules** - Different delays for different times of day
3. **Respawn zones** - Artifact can respawn in completely different area
4. **Respawn notifications** - Push notification when artifact respawns near player
5. **Respawn analytics** - Heatmap of artifact pickup locations

---

**End of Specification**

**Next Steps:**
1. Review with team
2. Create database migration (`006_artifact_respawn.sql`)
3. Implement Phase 1 (backend logic)
4. Test with simple artifact (Moonlight, 5 min respawn)
