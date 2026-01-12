# Quest System Specification v1.0

**Status:** Draft for MVP implementation  
**Date:** 2026-01-11  
**Related:** Contracts system (existing), Trading system, Reputation system (new)

---

## 1. Overview

**Quest System = Enhanced Contracts with:**
- Multiple objective types (kill, collect, patrol, deliver)
- Progress tracking (automatic)
- Reputation rewards (NPC/Faction-based)
- Item rewards (equipment, artifacts, consumables)
- Quest failure conditions (death, timeout)
- Bartender quest creation (simplified UI)

**Key Principle:** Quests ARE contracts in the database. "Quest" is the UI/UX term for player-facing missions.

---

## 2. Quest Types & Objectives

### 2.1 Quest Types

| Type | Objective | Auto-tracking | Completion |
|------|-----------|---------------|------------|
| **elimination** | Kill N players of faction X | ✅ Death events | GM/Bartender confirms |
| **artifact_collection** | Collect N artifacts of type Y | ✅ Artifact pickups | GM/Bartender confirms |
| **delivery** | Deliver item to NPC/coordinates | ❌ Manual | GM/Bartender confirms |
| **patrol** | Visit N checkpoints, spend M minutes total | ✅ Location tracking | Auto-complete |
| **visit** | Reach specific coordinates | ✅ Location tracking | Auto-complete |

### 2.2 Objective Details

