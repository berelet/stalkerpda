# Inventory System Specification v2.0

**Date:** 2026-01-03  
**Status:** FINAL  
**Supersedes:** Equipment sections in game-mechanics/FINAL-SPEC.md

---

## Overview

Inventory system with equipment slots and backpack storage. Only equipped items provide bonuses.

---

## 1. Inventory Structure

### 1.1 Equipment Slots (4 total)
- **1x Armor slot** - provides wound protection
- **2x Addon slots** (addon1, addon2) - armor addons for radiation resistance
- **1x Artifact slot** - provides special bonuses (lives, radiation resist, etc.)

### 1.2 Backpack
- **Capacity:** 50 items (equipment slots NOT counted in limit)
- **Contents:** Artifacts, equipment, consumables
- **Each item = 1 slot** (no stacking)

### 1.3 Total Capacity
- Maximum items: **54** (4 equipped + 50 backpack)

---

## 2. Equipment Mechanics

### 2.1 Equipping Items

**Rules:**
- Click item → context menu appears with options:
  - **Details** - show photo, description, stats
  - **Equip** (if in backpack) / **Unequip** (if equipped)
  - **Use** (if consumable: anti-rad, medicine)
  - **Drop** - permanent deletion
  - **Sell** - only if in backpack
- If slot occupied → replaced item goes to backpack
- If backpack full → error "Inventory full"

**Slot Assignment:**
- Armor → armor slot
- Addon → addon1 (if empty), else addon2 (if empty), else replaces addon1
- Artifact → artifact slot
- Consumables → cannot be equipped (use from backpack)

**Manual Unequip:**
- Player can manually unequip any item to backpack
- Requires free space in backpack

### 2.2 Bonuses

**Active Bonuses (only from equipped items):**
- Armor: `+1 to +3 wounds`, optional `radiation_resist %`
- Addons: `10-30% radiation_resist` each (stacks)
- Artifacts: `bonusLives`, `radiationResist %`, other effects

**Total Bonuses Calculation:**
```
totalWounds = armorBonusWounds
totalRadResist = armorRadResist + addon1RadResist + addon2RadResist + artifactRadResist
totalBonusLives = artifactBonusLives
```

**UI Display:**
- Show total wounds: `Wounds: +3`
- Show total radiation resist: `Rad Resist: 65%`
- Show bonus lives: `Lives: 3 (+1)` (base + bonus)

---

## 3. Lives System with Equipment

### 3.1 Bonus Lives Mechanics

**Equipping item with bonusLives:**
```
currentLives += bonusLives
```

**Unequipping item with bonusLives:**
```
currentLives -= bonusLives
```

**Critical Rules:**
1. Bonus lives can resurrect player from 0 lives
   - `currentLives = 0` + equip artifact `bonusLives=1` → `currentLives = 1` (alive, can leave bar)
2. Unequipping can kill player
   - `currentLives = 1` + unequip artifact `bonusLives=1` → `currentLives = 0` (dead, out of lives)
3. Lives can go negative (debt tracking)
   - Player has 2 artifacts: `+1` and `+1` = total `+2`
   - Current lives: 1
   - Unequip both: `1 - 1 - 1 = -1` (dead, cannot resurrect by re-equipping)

**Status Changes:**
- `currentLives > 0` → `status = 'alive'`
- `currentLives <= 0` → `status = 'dead'` (out of lives)

**Permissions:**
- Players with `status='dead'` can still equip/unequip items (to potentially resurrect)

### 3.2 Example Scenarios

**Scenario 1: Resurrection**
```
Initial: currentLives = 0, status = 'dead'
Action: Equip artifact with bonusLives = 1
Result: currentLives = 1, status = 'alive'
```

**Scenario 2: Death by unequip**
```
Initial: currentLives = 1, equipped artifact bonusLives = 1
Action: Unequip artifact
Result: currentLives = 0, status = 'dead'
```

**Scenario 3: Negative lives (debt)**
```
Initial: currentLives = 1
Equipped: artifact1 (+1), artifact2 (+1) [impossible, only 1 slot, but for example]
Action: Unequip both
Result: currentLives = 1 - 1 - 1 = -1, status = 'dead'
Cannot resurrect by re-equipping
```

