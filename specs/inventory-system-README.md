# Inventory System v2.0 - Quick Start

**Date:** 2026-01-03  
**Status:** Specification Complete

---

## 📚 Documentation

- **Full Specification:** [inventory-system-spec.md](./inventory-system-spec.md)
- **Key Changes:** [inventory-system-CHANGES.md](./inventory-system-CHANGES.md)
- **Database Migration:** [../database/migrations/003_inventory_system_v2.sql](../database/migrations/003_inventory_system_v2.sql)

---

## 🎯 Quick Summary

### Equipment Slots
```
┌─────────────────────────────────┐
│  Armor (1)  │  Ring 1  │  Ring 2 │
├─────────────────────────────────┤
│        Artifact (1)              │
└─────────────────────────────────┘
```

### Backpack
- **Capacity:** 50 items
- **Total:** 54 items (4 equipped + 50 backpack)

### Key Rules
- ✅ Only equipped items provide bonuses
- ✅ Double-tap to equip/unequip
- ✅ Bonus lives can resurrect from 0 lives
- ✅ Unequipping can kill player
- ✅ All items: 1-10% loss on death
- ✅ Sell only from backpack

---

## 🚀 Implementation Steps

### 1. Database Migration
```bash
# Load credentials
source .env.local

# Run migration
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"$DB_PASSWORD" pda_zone \
      < database/migrations/003_inventory_system_v2.sql

# Verify
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"$DB_PASSWORD" pda_zone \
      -e "DESCRIBE player_equipment;"
```

### 2. Backend Implementation
```bash
# Create inventory handler
touch backend/src/handlers/inventory.py

# Implement 6 endpoints:
# - GET  /api/inventory
# - POST /api/inventory/equip
# - POST /api/inventory/unequip
# - POST /api/inventory/use
# - POST /api/inventory/drop
# - POST /api/inventory/sell
```

### 3. Update SAM Template
```yaml
# Add to infrastructure/template.yaml
InventoryFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src.handlers.inventory.get_inventory_handler
    # ... (see full spec)
```

### 4. Frontend Implementation
```bash
# Create inventory page
touch frontend/src/pages/InventoryPage.tsx

# Features:
# - Equipment slots display
# - Backpack grid (50 items)
# - Double-tap equip/unequip
# - Total bonuses display
# - Capacity indicator
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Equip item from backpack
- [ ] Unequip item to backpack
- [ ] Ring slot replacement (ring1 → ring2 → replace ring1)
- [ ] Backpack capacity limit (50 items)
- [ ] Lives calculation with artifacts
- [ ] Death item loss (1-10% all items)
- [ ] Looting all items (equipped + backpack)
- [ ] Use consumable from backpack
- [ ] Sell from backpack only
- [ ] Drop item (permanent deletion)

### Frontend Tests
- [ ] Display equipped items in slots
- [ ] Display backpack items in grid
- [ ] Double-tap equip/unequip
- [ ] Show total bonuses (wounds, rad resist, lives)
- [ ] Show capacity indicator (15/50)
- [ ] Consumable usage flow
- [ ] Drop/sell confirmations
- [ ] Error handling (backpack full, etc.)

---

## 📊 API Examples

### Get Inventory
```bash
curl -X GET https://API_URL/api/inventory \
  -H "Authorization: Bearer $TOKEN"
```

### Equip Item
```bash
curl -X POST https://API_URL/api/inventory/equip \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "uuid"}'
```

### Use Consumable
```bash
curl -X POST https://API_URL/api/inventory/use \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "uuid"}'
```

---

## 🔧 Database Queries

### Get Equipped Items
```sql
SELECT * FROM player_equipment 
WHERE player_id = 'uuid' AND slot_type != 'backpack';
```

### Get Backpack Count
```sql
SELECT COUNT(*) FROM player_equipment 
WHERE player_id = 'uuid' AND slot_type = 'backpack';
```

### Get Total Bonuses
```sql
SELECT 
  COALESCE(SUM(et.bonus_wounds), 0) AS total_wounds,
  COALESCE(SUM(et.radiation_resist), 0) AS total_rad_resist
FROM player_equipment pe
JOIN equipment_types et ON pe.equipment_type_id = et.id
WHERE pe.player_id = 'uuid' AND pe.slot_type != 'backpack';
```

---

## ⚠️ Breaking Changes

### For Existing Players
1. **Ring slots reduced:** 3 → 2 (3rd ring moved to backpack)
2. **Artifacts inactive in backpack:** Only equipped artifact gives bonuses
3. **Selling restriction:** Must unequip before selling

### Migration Strategy
```sql
-- Move 3rd ring to backpack
UPDATE player_equipment pe
SET pe.slot_type = 'backpack', pe.slot_position = 0
WHERE pe.slot_type = 'ring' AND pe.slot_position = 3;

-- Move all artifacts to backpack initially
UPDATE artifacts
SET slot_type = 'backpack'
WHERE owner_id IS NOT NULL;
```

---

## 📝 Next Steps

1. ✅ Review specification
2. ⏳ Run database migration
3. ⏳ Implement backend handlers
4. ⏳ Update frontend UI
5. ⏳ Test thoroughly
6. ⏳ Deploy to production

---

**Questions?** See full specification: [inventory-system-spec.md](./inventory-system-spec.md)
