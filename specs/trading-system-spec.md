# Trading System Specification

**Version:** 2.0 (Implementation)  
**Date:** 2026-01-07  
**Status:** ✅ Implemented and Tested  
**Based on:** `docs/feutures/trading-mechanics.md`

---

## Key Implementation Decisions

### Database Architecture

**Decision:** Reuse existing `player_inventory` table instead of creating new `player_items` table.

**Rationale:**
- `player_inventory` already exists and works with inventory UI
- Supports equipment system (equip/unequip)
- Avoids data duplication
- Single source of truth for all player items

**Implementation:**
```sql
-- Existing table structure (no changes needed)
player_inventory:
  - item_type: 'artifact' | 'equipment' | 'consumable'
  - item_id: References item_definitions.id (for shop items)
  - slot_type: 'backpack' | 'artifact'
  - quantity: INT
```

**Mapping:**
- Shop items (medicine, ammunition, food, drink) → `item_type = 'consumable'`
- Game artifacts → `item_type = 'artifact'`
- Equipment → `item_type = 'equipment'`

---

## Database Schema

### Tables Used

#### 1. `item_definitions` (new)
Shop item catalog with prices and properties.

```sql
CREATE TABLE item_definitions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100),
  type ENUM('medicine', 'ammunition', 'food', 'drink'),
  base_price INT,
  is_sellable BOOLEAN,
  is_stackable BOOLEAN,
  extra_lives INT,
  -- ... other fields
)
```

#### 2. `player_inventory` (existing - reused)
Stores all player items (artifacts, equipment, shop items).

```sql
-- Already exists
player_inventory:
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  player_id VARCHAR(36),
  item_type ENUM('artifact','equipment','consumable'),
  item_id VARCHAR(36), -- References item_definitions.id for shop items
  slot_type ENUM('backpack','artifact'),
  quantity INT
```

#### 3. `traders` (new)
NPC and bartender traders.

```sql
CREATE TABLE traders (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100),
  type ENUM('bartender', 'npc'),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  interaction_radius INT DEFAULT 20,
  commission_buy_pct INT DEFAULT 10,
  commission_sell_pct INT DEFAULT 20,
  is_active BOOLEAN
)
```

#### 4. `trader_inventory` (new)
Items available for purchase from each trader.

```sql
CREATE TABLE trader_inventory (
  id VARCHAR(36) PRIMARY KEY,
  trader_id VARCHAR(36),
  item_def_id VARCHAR(36),
  is_available BOOLEAN
)
```

#### 5. `trade_sessions` (new)
Active trading sessions (5 min timeout).

```sql
CREATE TABLE trade_sessions (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36),
  trader_id VARCHAR(36),
  status ENUM('pending', 'success', 'failed'),
  expires_at TIMESTAMP
)
```

#### 6. `trade_transactions` (new)
Transaction history.

```sql
CREATE TABLE trade_transactions (
  id VARCHAR(36) PRIMARY KEY,
  trade_session_id VARCHAR(36),
  type ENUM('buy', 'sell'),
  player_id VARCHAR(36),
  trader_id VARCHAR(36),
  total_amount INT,
  lines_json JSON,
  result ENUM('success', 'failed')
)
```

---

## Backend Implementation

### Handler: `src/handlers/trade.py`

#### Key Functions

**1. `buy_handler`**
```python
# Adds items to player_inventory with item_type='consumable'
INSERT INTO player_inventory 
(player_id, item_type, item_id, slot_type, quantity)
VALUES (player_id, 'consumable', item_def_id, 'backpack', quantity)
```

**2. `get_backpack_handler`**
```python
# Reads shop items from player_inventory
SELECT * FROM player_inventory pi
JOIN item_definitions i ON pi.item_id = i.id
WHERE pi.player_id = ? 
  AND pi.item_type = 'consumable'
  AND pi.slot_type = 'backpack'
```

**3. `sell_handler`**
```python
# Removes items from player_inventory
DELETE FROM player_inventory 
WHERE id = ? AND player_id = ?
```