---

## 4. Item Categories

### 4.1 Armor
```typescript
interface Armor {
  id: staddon;
  name: staddon;
  category: 'armor';
  bonusWounds: number;        // 1-3
  radiationResist: number;    // 0-30%
  basePrice: number;
}
```

**Slot:** armor (1 max)  
**Storage:** `player_equipment` table with `slot_type='armor'` or `'backpack'`

### 4.2 Addons
```typescript
interface Addon {
  id: staddon;
  name: staddon;
  category: 'addon';
  radiationResist: number;    // 10-30%
  basePrice: number;
}
```

**Slots:** addon1, addon2 (2 max)  
**Storage:** `player_equipment` table with `slot_type='addon'` or `'backpack'`

### 4.3 Artifacts
```typescript
interface Artifact {
  id: staddon;              // player_inventory.id (for UI)
  typeId: staddon;          // artifact_types.id
  name: staddon;
  category: 'artifact';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  value: number;
  effects: {
    bonusLives?: number;
    radiationResist?: number;
    otherBonuses?: any;
  };
}
```

**Slot:** artifact (1 max for equipped)  
**Storage:** `player_inventory` table (references `artifact_types.id`)  
**Important:** 
- Artifacts are stored as references to types, not individual instances
- Multiple artifacts of same type stack (quantity field)
- When equipped, one instance is "active" (provides bonuses)
- Inventory v2.0 treats each as separate item (no stacking in UI)

### 4.4 Consumables (Anti-Rads)
```typescript
interface Consumable {
  id: staddon;
  name: staddon;
  category: 'consumable';
  radiationRemoval: number;   // 10-100%
  basePrice: number;
}
```

**Slot:** None (used from backpack)  
**Storage:** `player_equipment` table with `slot_type='backpack'`  
**Usage:** One-time use, removes radiation, then deleted  
**Can use at 0 radiation:** Yes (item still consumed)  
**Cooldown:** None

---

## 5. Inventory Operations

### 5.1 Equip Item
```
Input: itemId, playerId
Validation:
  - Item exists in player's backpack
  - Item is equippable (not consumable)
Logic:
  1. Determine target slot (armor/addon1/addon2/artifact)
  2. If slot occupied:
     - Move current item to backpack
     - Check backpack capacity
  3. Move item to slot
  4. **Recalculate and update cached bonuses**
  5. Update player stats
Output: success, equipped item, replaced item (if any)
```

### 5.2 Unequip Item
```
Input: itemId, playerId
Validation:
  - Item is equipped
  - Backpack has free space
Logic:
  1. Remove bonuses (wounds, rad resist, lives)
  2. Check if currentLives <= 0 after removal
  3. Update status if needed
  4. Move item to backpack
  5. **Recalculate and update cached bonuses**
Output: success, unequipped item, new status
```

### 5.3 Use Consumable
```
Input: itemId, playerId
Validation:
  - Item is consumable
  - Item in backpack
Logic:
  1. Calculate radiation removal
  2. Apply: currentRadiation = max(0, currentRadiation - removal)
  3. Delete item from inventory
Output: success, radiationBefore, radiationAfter, radiationRemoved
```

### 5.4 Drop Item
```
Input: itemId, playerId
Validation:
  - Item exists in inventory (backpack or equipped)
Logic:
  1. If equipped: remove bonuses first
  2. Delete item permanently
  3. **Recalculate and update cached bonuses** (if was equipped)
  4. Update player stats
Output: success
```

### 5.5 Sell Item
```
Input: itemId, playerId
Validation:
  - Item in backpack (NOT equipped)
  - Item is sellable (artifact or equipment)
Logic:
  1. Calculate price with reputation modifier
  2. Add money to player balance
  3. Delete item from inventory
Output: success, price, newBalance
```

### 5.6 Update Cached Bonuses (Internal Function)

**Called automatically after any equipment change**