#### Elimination
```json
{
  "type": "elimination",
  "target_faction": "bandit",
  "target_count": 3,
  "current_count": 0
}
```
- Tracks kills via death events (when player loots victim's QR code)
- Progress: `current_count / target_count`
- Completion: When `current_count >= target_count` + confirmation
- **Note:** Kill counts only when killer loots the victim (QR scan required)

#### Artifact Collection
```json
{
  "type": "artifact_collection",
  "artifact_type_id": "uuid-moonlight",
  "target_count": 5,
  "current_count": 0
}
```
- Tracks artifact pickups automatically (counter increments on pickup)
- Player does NOT need to keep artifacts in inventory (can sell/drop after pickup)
- Progress: `current_count / target_count`
- Completion: When `current_count >= target_count` + confirmation
- **Map marker:** 50m radius circle around artifact spawn (not exact location)
- **Respawn integration:** If artifact has respawn enabled, marker disappears when picked up, reappears when respawned at new location (see `artifact-respawn-spec.md`)

#### Delivery
```json
{
  "type": "delivery",
  "item_id": "uuid-medkit",
  "delivery_to_npc": "sidorovich",
  "delivery_lat": 50.123456,
  "delivery_lng": 30.654321,
  "delivery_radius": 10
}
```
- Manual confirmation by GM/Bartender
- Player must:
  1. Reach coordinates (within `delivery_radius`)
  2. Have item in inventory
- **UI:** "Claim Completion" button enabled only when both conditions met
- **Map marker:** Exact coordinates with radius

#### Patrol
```json
{
  "type": "patrol",
  "checkpoints": [
    {"lat": 50.123, "lng": 30.456, "radius": 30, "visited": false},
    {"lat": 50.124, "lng": 30.457, "radius": 30, "visited": false},
    {"lat": 50.125, "lng": 30.458, "radius": 30, "visited": false}
  ],
  "required_time_minutes": 15,
  "accumulated_time_seconds": 0,
  "checkpoint_visits": []
}
```
- **Tracking logic:**
  - Player must visit ALL checkpoints (within 30m radius)
  - Total time spent in ANY checkpoint area accumulates
  - Time counts even if player turns off phone (entry/exit timestamps)
  - Completion: All checkpoints visited + `accumulated_time >= required_time`
- **Map markers:** Multiple circles (30m radius each)
- **Auto-complete:** When conditions met

#### Visit
```json
{
  "type": "visit",
  "target_lat": 50.123456,
  "target_lng": 30.654321,
  "target_radius": 20,
  "visited": false
}
```
- Simple: reach coordinates once
- **Auto-complete:** When player enters radius
- **Map marker:** Exact coordinates with radius

---

## 3. Database Schema

### 3.1 Extend `contracts` Table

**Add columns:**
```sql
ALTER TABLE contracts
ADD COLUMN quest_type ENUM(
  'elimination', 
  'artifact_collection', 
  'delivery', 
  'patrol', 
  'visit'
) NULL COMMENT 'Quest-specific type (NULL for old contracts)',

ADD COLUMN quest_data JSON NULL COMMENT 'Quest objectives and progress',

ADD COLUMN auto_complete BOOLEAN DEFAULT FALSE COMMENT 'Auto-complete when objectives met',

ADD COLUMN failed BOOLEAN DEFAULT FALSE COMMENT 'Quest failed (death, timeout)',

ADD COLUMN failed_reason VARCHAR(255) NULL COMMENT 'Why quest failed';
```

**Indexes:**
```sql
CREATE INDEX idx_quest_type ON contracts(quest_type);
CREATE INDEX idx_auto_complete ON contracts(auto_complete);
CREATE INDEX idx_failed ON contracts(failed);
```

### 3.2 New Table: `quest_progress_events`

Track detailed progress for debugging/analytics:

```sql
CREATE TABLE quest_progress_events (
    id VARCHAR(36) PRIMARY KEY,
    quest_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    event_type ENUM(
      'accepted', 
      'progress', 
      'completed', 
      'failed', 
      'cancelled'
    ) NOT NULL,
    
    -- Progress details
    progress_data JSON NULL COMMENT 'Snapshot of quest_data at event time',
    
    -- Context
    event_reason VARCHAR(255) NULL COMMENT 'e.g., "player_death", "timeout", "checkpoint_reached"',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quest_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_quest (quest_id),
    INDEX idx_player (player_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 New Table: `npc_reputation`

Track reputation with NPCs and factions:

```sql
CREATE TABLE npc_reputation (
    id VARCHAR(36) PRIMARY KEY,
    player_id VARCHAR(36) NOT NULL,
    
    -- Reputation target
    npc_id VARCHAR(36) NULL COMMENT 'Specific NPC trader (if not faction-wide)',
    faction ENUM('stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner') NULL,
    
    -- Reputation value
    reputation INT DEFAULT 0 COMMENT 'Reputation points (-1000 to +1000)',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id) REFERENCES traders(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_player_npc (player_id, npc_id),
    UNIQUE KEY unique_player_faction (player_id, faction),
    
    INDEX idx_player (player_id),
    INDEX idx_npc (npc_id),
    INDEX idx_faction (faction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Reputation effects:**
- **Commission discount:** `discount_pct = min(20, reputation / 50)` (max 20% at 1000 rep)
- **NPC-specific:** Applies only to that trader
- **Faction-wide:** Applies to all traders of that faction

### 3.4 Extend `traders` Table

```sql
ALTER TABLE traders
ADD COLUMN faction ENUM('stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner') NULL COMMENT 'Trader faction (NULL = independent)';
```

**Note:** `can_create_quests` is NOT needed. Logic:
- **Live bartenders** (players with `is_bartender` role) can always create quests in PDA
- **NPC traders** cannot create quests themselves; GM assigns quests to them in Admin panel

---

## 4. Quest Lifecycle

### 4.1 Creation

**Who can create:**
- ✅ **GM (Admin panel)** - Full control, all types, can assign quests to NPC traders
- ✅ **Live Bartender (PDA)** - Simplified UI, creates quests as themselves (`issuer_id = bartender_player_id`)
- ❌ **NPC traders** - Cannot create quests; GM assigns existing quests to them
- ❌ **Regular players** - Not in MVP (but schema supports it)

**Live Bartender creation flow (PDA):**
1. Open "Create Quest" page (only visible if player has `is_bartender` role)
2. Select type from dropdown (elimination, artifact_collection, delivery, patrol, visit)
3. Fill simple form:
   - Title, description
   - Reward (money, items, reputation)
   - Objectives (type-specific fields)
   - Expiration time (optional)
   - Faction restriction (optional)
4. Submit → Quest created with `issuer_id = bartender_player_id`
5. Quest appears in "Available Quests" for all players (or faction-restricted)

**GM creation (Admin panel):**
- Full control over all fields
- Can set `issuer_id` to:
  - GM themselves
  - Any NPC trader (from `traders` table)
  - Any live bartender (from `players` with `is_bartender` role)
- Can set `auto_complete = true` for patrol/visit quests
- Can assign multiple quests to same NPC trader

**Quest assignment to NPC:**
- GM creates quest in Admin → selects "Issuer: Sidorovich (NPC)"
- Quest appears in player PDA as "Quest from Sidorovich"
- Reputation reward goes to Sidorovich's reputation pool

### 4.2 Acceptance

**Player flow:**
1. Browse "Available Quests" page
2. Click quest → see details (objectives, rewards, map markers)
3. Click "Accept" → Quest moves to "Active Quests"

**Backend:**
```sql
UPDATE contracts 
SET status = 'accepted', 
    accepted_by = :player_id, 
    accepted_at = NOW()
WHERE id = :quest_id 
  AND status = 'available'
  AND (faction_restriction IS NULL OR faction_restriction = :player_faction);
```

**Restrictions:**
- Max 5 active quests per player (configurable)
- Faction restrictions apply
- Cannot accept if already accepted

### 4.3 Progress Tracking

**Automatic tracking triggers:**

| Event | Quest Types Affected | Action |
|-------|---------------------|--------|
| **Player death (looting)** | elimination | Increment `current_count` if victim matches `target_faction` |
| **Artifact pickup** | artifact_collection | Increment `current_count` if artifact matches `artifact_type_id` |
| **Location update** | patrol, visit | Check if player entered checkpoint/target radius |
| **Location update** | patrol | Accumulate time spent in checkpoint areas |

**Progress update flow:**
1. Event occurs (e.g., artifact pickup)
2. Backend queries active quests for player: `SELECT * FROM contracts WHERE accepted_by = :player_id AND status = 'accepted' AND failed = 0`
3. For each quest, check if event matches objectives
4. Update `quest_data` JSON (increment counters, mark checkpoints)
5. Insert `quest_progress_events` record
6. If `auto_complete = true` AND objectives met → auto-complete quest

**Patrol tracking details:**
```python
# Pseudocode for patrol tracking
def update_patrol_progress(quest, player_location, delta_time_seconds):
    checkpoints = quest['quest_data']['checkpoints']
    
    # Check which checkpoint player is in (if any)
    current_checkpoint = None
    for cp in checkpoints:
        if distance(player_location, cp) <= cp['radius']:
            current_checkpoint = cp
            break
    
    # Accumulate time if in any checkpoint
    if current_checkpoint:
        quest['quest_data']['accumulated_time_seconds'] += delta_time_seconds
        
        # Mark checkpoint as visited
        if not current_checkpoint['visited']:
            current_checkpoint['visited'] = True
            quest['quest_data']['checkpoint_visits'].append({
                'checkpoint_index': checkpoints.index(current_checkpoint),
                'visited_at': now()
            })
    
    # Check completion
    all_visited = all(cp['visited'] for cp in checkpoints)
    time_met = quest['quest_data']['accumulated_time_seconds'] >= quest['quest_data']['required_time_minutes'] * 60
    
    if all_visited and time_met and quest['auto_complete']:
        complete_quest(quest)
```

**Time tracking with phone off:**
- Store `last_checkpoint_entry_time` when player enters checkpoint
- On next location update, calculate `time_in_checkpoint = now - last_checkpoint_entry_time`
- Add to `accumulated_time_seconds`
- Works even if hours pass between updates

### 4.4 Completion

**Manual completion (GM/Bartender):**
1. Player claims quest is done (button in PDA)
2. GM/Bartender sees notification
3. Reviews quest (checks inventory, confirms action)
4. Clicks "Confirm Completion"
5. Rewards distributed automatically

**Auto-completion:**
- For `patrol` and `visit` types
- When objectives met, quest auto-completes
- Rewards distributed immediately
- No confirmation needed

**Backend:**
```sql
UPDATE contracts 
SET status = 'completed', 
    completed_at = NOW()
WHERE id = :quest_id 
  AND status = 'accepted';

-- Distribute rewards
UPDATE players 
SET balance = balance + :reward_money,
    total_contracts_completed = total_contracts_completed + 1
WHERE id = :player_id;

-- Add reputation
INSERT INTO npc_reputation (player_id, npc_id, faction, reputation)
VALUES (:player_id, :npc_id, :faction, :reputation_reward)
ON DUPLICATE KEY UPDATE reputation = reputation + :reputation_reward;

-- Add item rewards (if any)
INSERT INTO player_items (player_id, item_id, quantity)
VALUES (:player_id, :item_id, :quantity)
ON DUPLICATE KEY UPDATE quantity = quantity + :quantity;
```

### 4.5 Failure

**Failure conditions:**
1. **Player death** → ALL active quests fail immediately
2. **Quest timeout** → Quest expires (if `expires_at` set)
3. **Manual cancellation** → Player cancels quest (no penalty)

**On failure:**
```sql
UPDATE contracts 
SET failed = TRUE, 
    failed_reason = :reason,
    status = 'failed'
WHERE accepted_by = :player_id 
  AND status = 'accepted';

-- Log event
INSERT INTO quest_progress_events (quest_id, player_id, event_type, event_reason)
VALUES (:quest_id, :player_id, 'failed', :reason);
```

**Death triggers quest failure:**
- Hook into death handler (`src/handlers/players.py::death_handler`)
- After processing death, fail all active quests:
```python
# In death handler
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

---

## 5. Rewards System

### 5.1 Reward Types

**Money:**
```json
{
  "reward_money": 1000
}
```

**Items:**
```json
{
  "reward_items": [
    {"item_id": "uuid-medkit", "quantity": 3},
    {"item_id": "uuid-anti-rad", "quantity": 1}
  ]
}
```

**Reputation:**
```json
{
  "reward_reputation": {
    "target_type": "npc",  // or "faction"
    "target_id": "uuid-sidorovich",  // or faction name
    "amount": 50
  }
}
```

**Combined:**
```json
{
  "reward_money": 1500,
  "reward_items": [
    {"item_id": "uuid-armor-tier2", "quantity": 1}
  ],
  "reward_reputation": {
    "target_type": "faction",
    "target_id": "duty",
    "amount": 100
  }
}
```

### 5.2 Reputation Mechanics

**Reputation ranges:**
- `-10000` to `+10000`
- Default: `0` (neutral)
- Typical quest reward: `+50` to `+200` reputation

**Reputation effects on trading:**
```python
def calculate_commission_discount(player_id, trader_id):
    # Check NPC-specific reputation
    npc_rep = get_npc_reputation(player_id, trader_id)
    if npc_rep:
        # Max 100% discount (no commission) at 10,000 rep
        # 1% discount per 100 reputation points
        return min(100, npc_rep / 100)
    
    # Check faction-wide reputation
    trader_faction = get_trader_faction(trader_id)
    if trader_faction:
        faction_rep = get_faction_reputation(player_id, trader_faction)
        # Same formula: 1% per 100 rep, max 100% at 10,000 rep
        return min(100, faction_rep / 100)
    
    return 0  # No discount
```

**Reputation progression:**
- **0 rep** → 0% discount (full commission)
- **1,000 rep** → 10% discount (~10 quests at +100 rep each)
- **5,000 rep** → 50% discount (~50 quests)
- **10,000 rep** → 100% discount (base prices, no commission) (~100 quests)

**Reputation display:**
- In trader UI: "Reputation: +1,250 (12.5% discount)"
- In profile: List all NPC/faction reputations

---

## 6. UI/UX Specification

### 6.1 Player PDA Pages

#### "Quests" Page (replaces/extends "Contracts")

**Tabs:**
1. **Available** - Quests player can accept
2. **Active** - Accepted quests in progress
3. **Completed** - Finished quests (history)

**Quest card (list view):**
```
┌─────────────────────────────────────┐
│ 🎯 Hunt the Bandits                 │
│ Issuer: Sidorovich                  │
│ Reward: 💰 1,500 | +50 Rep (Loner)  │
│ Progress: 2/5 bandits killed        │
│ Expires: 2h 15m                     │
│ [View Details] [Cancel]             │
└─────────────────────────────────────┘
```

**Quest details modal:**
```
┌─────────────────────────────────────┐
│ 🎯 Hunt the Bandits                 │
├─────────────────────────────────────┤
│ Issuer: Sidorovich (Loner)          │
│                                     │
│ Description:                        │
│ "Clear the area of bandit scum.     │
│  Bring me proof of 5 kills."        │
│                                     │
│ Objectives:                         │
│ ☑ Kill 5 bandits (2/5)              │
│                                     │
│ Rewards:                            │
│ • 💰 1,500 credits                  │
│ • +50 Reputation (Loner faction)    │
│                                     │
│ Expires: Jan 11, 18:30              │
│                                     │
│ [Show on Map] [Claim Completion]    │
│ [Cancel Quest]                      │
└─────────────────────────────────────┘
```

**Map integration:**
- Quest markers show on map (different colors per type)
- Click marker → open quest details
- Artifact collection: 50m radius circle (not exact location)
- Patrol: Multiple checkpoint circles (30m each)
- Visit/Delivery: Exact coordinates with radius

#### "Create Quest" Page (Bartenders only)

**Simple form:**
```
┌─────────────────────────────────────┐
│ Create New Quest                    │
├─────────────────────────────────────┤
│ Quest Type:                         │
│ ○ Elimination                       │
│ ○ Artifact Collection               │
│ ○ Delivery                          │
│ ○ Patrol                            │
│ ○ Visit Location                    │
│                                     │
│ Title: [________________]           │
│                                     │
│ Description:                        │
│ [_____________________________]     │
│ [_____________________________]     │
│                                     │
│ --- Objectives (dynamic) ---        │
│ [Type-specific fields]              │
│                                     │
│ --- Rewards ---                     │
│ Money: [_____] credits              │
│ Items: [+ Add Item]                 │
│ Reputation: [_____] points          │
│                                     │
│ Faction Restriction:                │
│ [None ▼]                            │
│                                     │
│ Expires In: [24] hours              │
│                                     │
│ [Create Quest] [Cancel]             │
└─────────────────────────────────────┘
```

**Type-specific fields:**

**Elimination:**
```
Target Faction: [Bandit ▼]
Kill Count: [5]
```

**Artifact Collection:**
```
Artifact Type: [Moonlight ▼]
Quantity: [3]
```

**Delivery:**
```
Item: [Medkit ▼]
Deliver To: [Sidorovich ▼] or [Custom Coordinates]
Coordinates: [Click Map to Set]
Radius: [10] meters
```

**Patrol:**
```
Checkpoints: 
  1. [50.123, 30.456] (30m) [Remove]
  2. [50.124, 30.457] (30m) [Remove]
  [+ Add Checkpoint] (click map)

Required Time: [15] minutes
```

**Visit:**
```
Target Location: [Click Map to Set]
Coordinates: [50.123, 30.456]
Radius: [20] meters
```

### 6.2 Admin Panel (GM)

#### "Quests" Page

**Features:**
- View all quests (available, active, completed, failed)
- Create quests (full control, all fields)
- Edit/delete quests
- Confirm quest completions
- View quest progress for all players

**Quest management table:**
```
┌──────────────────────────────────────────────────────────────┐
│ ID      │ Title           │ Type      │ Issuer  │ Status    │
├──────────────────────────────────────────────────────────────┤
│ abc-123 │ Hunt Bandits    │ Elim.     │ Sido    │ Active(3) │
│ def-456 │ Collect Moonly. │ Artifact  │ GM      │ Available │
│ ghi-789 │ Patrol Zone A   │ Patrol    │ Barman  │ Completed │
└──────────────────────────────────────────────────────────────┘
```

**Quest details view:**
- Full quest data (JSON)
- Progress for all players who accepted
- Completion confirmation button
- Edit/delete buttons

---

## 7. API Endpoints

### 7.1 Player Endpoints

```
GET    /api/quests                    # List available quests
GET    /api/quests/active             # List player's active quests
GET    /api/quests/completed          # List player's completed quests
GET    /api/quests/{id}               # Get quest details
POST   /api/quests/{id}/accept        # Accept quest
POST   /api/quests/{id}/claim         # Claim completion (manual quests)
POST   /api/quests/{id}/cancel        # Cancel quest
POST   /api/quests/create             # Create quest (bartenders only)
```

### 7.2 Admin Endpoints

```
GET    /api/admin/quests              # List all quests
POST   /api/admin/quests              # Create quest (full control)
PUT    /api/admin/quests/{id}         # Edit quest
DELETE /api/admin/quests/{id}         # Delete quest
POST   /api/admin/quests/{id}/confirm # Confirm completion
GET    /api/admin/quests/{id}/progress # Get progress for all players
```

### 7.3 Internal (Progress Tracking)

These are called internally by other handlers:

```python
# In src/handlers/artifacts.py (pickup handler)
update_quest_progress(player_id, 'artifact_pickup', {
    'artifact_type_id': artifact_type_id
})

# In src/handlers/players.py (death handler)
update_quest_progress(killer_id, 'player_kill', {
    'victim_faction': victim_faction
})

# In src/handlers/location.py (location update)
update_quest_progress(player_id, 'location_update', {
    'lat': lat,
    'lng': lng,
    'delta_time_seconds': delta_time
})
```

---

## 8. Implementation Priority (MVP)

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Database migrations (extend contracts, add tables)
2. ✅ Backend: Quest progress tracking utilities
3. ✅ Backend: Reputation system
4. ✅ API endpoints (player + admin)

### Phase 2: Quest Types (Week 2)
1. ✅ Elimination quests (simplest)
2. ✅ Artifact collection quests
3. ✅ Visit quests (auto-complete)
4. ⏳ Delivery quests
5. ⏳ Patrol quests (most complex)

### Phase 3: UI (Week 3)
1. ✅ Player PDA: Quests page (tabs, list, details)
2. ✅ Player PDA: Map markers for quests
3. ✅ Bartender: Create quest page (simplified)
4. ✅ Admin: Quest management page

### Phase 4: Polish (Week 4)
1. ✅ Death → fail all quests integration
2. ✅ Reputation display in trader UI
3. ✅ Quest notifications (WebSocket)
4. ✅ Testing & bug fixes

---

## 9. Critical Questions & Decisions

### ✅ Resolved

1. **Quests vs Contracts:** Quests ARE contracts (same table, UI term difference)
2. **Stages:** Not in MVP (single-objective quests only)
3. **Auto-tracking:** Yes for elimination, artifact, patrol, visit
4. **Failure on death:** Yes, all active quests fail
5. **Reputation:** NPC-specific or faction-wide, affects trading commissions
6. **Bartender creation:** Yes, simplified UI in PDA

### ⚠️ Needs Clarification

1. ✅ **Patrol time tracking:** Total time across ALL checkpoints (not per checkpoint)

2. ✅ **Artifact collection:** Just pick up (counter increments, can sell/drop after)

3. ✅ **Elimination:** Must LOOT victim (QR scan) to count kill

4. ✅ **Quest rewards:** Can include any item_id (GM creates item first if needed)

5. ✅ **Max active quests:** 5 active quests max per player (configurable)

6. ✅ **Quest expiration:** Quest fails, progress lost, no penalty

7. ✅ **Reputation scale:** -10,000 to +10,000 (1% discount per 100 rep, max 100% at 10,000 rep)

8. ✅ **Bartender quest creation:** Live bartenders can create quests in PDA; NPC traders cannot create, only receive quests assigned by GM

9. ✅ **Artifact respawn:** Enabled per artifact spawn, see `artifact-respawn-spec.md` for full details

---

## 10. Testing Checklist

### Unit Tests
- [ ] Quest progress tracking (all types)
- [ ] Reputation calculation
- [ ] Commission discount formula
- [ ] Patrol time accumulation
- [ ] Death → fail quests

### Integration Tests
- [ ] Accept quest → track progress → complete
- [ ] Accept quest → die → quest fails
- [ ] Create quest (bartender) → appears in available
- [ ] Complete quest → rewards distributed
- [ ] Reputation affects trader prices

### E2E Tests
- [ ] Full quest lifecycle (player perspective)
- [ ] Bartender creates quest → player completes
- [ ] GM confirms manual quest completion
- [ ] Map markers show correctly
- [ ] Quest notifications work

---

## 11. Future Enhancements (Post-MVP)

1. **Multi-stage quests** (quest chains)
2. **AI NPC dialogue** (quest givers with personality)
3. **Daily/weekly repeatable quests**
4. **Quest prerequisites** (unlock quests after completing others)
5. **Shared quests** (multiple players work together)
6. **Quest leaderboards** (most quests completed)
7. **Dynamic quest generation** (AI creates quests based on game state)
8. **Quest rewards: experience points** (leveling system)

---

## 12. Notes for Implementation

### Database Migration Order
1. `005_quest_system.sql` - Extend contracts, add tables
2. Seed data: Create 3-5 example quests for testing

### Backend Handler Changes
- `src/handlers/artifacts.py` - Add quest progress hook on pickup
- `src/handlers/players.py` - Add quest progress hook on death + fail quests on death
- `src/handlers/location.py` - Add quest progress hook on location update
- `src/handlers/quests.py` - NEW handler for quest CRUD + progress tracking

### Frontend Changes
- Rename "Contracts" → "Quests" in UI
- Add quest type icons (🎯 elimination, 📦 collection, 🚶 patrol, etc.)
- Add map markers for quest objectives
- Add "Create Quest" page for bartenders

### Admin Panel Changes
- Add "Quests" page (similar to Contracts, but with progress view)
- Add quest confirmation workflow
- Add reputation management view

---

**End of Specification**

**Next Steps:**
1. Review this spec with team
2. Answer critical questions (§9)
3. Create database migration
4. Implement Phase 1 (core infrastructure)
