# Quest System - Implementation Summary

**Quick reference for developers. Full specs:**
- `quest-system-spec.md` - Complete quest system specification
- `artifact-respawn-spec.md` - Artifact respawn mechanics

---

## 🎯 What is Quest System?

**Quests = Enhanced Contracts** with:
- ✅ Multiple objective types (collect, patrol, deliver, visit)
- ✅ Automatic progress tracking
- ✅ Reputation rewards (NPC/Faction-based)
- ✅ Item rewards
- ✅ Quest failure on death
- ✅ Bartender quest creation

**Key principle:** Quests ARE contracts in database. "Quest" is UI/UX term.

---

## 📊 Quest Types (4 total)

| Type | Objective | Example | Auto-track | Map Marker |
|------|-----------|---------|------------|------------|
| **artifact_collection** | Collect N artifacts of type Y | "Collect 3 Moonlight" | ✅ Pickup events | 50m radius circle |
| **delivery** | Deliver item to NPC/coords | "Bring medkit to Sidorovich" | ❌ Manual | Exact coords |
| **patrol** | Visit N checkpoints + spend M min | "Patrol 3 points for 15 min" | ✅ Location | Multiple circles (30m) |
| **visit** | Reach coordinates once | "Scout location" | ✅ Location | Exact coords |

---

## 🗄️ Database Changes

### Extend `contracts` table:
```sql
ALTER TABLE contracts
ADD COLUMN quest_type ENUM('artifact_collection', 'delivery', 'patrol', 'visit') NULL,
ADD COLUMN quest_data JSON NULL,
ADD COLUMN auto_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN failed BOOLEAN DEFAULT FALSE,
ADD COLUMN failed_reason VARCHAR(255) NULL;
```

### New table: `quest_progress_events`
Tracks detailed progress for debugging/analytics.

### New table: `npc_reputation`
```sql
CREATE TABLE npc_reputation (
    player_id VARCHAR(36),
    npc_id VARCHAR(36) NULL,
    faction ENUM(...) NULL,
    reputation INT DEFAULT 0,  -- -10,000 to +10,000
    ...
);
```

### Extend `traders` table:
```sql
ALTER TABLE traders
ADD COLUMN faction ENUM(...) NULL;
```

### Extend `artifacts` table (respawn):
```sql
ALTER TABLE artifacts
ADD COLUMN respawn_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN respawn_delay_minutes INT NULL,
ADD COLUMN respawn_radius_meters INT NULL,
ADD COLUMN original_latitude DECIMAL(10,8) NULL,
ADD COLUMN original_longitude DECIMAL(11,8) NULL,
ADD COLUMN pickup_count INT DEFAULT 0,
ADD COLUMN last_pickup_at TIMESTAMP NULL;
```

---

## 🔄 Quest Lifecycle

```
Available → Accept → In Progress → Complete → Rewards
                ↓
              Failed (death, timeout, cancel)
```

**Failure triggers:**
1. **Player death** → ALL active quests fail immediately
2. **Quest timeout** → `expires_at` reached
3. **Manual cancel** → Player cancels (no penalty)

---

## 💰 Reputation System

**Formula:**
```python
discount_pct = min(100, reputation / 100)
# 1% discount per 100 reputation points
# Max 100% discount (no commission) at 10,000 rep
```

**Progression:**
- 0 rep → 0% discount
- 1,000 rep → 10% discount (~10 quests)
- 5,000 rep → 50% discount (~50 quests)
- 10,000 rep → 100% discount (~100 quests)

**Types:**
- **NPC-specific:** Reputation with individual trader (e.g., Sidorovich)
- **Faction-wide:** Reputation with faction (applies to all faction traders)

---

## 🎮 Who Can Create Quests?

| Role | Can Create? | Where? | Notes |
|------|-------------|--------|-------|
| **GM** | ✅ Yes | Admin panel | Full control, can assign to NPCs |
| **Live Bartender** | ✅ Yes | PDA | Simplified form, creates as themselves |
| **NPC Trader** | ❌ No | - | GM assigns quests to them |
| **Regular Player** | ❌ No (MVP) | - | Schema supports future implementation |

---

## 🗺️ Map Markers

**Artifact Collection:**
- 50m radius circle (not exact location)
- Disappears when artifact picked up
- Reappears when artifact respawns (if respawn enabled)
- **Multiple types:** Shows markers for ALL required artifact types

**Patrol:**
- Multiple circles (30m radius each)
- All checkpoints must be visited
- Total time accumulates across all checkpoints

**Visit/Delivery:**
- Exact coordinates with radius
- Single marker