```python
def update_cached_bonuses(player_id: str, conn):
    """
    Recalculate and update cached bonuses in players table
    Called after: equip, unequip, drop (if equipped), death, looting
    """
    cursor = conn.cursor()
    
    # Calculate equipment bonuses
    cursor.execute("""
        SELECT 
            COALESCE(SUM(et.bonus_wounds), 0) as total_wounds,
            COALESCE(SUM(et.radiation_resist), 0) as total_equipment_rad_resist
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s AND pe.slot_type != 'backpack'
    """, (player_id,))
    
    equipment = cursor.fetchone()
    
    # Calculate artifact bonuses
    cursor.execute("""
        SELECT 
            COALESCE(SUM(at.radiation_resist), 0) as total_artifact_rad_resist,
            COALESCE(SUM(at.bonus_lives), 0) as total_bonus_lives
        FROM player_inventory pi
        JOIN artifact_types at ON pi.item_id = at.id
        WHERE pi.player_id = %s AND pi.item_type = 'artifact' AND pi.slot_type = 'artifact'
    """, (player_id,))
    
    artifacts = cursor.fetchone()
    
    # Update cache
    cursor.execute("""
        UPDATE players
        SET cached_bonus_wounds = %s,
            cached_radiation_resist = %s,
            cached_bonus_lives = %s
        WHERE id = %s
    """, (
        equipment['total_wounds'],
        equipment['total_equipment_rad_resist'] + artifacts['total_artifact_rad_resist'],
        artifacts['total_bonus_lives'],
        player_id
    ))
    
    conn.commit()
```

**Usage in handlers:**
```python
# After equip
equip_item(player_id, item_id, item_type, conn)
update_cached_bonuses(player_id, conn)

# After unequip
unequip_item(player_id, item_id, item_type, conn)
update_cached_bonuses(player_id, conn)

# After death (item loss)
process_death(player_id, conn)
update_cached_bonuses(player_id, conn)

# After looting
transfer_items(victim_id, looter_id, items, conn)
update_cached_bonuses(victim_id, conn)
update_cached_bonuses(looter_id, conn)
```

---

## 6. Death and Looting

### 6.1 Death Item Loss

**Updated Rules:**
- **All items** (equipped + backpack): 1-10% chance to be lost per item
- Lost items deleted permanently
- Remaining items stay in inventory

**Process:**
```
On player death:
  1. For each item in inventory (equipped + backpack):
     - Roll 1-10% chance
     - If lost: delete item
  2. If equipped item lost: remove bonuses
  3. Reset radiation to 0
  4. Decrement currentLives by 1
  5. Update status
```

### 6.2 Looting

**Rules:**
- **All items** (equipped + backpack) can be looted
- Probabilities:
  - Money: 1-50% chance to steal random amount
  - Equipment: 1-5% per item
  - Artifacts: 1-3% per item

**Process:**
```
On QR scan:
  1. Check not already looted this death
  2. For each item:
     - Roll probability
     - If success: transfer to looter
  3. Check looter backpack capacity
  4. Transfer money (random % of victim balance)
  5. Log looting event
```

---

## 7. Backpack Capacity

### 7.1 Limits
- **Backpack:** 50 items
- **Equipped:** 4 slots (not counted in backpack limit)
- **Total:** 54 items maximum

### 7.2 Artifact Stacking
**In Database:**
- Artifacts stored in `player_inventory` with `quantity` field
- Same artifact type can stack (e.g., 3x Moonlight = quantity=3)

**In UI (Inventory v2.0):**
- Each artifact displayed as separate item (no visual stacking)
- 3x Moonlight = 3 separate cards in backpack
- Each takes 1 backpack slot
- This matches "no stacking" rule for capacity calculation

**Example:**
```
Database: player_inventory
- item_id: moonlight-uuid, quantity: 3

UI Display: backpack
- Moonlight #1 (id: moonlight-uuid-0)
- Moonlight #2 (id: moonlight-uuid-1)  
- Moonlight #3 (id: moonlight-uuid-2)

Capacity: 3/50 (each counts as 1 slot)
```

### 7.3 Full Backpack Scenarios

**Pickup artifact from ground:**
- If backpack full (50/50) → Error: "Inventory full"
- Must drop/sell item first

**Unequip item:**
- If backpack full (50/50) → Error: "No space in backpack"
- Must drop/sell item first

**Looting:**
- If looter backpack full → looted items not transferred (lost)

**Buying from bartender:**
- Check backpack space before purchase
- If full → Error: "Inventory full"

---

## 8. Database Schema Updates