**4. `redeem_handler`**
```python
# Deletes food/drink item (consumed)
DELETE FROM player_inventory WHERE id = ?
```

---

## API Endpoints

### 1. GET /api/traders
List all active traders.

**Response:**
```json
{
  "traders": [
    {
      "id": "uuid",
      "name": "Sidorovich",
      "type": "npc",
      "latitude": 34.766848,
      "longitude": 32.433766,
      "interaction_radius": 20,
      "is_active": true
    }
  ]
}
```

### 2. POST /api/trade/session/start
Start trading session (validates distance for NPC).

**Request:**
```json
{
  "trader_id": "uuid",
  "latitude": 34.766848,
  "longitude": 32.433766
}
```

**Response:**
```json
{
  "trade_session_id": "uuid",
  "trader": {
    "id": "uuid",
    "name": "Sidorovich",
    "commission_buy_pct": 10,
    "commission_sell_pct": 20
  },
  "expires_at": "2026-01-07T10:00:00Z"
}
```

### 3. GET /api/trade/catalog
Get items available for purchase.

**Query:** `?trade_session_id=uuid`

**Response:**
```json
{
  "items": [
    {
      "item_def_id": "uuid",
      "name": "Medkit",
      "type": "medicine",
      "base_price": 500,
      "buy_price": 550,
      "is_stackable": false,
      "extra_lives": 2
    }
  ]
}
```

### 4. GET /api/trade/backpack
Get player's items available for sale.

**Query:** `?trade_session_id=uuid`

**Response:**
```json
{
  "items": [
    {
      "item_id": "123",
      "item_def_id": "uuid",
      "name": "Medkit",
      "base_price": 500,
      "sell_price": 400,
      "quantity": 1
    }
  ]
}
```

### 5. POST /api/trade/buy
Purchase items.

**Request:**
```json
{
  "trade_session_id": "uuid",
  "items": [
    {
      "item_def_id": "uuid",
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "total_amount": 1100,
  "new_balance": 8900.0
}
```

### 6. POST /api/trade/sell
Sell items.

**Request:**
```json
{
  "trade_session_id": "uuid",
  "items": [
    {
      "item_id": "123",
      "quantity": 1
    }
  ]
}
```

### 7. POST /api/trade/redeem
Redeem food/drink (deletes item, returns code).

**Request:**
```json
{
  "item_id": "123"
}
```

**Response:**
```json
{
  "success": true,
  "redeem_code": "ABC12345",
  "message": "Show this code to the bartender"
}
```

---

## Frontend Implementation

### Components

**1. TraderMarkers.tsx**
- Displays yellow $ markers on map
- Fetches from GET /api/traders
- Popup with TRADE button
- Navigates to /trade?trader={id}

**2. TradingPage.tsx**
- Buy/Sell tabs
- Quantity controls (+/-)
- Session timer (5 min countdown)
- Total calculation
- Confirm button

### Routes
```typescript
<Route path="trade" element={<TradingPage />} />
```

---

## Testing

### Test Coverage

✅ Get traders list  
✅ Start session  
✅ Get catalog  
✅ Get backpack  
✅ Buy items (success)  
✅ Buy items (insufficient funds)  
✅ Sell items  
✅ Redeem food/drink  

### Test File
`tests/trade-comprehensive-test.sh`

---

## Migration Notes

### From Spec to Implementation

**Original Spec:**
- Used new `player_items` table
- Had `is_redeemed` flag

**Actual Implementation:**
- Uses existing `player_inventory` table
- Redeem deletes item (no flag needed)
- `item_type = 'consumable'` for shop items

**Benefits:**
- No data migration needed
- Works with existing inventory UI
- Single source of truth
- Simpler architecture

---

## Future Enhancements

- [ ] P2P trading
- [ ] Faction-based prices
- [ ] Trader reputation
- [ ] Limited stock
- [ ] Bulk operations
- [ ] Trade notifications via WebSocket

---

**Last Updated:** 2026-01-07  
**Status:** ✅ Fully Implemented and Tested
