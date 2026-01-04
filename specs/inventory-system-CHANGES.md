# Inventory System v2.0 - Key Changes

**Date:** 2026-01-03  
**Status:** Specification Complete, Implementation Pending

---

## 🔄 Major Changes from v1.0

### 1. **Equipment Slots Reduced**
- ❌ Old: 3 ring slots
- ✅ New: 2 ring slots

### 2. **Equipping Items**
- ❌ Old: Double-tap to equip/unequip
- ✅ New: Click → context menu with options:
  - **Details** - photo, description, stats
  - **Equip/Unequip** - based on current state
  - **Use** - for consumables (anti-rad, medicine)
  - **Drop** - permanent deletion
  - **Sell** - only from backpack

### 3. **Backpack System**
- ✅ 50 item capacity (equipment slots NOT counted)
- ✅ Total capacity: 54 items (4 equipped + 50 backpack)
- ✅ Each item = 1 slot (no stacking)

### 4. **Lives System Overhaul**
- ✅ Bonus lives can resurrect from 0 lives
- ✅ Unequipping can kill player
- ✅ Lives can go negative (debt tracking)
- ✅ Players with 0 lives can still equip/unequip items

### 5. **Death Item Loss**
- ❌ Old: Artifacts lost 100%, equipment 1-20%
- ✅ New: ALL items (artifacts + equipment) have 1-10% loss chance

### 6. **Looting Changes**
- ✅ ALL items can be looted (equipped + backpack)
- ✅ No distinction between equipped and backpack items

### 7. **Selling Restrictions**
- ✅ Can only sell items from backpack
- ✅ Must unequip items before selling

### 8. **Consumables**
- ✅ Use directly from backpack (no equipping)
- ✅ Can use at 0 radiation (item still consumed)
- ✅ No cooldown

---

## 📊 Database Changes

### Modified Tables

**player_equipment:**
```sql
- equipped: BOOLEAN                    ❌ REMOVED
+ slot_type: ENUM(...)                 ✅ ADDED
+ slot_position: INT                   ✅ ADDED
```

**artifacts:**
```sql
+ slot_type: ENUM('backpack','artifact') ✅ ADDED
```

**players:**
```sql
+ backpack_capacity: INT DEFAULT 50    ✅ ADDED
```

**equipment_types:**
```sql
max_slots: 3 → 2 (for rings)           ✅ UPDATED
```

---

## 🎮 Gameplay Impact

### Lives Mechanics Examples

**Resurrection:**
```
Player: 0 lives (dead, in bar)
Action: Equip artifact with +1 life
Result: 1 life (alive, can leave bar)
```

**Death by Unequip:**
```
Player: 1 life + artifact (+1) = 2 total
Action: Unequip artifact
Result: 0 lives (dead, must go to bar)
```

**Negative Lives (Debt):**
```
Player: 1 life + artifact (+2 total bonus)
Action: Unequip artifact
Result: -1 lives (dead, cannot resurrect by re-equipping)
```

### Inventory Management

**Equipping:**
- Double-tap item in backpack → equip
- If slot full → replaces first item
- Replaced item goes to backpack

**Unequipping:**
- Double-tap equipped item → unequip to backpack
- Requires free space in backpack

**Capacity:**
- Backpack full (50/50) → cannot pickup/unequip
- Must drop or sell items first

---

## 🔧 API Changes

### New Endpoints

```
GET  /api/inventory              - Get full inventory
POST /api/inventory/equip        - Equip item from backpack
POST /api/inventory/unequip      - Unequip item to backpack
POST /api/inventory/use          - Use consumable
POST /api/inventory/drop         - Drop item (permanent)
POST /api/inventory/sell         - Sell item from backpack
```

### Modified Endpoints

```
GET  /api/equipment              - Now returns equipped + backpack
POST /api/equipment/{id}/use     - Moved to /api/inventory/use
```

### Response Format

```json
{
  "equipped": {
    "armor": {...},
    "rings": [{...}, {...}],
    "artifact": {...}
  },
  "backpack": [...],
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

---

## ✅ Implementation Checklist

### Phase 1: Database (Priority 1)
- [ ] Run migration `003_inventory_system_v2.sql`
- [ ] Verify triggers work correctly
- [ ] Test views return correct data
- [ ] Backup existing data

### Phase 2: Backend (Priority 2)
- [ ] Update `src/models/schemas.py` with new inventory models
- [ ] Create `src/handlers/inventory.py` with 6 endpoints
- [ ] Update `src/utils/game.py` with lives calculation logic
- [ ] Update death handler (1-10% loss for all items)
- [ ] Update looting handler (all items lootable)
- [ ] Add backpack capacity checks everywhere
- [ ] Update SAM template with new Lambda functions

### Phase 3: Frontend (Priority 3)
- [ ] Design inventory UI (slots + backpack grid)
- [ ] Implement double-tap equip/unequip
- [ ] Show total bonuses (wounds, rad resist, lives)
- [ ] Add backpack capacity indicator (15/50)
- [ ] Implement consumable usage flow
- [ ] Add drop/sell confirmations
- [ ] Update profile page to show equipped items

### Phase 4: Testing (Priority 4)
- [ ] Test equip/unequip all item types
- [ ] Test ring slot replacement logic
- [ ] Test lives with artifacts (equip/unequip/death)
- [ ] Test backpack capacity limits
- [ ] Test death item loss (1-10% probability)
- [ ] Test looting all items (equipped + backpack)
- [ ] Test consumable usage
- [ ] Test sell from backpack only restriction

---

## 🚨 Breaking Changes

### For Existing Players

1. **Ring slots reduced:** Players with 3 rings equipped will need to unequip one
2. **Artifacts inactive in backpack:** Only equipped artifact provides bonuses
3. **Selling restriction:** Must unequip items before selling

### Migration Strategy

```sql
-- Move 3rd ring to backpack if exists
UPDATE player_equipment pe
JOIN (
  SELECT player_id, id
  FROM player_equipment
  WHERE slot_type = 'ring' AND slot_position = 3
) AS third_ring ON pe.id = third_ring.id
SET pe.slot_type = 'backpack', pe.slot_position = 0;

-- Move all artifacts to backpack initially
UPDATE artifacts
SET slot_type = 'backpack'
WHERE owner_id IS NOT NULL;
```

---

## 📝 Documentation Updates Needed

- [ ] Update `AGENT_GUIDE.md` with new inventory system
- [ ] Update `specs/game-mechanics/FINAL-SPEC.md` (section 3)
- [ ] Update `specs/api/endpoints.md` with new inventory endpoints
- [ ] Update `specs/frontend/ui-spec.md` with inventory screen design
- [ ] Create user guide for inventory management

---

## 🎯 Next Steps

1. **Review specification** with team
2. **Run database migration** on dev environment
3. **Implement backend handlers** (inventory.py)
4. **Update frontend** with new inventory UI
5. **Test thoroughly** before production deployment

---

**Questions or concerns?** Review full spec: `specs/inventory-system-spec.md`