### 8.1 Updated `player_equipment` Table

```sql
ALTER TABLE player_equipment
  DROP COLUMN equipped,
  ADD COLUMN slot_type ENUM('backpack', 'armor', 'addon', 'artifact') DEFAULT 'backpack',
  ADD COLUMN slot_position INT DEFAULT 0,  -- 0=backpack, 1=addon1, 2=addon2
  ADD INDEX idx_slot (player_id, slot_type, slot_position);
```

**Slot Mapping:**
- `slot_type='backpack'`, `slot_position=0` → Backpack
- `slot_type='armor'`, `slot_position=0` → Armor slot
- `slot_type='addon'`, `slot_position=1` → Addon slot 1
- `slot_type='addon'`, `slot_position=2` → Addon slot 2
- `slot_type='artifact'`, `slot_position=0` → Artifact slot

### 8.2 Updated `player_inventory` Table

```sql
ALTER TABLE player_inventory
  ADD COLUMN slot_type ENUM('backpack', 'artifact') DEFAULT 'backpack',
  ADD INDEX idx_slot (player_id, item_type, slot_type);
```

**Note:** Artifacts stored in `player_inventory` with `slot_type` field

### 8.3 Updated `players` Table (Cached Bonuses)

```sql
ALTER TABLE players
  ADD COLUMN backpack_capacity INT DEFAULT 50,
  ADD COLUMN cached_bonus_wounds INT DEFAULT 0,
  ADD COLUMN cached_radiation_resist INT DEFAULT 0,
  ADD COLUMN cached_bonus_lives INT DEFAULT 0;
```

**Cached Bonuses System:**
- `cached_bonus_wounds` - Total wounds from equipped armor
- `cached_radiation_resist` - Total radiation resistance from all equipped items
- `cached_bonus_lives` - Total bonus lives from equipped artifacts

**Purpose:**
- Avoid recalculating bonuses on every request (radiation checks, location updates, combat)
- Updated automatically on any equipment change
- Used for game mechanics (radiation damage, death conditions, combat calculations)

**Update Triggers:**
1. **Equip item** → recalculate and update cache
2. **Unequip item** → recalculate and update cache
3. **Death (item loss)** → recalculate and update cache
4. **Looting (item stolen)** → recalculate cache for both victim and looter
5. **Drop item** → recalculate and update cache (if equipped)
6. **Sell item** → recalculate and update cache (if equipped)

### 8.4 Inventory Queries

**Get cached bonuses (FAST - use for game mechanics):**
```sql
SELECT cached_bonus_wounds, cached_radiation_resist, cached_bonus_lives
FROM players
WHERE id = ?;
```

**Recalculate bonuses (on equipment change):**
```sql
-- Step 1: Calculate equipment bonuses
SELECT 
    COALESCE(SUM(et.bonus_wounds), 0) as total_wounds,
    COALESCE(SUM(et.radiation_resist), 0) as total_equipment_rad_resist
FROM player_equipment pe
JOIN equipment_types et ON pe.equipment_type_id = et.id
WHERE pe.player_id = ? AND pe.slot_type != 'backpack';

-- Step 2: Calculate artifact bonuses
SELECT 
    COALESCE(SUM(at.radiation_resist), 0) as total_artifact_rad_resist,
    COALESCE(SUM(at.bonus_lives), 0) as total_bonus_lives
FROM player_inventory pi
JOIN artifact_types at ON pi.item_id = at.id
WHERE pi.player_id = ? AND pi.item_type = 'artifact' AND pi.slot_type = 'artifact';

-- Step 3: Update cache
UPDATE players
SET cached_bonus_wounds = ?,
    cached_radiation_resist = ?,
    cached_bonus_lives = ?
WHERE id = ?;
```

**Get equipped items:**
```sql
SELECT * FROM player_equipment 
WHERE player_id = ? AND slot_type != 'backpack';
```

**Get backpack items:**
```sql
SELECT * FROM player_equipment 
WHERE player_id = ? AND slot_type = 'backpack';
```

**Count backpack items:**
```sql
SELECT COUNT(*) FROM player_equipment 
WHERE player_id = ? AND slot_type = 'backpack';
```