---

## 🎯 Artifact Collection Quest Details

**Admin Panel Creation:**
1. Select "Artifact Collection" quest type
2. Choose artifact types with individual counts:
   - Fetched from `GET /api/admin/artifact-types`
   - Shows name, rarity, icon for each type
   - Check type + enter count for each
3. Player must collect ALL specified types with their counts

**Example:**
- Quest: "Collect rare artifacts"
- Requirements: 2 Moonlight AND 3 Electra
- Player progress: 2/2 Moonlight ✓, 1/3 Electra ⏳ = Incomplete

**Quest Data Structure:**
```json
{
  "artifact_type_ids": ["uuid-moonlight", "uuid-electra"],
  "target_counts": {
    "uuid-moonlight": 2,
    "uuid-electra": 3
  },
  "current_counts": {
    "uuid-moonlight": 2,
    "uuid-electra": 1
  }
}
```

---

## 🔁 Artifact Respawn

**New feature:** Artifacts can respawn after pickup.

**Configuration (per artifact spawn):**
- **Enable Respawn** (checkbox)
- **Delay** (minutes, default: 30)
- **Random Radius** (meters, default: 50)

**Behavior:**
1. Player picks up artifact
2. Artifact state → `respawning`
3. After delay, artifact respawns at random location within radius
4. Artifact state → `hidden` (visible again)

**Quest integration:**
- Quest "Collect 3 Moonlight" can be completed by picking up same artifact 3 times
- Quest marker updates when artifact respawns

**See:** `artifact-respawn-spec.md` for full details

---

## 🛠️ API Endpoints

### Player:
```
GET    /api/quests                    # List available
GET    /api/quests/active             # List active
GET    /api/quests/completed          # List completed
GET    /api/quests/{id}               # Details
POST   /api/quests/{id}/accept        # Accept
POST   /api/quests/{id}/claim         # Claim completion
POST   /api/quests/{id}/cancel        # Cancel
POST   /api/quests/create             # Create (bartenders only)
```

### Admin:
```
GET    /api/admin/quests              # List all
POST   /api/admin/quests              # Create
PUT    /api/admin/quests/{id}         # Edit
DELETE /api/admin/quests/{id}         # Delete
POST   /api/admin/quests/{id}/confirm # Confirm completion
GET    /api/admin/quests/{id}/progress # Progress for all players
```

---

## 📝 Implementation Checklist

### Phase 1: Database (1 hour)
- [ ] Create migration `005_quest_system.sql`
- [ ] Extend `contracts` table
- [ ] Create `quest_progress_events` table
- [ ] Create `npc_reputation` table
- [ ] Extend `traders` table
- [ ] Create migration `006_artifact_respawn.sql`
- [ ] Extend `artifacts` table
- [ ] Run migrations on RDS

### Phase 2: Backend Core (4 hours)
- [ ] `src/utils/quest.py` - Quest progress tracking utilities
- [ ] `src/utils/reputation.py` - Reputation calculation
- [ ] `src/handlers/quests.py` - Quest CRUD + progress
- [ ] Update `src/handlers/artifacts.py` - Hook quest progress on pickup
- [ ] Update `src/handlers/players.py` - Hook quest progress on death + fail quests
- [ ] Update `src/handlers/location.py` - Hook quest progress on location update
- [ ] Update `src/handlers/trade.py` - Apply reputation discount

### Phase 3: Backend Respawn (2 hours)
- [ ] `src/utils/artifact_respawn.py` - Random location generation
- [ ] Update `src/handlers/artifacts.py` - Set respawn state on pickup
- [ ] Update `src/handlers/location.py` - Check respawn activation
- [ ] Update `src/handlers/admin.py` - Respawn fields in spawn endpoint

### Phase 4: API Endpoints (3 hours)
- [ ] Player quest endpoints (8 endpoints)
- [ ] Admin quest endpoints (5 endpoints)
- [ ] Update SAM template with new routes

### Phase 5: Frontend PDA (8 hours)
- [ ] Rename "Contracts" → "Quests" in UI
- [ ] `pages/QuestsPage.tsx` - Tabs (Available, Active, Completed)
- [ ] `components/QuestCard.tsx` - Quest list item
- [ ] `components/QuestDetailsModal.tsx` - Quest details
- [ ] `pages/CreateQuestPage.tsx` - Bartender quest creation
- [ ] Update `pages/MapPage.tsx` - Quest markers
- [ ] Update `stores/questStore.ts` - Quest state management

