# Inventory System v2.0 - TODO

**Date:** 2026-01-03  
**Status:** Specification Complete, Implementation Pending

---

## 📋 Implementation Checklist

### Phase 1: Database Migration ⏳
```bash
# 1. Backup current database
mysqldump -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone > backup_before_inventory_v2.sql

# 2. Run migration
source .env.local
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone \
  < database/migrations/003_inventory_system_v2.sql

# 3. Verify tables updated
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone \
  -e "DESCRIBE player_equipment; DESCRIBE artifacts; DESCRIBE players;"
```

**Files:**
- ✅ `database/migrations/003_inventory_system_v2.sql` (created)

---

### Phase 2: Backend Implementation ⏳

#### 2.1 Create Inventory Handler
**File:** `backend/src/handlers/inventory.py`

**Endpoints to implement:**
```python
# 1. GET /api/inventory - Get full inventory
def get_inventory_handler(event, context):
    # Return: equipped (armor, rings, artifact) + backpack + capacity + totalBonuses

# 2. POST /api/inventory/equip - Equip item from backpack
def equip_item_handler(event, context):
    # Input: itemId
    # Logic: Move to slot, replace if occupied, apply bonuses

# 3. POST /api/inventory/unequip - Unequip item to backpack
def unequip_item_handler(event, context):
    # Input: itemId
    # Logic: Check backpack space, remove bonuses, update lives/status

# 4. POST /api/inventory/use - Use consumable
def use_consumable_handler(event, context):
    # Input: itemId
    # Logic: Apply radiation removal, delete item

# 5. POST /api/inventory/drop - Drop item permanently
def drop_item_handler(event, context):
    # Input: itemId
    # Logic: Remove bonuses if equipped, delete item

# 6. POST /api/inventory/sell - Sell item from backpack
def sell_item_handler(event, context):
    # Input: itemId
    # Logic: Check in backpack, calculate price with reputation, add money, delete item
```

#### 2.2 Update Existing Handlers

**File:** `backend/src/handlers/players.py`
```python
# Update death_handler()
# - Change item loss: ALL items 1-10% (not 1-20% equipment, 100% artifacts)
# - Check equipped items and remove bonuses if lost
```

**File:** `backend/src/handlers/players.py`
```python
# Update loot_player_handler()
# - Loot ALL items (equipped + backpack)
# - Check looter backpack capacity before transfer
```

#### 2.3 Create Inventory Utilities

**File:** `backend/src/utils/inventory.py`
```python
def calculate_total_bonuses(player_id, conn):
    """Calculate total wounds, rad resist, bonus lives from equipped items"""
    
def get_equipped_items(player_id, conn):
    """Get all equipped items (armor, rings, artifact)"""
    
def get_backpack_items(player_id, conn):
    """Get all backpack items with count"""
    
def check_backpack_capacity(player_id, conn):
    """Check if backpack has free space"""
    
def equip_item(player_id, item_id, conn):
    """Equip item logic with slot replacement"""
    
def unequip_item(player_id, item_id, conn):
    """Unequip item logic with lives check"""
    
def update_player_lives_from_equipment(player_id, conn):
    """Recalculate currentLives based on equipped items with bonusLives"""
```

#### 2.4 Update SAM Template

**File:** `infrastructure/template.yaml`
```yaml
# Add 6 new Lambda functions:
GetInventoryFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src.handlers.inventory.get_inventory_handler
    Events:
      GetInventory:
        Type: Api
        Properties:
          Path: /api/inventory
          Method: GET

EquipItemFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src.handlers.inventory.equip_item_handler
    Events:
      EquipItem:
        Type: Api
        Properties:
          Path: /api/inventory/equip
          Method: POST

# ... (add remaining 4 functions)
```

---

### Phase 3: Frontend Implementation ⏳

#### 3.1 Create Inventory Page
**File:** `frontend/src/pages/InventoryPage.tsx`

**Features:**
- Equipment slots display (armor, ring1, ring2, artifact)
- Backpack grid (50 items, scrollable)
- Total bonuses display (wounds, rad resist, lives)
- Capacity indicator (15/50)
- Click item → context menu with options
- Item details modal (photo, description, stats)

#### 3.2 Create Inventory Components
**Files:**
- `frontend/src/components/inventory/EquipmentSlots.tsx`
- `frontend/src/components/inventory/BackpackGrid.tsx`
- `frontend/src/components/inventory/ItemCard.tsx`
- `frontend/src/components/inventory/ItemContextMenu.tsx` - **NEW**
- `frontend/src/components/inventory/ItemDetailsModal.tsx` - **NEW**
- `frontend/src/components/inventory/BonusesDisplay.tsx`