**Get addon slots:**
```sql
SELECT * FROM player_equipment 
WHERE player_id = ? AND slot_type = 'addon' 
ORDER BY slot_position;
```

---

## 9. API Endpoints

### 9.1 GET /api/inventory

Get player's full inventory

**Response:**
```json
{
  "equipped": {
    "armor": {
      "id": "uuid",
      "name": "Heavy Armor",
      "bonusWounds": 3,
      "radiationResist": 10
    },
    "addons": [
      {
        "id": "uuid",
        "name": "Lead Addon",
        "radiationResist": 20,
        "slotPosition": 1
      },
      {
        "id": "uuid",
        "name": "Gold Addon",
        "radiationResist": 15,
        "slotPosition": 2
      }
    ],
    "artifact": {
      "id": "uuid",
      "name": "Moonlight",
      "rarity": "rare",
      "effects": {
        "bonusLives": 1,
        "radiationResist": 20
      }
    }
  },
  "backpack": [
    {
      "id": "uuid",
      "name": "Anti-Rad",
      "category": "consumable",
      "radiationRemoval": 50
    }
  ],
  "capacity": {
    "current": 15,
    "max": 50
  },
  "totalBonuses": {
    "wounds": 3,
    "radiationResist": 65,
    "bonusLives": 1
  }
}
```

### 9.2 POST /api/inventory/equip

Equip item from backpack

**Request:**
```json
{
  "itemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "equipped": {
    "id": "uuid",
    "name": "Heavy Armor",
    "slot": "armor"
  },
  "replaced": {
    "id": "uuid",
    "name": "Light Armor"
  },
  "newBonuses": {
    "wounds": 3,
    "radiationResist": 65,
    "bonusLives": 1
  },
  "currentLives": 4
}
```

**Errors:**
- `400` - Item not in backpack
- `400` - Item not equippable
- `400` - Backpack full (if replacing)

### 9.3 POST /api/inventory/unequip

Unequip item to backpack

**Request:**
```json
{
  "itemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "unequipped": {
    "id": "uuid",
    "name": "Moonlight"
  },
  "newBonuses": {
    "wounds": 3,
    "radiationResist": 45,
    "bonusLives": 0
  },
  "currentLives": 3,
  "status": "alive"
}
```

**Errors:**
- `400` - Item not equipped
- `400` - Backpack full

### 9.4 POST /api/inventory/use

Use consumable

**Request:**
```json
{
  "itemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "itemUsed": "Anti-Rad",
  "radiationBefore": 80,
  "radiationAfter": 30,
  "radiationRemoved": 50
}
```

**Errors:**
- `400` - Item not consumable
- `404` - Item not found

### 9.5 POST /api/inventory/drop

Drop item (permanent deletion)

**Request:**
```json
{
  "itemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "dropped": {
    "id": "uuid",
    "name": "Broken Addon"
  },
  "newBonuses": {
    "wounds": 3,
    "radiationResist": 45,
    "bonusLives": 0
  }
}
```

### 9.6 POST /api/inventory/sell

Sell item to bartender

**Request:**
```json
{
  "itemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "sold": {
    "id": "uuid",
    "name": "Moonlight",
    "basePrice": 2500
  },
  "priceReceived": 2750,
  "newBalance": 12750
}
```

**Errors:**
- `400` - Item equipped (must unequip first)
- `400` - Item not sellable

---

## 10. UI/UX Specifications

### 10.1 Inventory Screen Layout

```
┌─────────────────────────────────────┐
│         INVENTORY                   │
├─────────────────────────────────────┤
│  EQUIPPED                           │
│  ┌─────┐  ┌─────┐  ┌─────┐         │
│  │Armor│  │Addon1│  │Addon2│         │
│  └─────┘  └─────┘  └─────┘         │
│  ┌─────────────┐                    │
│  │  Artifact   │                    │
│  └─────────────┘                    │
│                                     │
│  BONUSES: Wounds +3 | Rad -65%     │
│  Lives: 3 (+1)                      │
├─────────────────────────────────────┤
│  BACKPACK (15/50)                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │Item │ │Item │ │Item │ │Item │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│  ...                                │
└─────────────────────────────────────┘
```

### 10.2 Interactions