### Phase 6: Admin Panel (4 hours)
- [ ] `pages/QuestsPage.tsx` - Quest management
- [ ] `components/QuestForm.tsx` - Create/edit quest
- [ ] `components/QuestProgressView.tsx` - View player progress
- [ ] Update `pages/ArtifactsPage.tsx` - Respawn fields in spawn form

### Phase 7: Testing (4 hours)
- [ ] Unit tests: Quest progress tracking
- [ ] Unit tests: Reputation calculation
- [ ] Unit tests: Artifact respawn logic
- [ ] Integration tests: Full quest lifecycle
- [ ] E2E tests: Player completes quest
- [ ] E2E tests: Death fails quests
- [ ] E2E tests: Artifact respawn cycle

**Total:** ~26 hours (~1 week)

---

## 🚨 Critical Implementation Notes

### 1. Death Handler Integration
```python
# In src/handlers/players.py::death_handler
# After processing death, fail all active quests:
cursor.execute("""
    UPDATE contracts 
    SET failed = TRUE, 
        failed_reason = 'player_death',
        status = 'failed'
    WHERE accepted_by = %s 
      AND status = 'accepted'
      AND failed = 0
""", (player_id,))
```

### 2. Artifact Quest Tracking
```python
# In src/handlers/artifacts.py::pickup_handler
# After successful pickup, check artifact quests:
update_quest_progress(player_id, 'artifact_pickup', {
    'artifact_type_id': artifact_type_id
})
```

### 4. Patrol Quest Tracking
```python
# In src/handlers/location.py::update_location_handler
# On every location update, check patrol/visit quests:
update_quest_progress(player_id, 'location_update', {
    'lat': lat,
    'lng': lng,
    'delta_time_seconds': delta_time
})
```

### 5. Reputation Discount
```python
# In src/handlers/trade.py::calculate_price
def calculate_commission_discount(player_id, trader_id):
    # Check NPC-specific reputation
    npc_rep = get_npc_reputation(player_id, trader_id)
    if npc_rep:
        return min(100, npc_rep / 100)
    
    # Check faction-wide reputation
    trader_faction = get_trader_faction(trader_id)
    if trader_faction:
        faction_rep = get_faction_reputation(player_id, trader_faction)
        return min(100, faction_rep / 100)
    
    return 0
```

### 6. Artifact Respawn Check
```python
# In src/handlers/location.py::update_location_handler
# Check if any artifacts ready to respawn:
cursor.execute("""
    SELECT id, latitude, longitude
    FROM artifacts
    WHERE state = 'respawning'
      AND spawned_at <= NOW()
""")

for artifact in cursor.fetchall():
    cursor.execute("""
        UPDATE artifacts
        SET state = 'hidden'
        WHERE id = %s
    """, (artifact['id'],))
```

---

## 🧪 Testing Scenarios

### Scenario 1: Simple Quest
1. GM creates quest "Kill 3 bandits"
2. Player accepts quest
3. Player kills 3 bandits (loots QR codes)
4. Player claims completion
5. GM confirms
6. Player receives rewards (money + reputation)

### Scenario 2: Death Fails Quest
1. Player accepts quest "Collect 5 artifacts"
2. Player collects 2 artifacts (progress 2/5)
3. Player dies
4. Quest fails automatically
5. Progress lost

### Scenario 3: Artifact Respawn
1. GM spawns Moonlight with respawn (30 min, 50m radius)
2. Player picks up artifact
3. Artifact enters `respawning` state
4. After 30 min, artifact respawns at new location
5. Player picks up again
6. Repeat

### Scenario 4: Patrol Quest
1. GM creates patrol quest (3 checkpoints, 15 min total)
2. Player accepts quest
3. Player visits checkpoint 1 (stays 5 min)
4. Player visits checkpoint 2 (stays 10 min)
5. All checkpoints visited + 15 min accumulated
6. Quest auto-completes

### Scenario 5: Reputation Discount
1. Player has 0 reputation with Sidorovich
2. Player completes quest from Sidorovich (+100 rep)
3. Player now has 100 rep = 1% discount
4. Player completes 49 more quests (+4,900 rep)
5. Player now has 5,000 rep = 50% discount

---

## 📚 Related Specs

- `quest-system-spec.md` - Full quest system specification (50+ pages)
- `artifact-respawn-spec.md` - Artifact respawn mechanics (20+ pages)
- `specs/game-mechanics/FINAL-SPEC.md` - Original contract system
- `specs/trading-system-spec.md` - Trading mechanics (for reputation integration)

---

**Ready to start? Begin with Phase 1 (Database migrations).**