#### 3.3 Update API Client
**File:** `frontend/src/services/api.ts`
```typescript
// Add inventory endpoints
export const getInventory = () => api.get('/api/inventory');
export const equipItem = (itemId: string) => api.post('/api/inventory/equip', { itemId });
export const unequipItem = (itemId: string) => api.post('/api/inventory/unequip', { itemId });
export const useConsumable = (itemId: string) => api.post('/api/inventory/use', { itemId });
export const dropItem = (itemId: string) => api.post('/api/inventory/drop', { itemId });
export const sellItem = (itemId: string) => api.post('/api/inventory/sell', { itemId });
```

#### 3.4 Update Navigation
**File:** `frontend/src/components/layout/PDALayout.tsx`
```typescript
// Add "Inventory" link to footer navigation
<Link to="/inventory">Inventory</Link>
```

---

### Phase 4: Testing ⏳

#### 4.1 Backend Tests
**File:** `tests/inventory-tests.sh`

Test scenarios:
- [ ] Equip armor from backpack
- [ ] Equip ring to ring1 slot
- [ ] Equip ring to ring2 slot (ring1 occupied)
- [ ] Equip 3rd ring (replaces ring1)
- [ ] Unequip item to backpack
- [ ] Unequip with backpack full (error)
- [ ] Equip artifact with bonusLives (currentLives increases)
- [ ] Unequip artifact with bonusLives (currentLives decreases, can die)
- [ ] Use consumable (radiation removal)
- [ ] Drop item (permanent deletion)
- [ ] Sell item from backpack (money added)
- [ ] Sell equipped item (error)
- [ ] Pickup artifact with backpack full (error)
- [ ] Death with 1-10% item loss
- [ ] Loot all items (equipped + backpack)

#### 4.2 Frontend Tests
- [ ] Display equipped items in slots
- [ ] Display backpack items in grid
- [ ] Click item → context menu appears
- [ ] Context menu options work (Details, Equip/Unequip, Use, Drop, Sell)
- [ ] Item details modal displays correctly
- [ ] Show total bonuses
- [ ] Show capacity indicator
- [ ] Use consumable flow
- [ ] Drop/sell confirmations
- [ ] Error handling (backpack full, etc.)

---

### Phase 5: Deployment ⏳

```bash
# 1. Deploy backend
cd infrastructure
sam build
sam deploy --profile stalker --region eu-north-1

# 2. Deploy frontend
cd frontend
npm run build
aws s3 sync dist/ s3://pda-zone-frontend-dev-707694916945 --profile stalker
aws cloudfront create-invalidation --distribution-id d384azcb4go67w --paths "/*" --profile stalker

# 3. Test in production
make smoke-test
```

---

## 📚 Reference Documents

- **Full Spec:** `specs/inventory-system-spec.md`
- **Changes:** `specs/inventory-system-CHANGES.md`
- **Quick Start:** `specs/inventory-system-README.md`
- **Migration:** `database/migrations/003_inventory_system_v2.sql`

---

## 🚨 Critical Notes

1. **Backup database before migration**
2. **Test migration on dev environment first**
3. **Lives can go negative** - implement carefully
4. **Backpack capacity checks** - add everywhere (pickup, unequip, loot)
5. **CORS headers** - add to all new Lambda responses
6. **Equipped items give bonuses** - backpack items are inactive

---

## 🎯 Priority Order

1. **Database migration** (30 min)
2. **Backend utilities** (`utils/inventory.py`) (2 hours)
3. **Backend handlers** (`handlers/inventory.py`) (3 hours)
4. **Update death/loot handlers** (1 hour)
5. **SAM template update** (30 min)
6. **Deploy backend** (30 min)
7. **Frontend inventory page** (4 hours)
8. **Testing** (2 hours)
9. **Deploy frontend** (30 min)

**Total estimate:** ~14 hours

---

## ✅ Session Resume Command

```bash
# When resuming, run:
cd /var/www/stalker/stalkerpda
cat specs/inventory-system-README.md
cat specs/inventory-system-TODO.md

# Check current status:
git status
ls -la database/migrations/
ls -la backend/src/handlers/
```

---

**Last updated:** 2026-01-03 22:06