**Click item:**
- Context menu appears with options:
  - **Details** - modal with photo, description, full stats
  - **Equip** (if in backpack) / **Unequip** (if equipped)
  - **Use** (if consumable) - shows confirmation "Remove X radiation?"
  - **Drop** - confirmation modal "Delete permanently?"
  - **Sell** (if in backpack) - shows price with reputation

**Visual indicators:**
- Equipped items: highlighted border + slot badge
- Backpack items: normal display
- Full backpack: red indicator "50/50"
- Consumables: "Use" badge
- Sellable items: price tag

---

## 11. Migration Script

```sql
-- Migration: Inventory System v2.0
-- Date: 2026-01-03

-- Update player_equipment table
ALTER TABLE player_equipment
  DROP COLUMN equipped,
  ADD COLUMN slot_type ENUM('backpack', 'armor', 'addon', 'artifact') DEFAULT 'backpack' AFTER equipment_type_id,
  ADD COLUMN slot_position INT DEFAULT 0 AFTER slot_type,
  ADD INDEX idx_slot (player_id, slot_type, slot_position);

-- Update artifacts table
ALTER TABLE artifacts
  ADD COLUMN slot_type ENUM('backpack', 'artifact') DEFAULT 'backpack' AFTER owner_id,
  ADD INDEX idx_artifact_slot (owner_id, slot_type);

-- Update equipment_types: change max_slots for addons
UPDATE equipment_types 
SET max_slots = 2 
WHERE category = 'addon';

-- Add backpack capacity to players table (optional, for future use)
ALTER TABLE players
  ADD COLUMN backpack_capacity INT DEFAULT 50 AFTER current_radiation;
```

---

## 12. Business Rules Summary

### 12.1 Capacity
- ✅ 4 equipment slots (armor, addon1, addon2, artifact)
- ✅ 50 backpack slots
- ✅ Total: 54 items max

### 12.2 Equipping
- ✅ Click to open context menu
- ✅ Menu options: Details, Equip/Unequip, Use, Drop, Sell
- ✅ Details modal with photo, description, stats
- ✅ Auto-replace if slot occupied
- ✅ Replaced item goes to backpack
- ✅ Error if backpack full

### 12.3 Bonuses
- ✅ Only equipped items provide bonuses
- ✅ Bonuses stack (armor + addons + artifact)
- ✅ Lives can go negative (debt tracking)
- ✅ Unequipping can kill player

### 12.4 Consumables
- ✅ Use from backpack (no equipping)
- ✅ One-time use, then deleted
- ✅ Can use at 0 radiation
- ✅ No cooldown

### 12.5 Death & Looting
- ✅ All items: 1-10% loss on death
- ✅ All items: lootable (equipped + backpack)
- ✅ Artifacts: 1-3% loot chance
- ✅ Equipment: 1-5% loot chance

### 12.6 Selling
- ✅ Only from backpack (must unequip first)
- ✅ Price affected by reputation
- ✅ Item deleted, money added

---

## 13. Implementation Checklist

### Backend
- [ ] Update database schema (migration script)
- [ ] Update `player_equipment` queries
- [ ] Update `artifacts` queries
- [ ] Implement equip/unequip logic
- [ ] Implement lives calculation with bonuses
- [ ] Update death handler (1-10% loss)
- [ ] Update looting handler (all items)
- [ ] Add backpack capacity checks
- [ ] Update API endpoints

### Frontend
- [ ] Design inventory UI (slots + backpack)
- [ ] Implement click → context menu (Details, Equip/Unequip, Use, Drop, Sell)
- [ ] Create item details modal (photo, description, stats)
- [ ] Show total bonuses display
- [ ] Show lives with bonus: "3 (+1)"
- [ ] Add backpack capacity indicator
- [ ] Implement consumable usage
- [ ] Add drop/sell confirmations
- [ ] Update profile page with inventory link

### Testing
- [ ] Test equip/unequip flow
- [ ] Test addon slot replacement (addon1 → addon2 → replace addon1)
- [ ] Test lives with artifacts (equip/unequip/death)
- [ ] Test backpack capacity limits
- [ ] Test death item loss (1-10%)
- [ ] Test looting all items
- [ ] Test consumable usage
- [ ] Test sell from backpack only

---

**End of Specification**
