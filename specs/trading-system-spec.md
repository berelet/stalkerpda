# Trading System Specification

**Version:** 1.0 (MVP)  
**Date:** 2026-01-07  
**Status:** Draft  
**Based on:** `docs/feutures/trading-mechanics.md`

---

## 1. Overview

Trading system allows players to buy and sell items with traders (Bartenders and NPC traders). P2P trading is not available in MVP.

**Key Principles:**
- Only backpack items can be traded (equipped items excluded)
- Dead players can buy but cannot sell
- All operations are atomic (MySQL transactions)
- No real inventory stock for traders
- 5-minute trade session timeout

---

## 2. Database Schema

### 2.1 New Tables

#### `item_definitions`
```sql
CREATE TABLE item_definitions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  type ENUM('armor', 'armor_addon', 'medicine', 'ammunition', 'food', 'drink') NOT NULL,
  base_price INT NOT NULL DEFAULT 0,
  is_sellable BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_stackable BOOLEAN DEFAULT FALSE,
  
  -- Item effects (optional, for future use)
  wounds_protection INT DEFAULT 0,
  radiation_resistance INT DEFAULT 0,
  extra_lives INT DEFAULT 0,
  anti_radiation INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `player_items`
```sql
CREATE TABLE player_items (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  item_def_id VARCHAR(36) NOT NULL,
  quantity INT DEFAULT 1,
  is_redeemed BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redeemed_at TIMESTAMP NULL,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (item_def_id) REFERENCES item_definitions(id) ON DELETE RESTRICT,
  
  INDEX idx_player (player_id),
  INDEX idx_item_def (item_def_id),
  INDEX idx_redeemed (is_redeemed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `traders`
```sql
CREATE TABLE traders (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('bartender', 'npc') NOT NULL,
  player_id VARCHAR(36) NULL, -- For bartender type
  
  -- Location (for NPC traders)
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  interaction_radius INT DEFAULT 20, -- meters
  
  -- Commissions (percentage)
  commission_buy_pct INT DEFAULT 10,  -- Markup on buy
  commission_sell_pct INT DEFAULT 20, -- Commission on sell
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
  
  INDEX idx_type (type),
  INDEX idx_active (is_active),
  INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `trader_inventory`
```sql
CREATE TABLE trader_inventory (
  id VARCHAR(36) PRIMARY KEY,
  trader_id VARCHAR(36) NOT NULL,
  item_def_id VARCHAR(36) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_def_id) REFERENCES item_definitions(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_trader_item (trader_id, item_def_id),
  INDEX idx_trader (trader_id),
  INDEX idx_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `trade_sessions`
```sql
CREATE TABLE trade_sessions (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  trader_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
  
  INDEX idx_player (player_id),
  INDEX idx_status (status),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### `trade_transactions`
```sql
CREATE TABLE trade_transactions (
  id VARCHAR(36) PRIMARY KEY,
  trade_session_id VARCHAR(36) NOT NULL,
  type ENUM('buy', 'sell') NOT NULL,
  player_id VARCHAR(36) NOT NULL,
  trader_id VARCHAR(36) NOT NULL,
  total_amount INT NOT NULL,
  lines_json JSON NOT NULL, -- [{item_def_id, qty, unit_price}]
  result ENUM('success', 'failed') NOT NULL,
  error_code VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (trade_session_id) REFERENCES trade_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
  
  INDEX idx_player (player_id),
  INDEX idx_trader (trader_id),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 Modified Tables

#### `players` - Add money field
```sql
ALTER TABLE players ADD COLUMN money INT DEFAULT 0 AFTER radiation;
```

#### `player_roles` - Add bartender flag
```sql
ALTER TABLE player_roles ADD COLUMN is_bartender BOOLEAN DEFAULT FALSE AFTER is_gm;
```

---

## 3. Price Calculation

### 3.1 Formulas

**Buy Price (player buys from trader):**
```
price = ROUND(base_price * (1 + commission_buy_pct / 100))
```

**Sell Price (player sells to trader):**
```
price = ROUND(base_price * (1 - commission_sell_pct / 100))
```

### 3.2 Examples

Item with `base_price = 1000`:
- Trader with `commission_buy_pct = 10%` → Buy price = 1100
- Trader with `commission_sell_pct = 20%` → Sell price = 800

---

## 4. Trade Flow

### 4.1 Initiate Trade Session

**Endpoint:** `POST /api/trade/session/start`

**Request:**
```json
{
  "trader_id": "uuid",
  "latitude": 50.123456,  // Player's current location
  "longitude": 30.123456
}
```

**Response:**
```json
{
  "trade_session_id": "uuid",
  "trader": {
    "id": "uuid",
    "name": "Sidorovich",
    "type": "npc",
    "commission_buy_pct": 10,
    "commission_sell_pct": 20
  },
  "expires_at": "2026-01-07T10:30:00Z"
}
```

**Validation:**
1. Trader exists and `is_active = true`
2. For NPC traders: distance ≤ `interaction_radius` (default 20m)
3. For bartender traders: player scanned QR code (trader_id from QR)
4. Create session with 5-minute expiration

**Errors:**
- `TRADER_NOT_FOUND`
- `TRADER_INACTIVE`
- `TRADER_TOO_FAR` (for NPC)

---

### 4.2 Get Trader Catalog (Buy)

**Endpoint:** `GET /api/trade/catalog?trade_session_id={uuid}`

**Response:**
```json
{
  "items": [
    {
      "item_def_id": "uuid",
      "name": "Medkit",
      "description": "Restores 2 lives",
      "image_url": "https://...",
      "type": "medicine",
      "base_price": 500,
      "buy_price": 550,
      "is_stackable": false,
      "extra_lives": 2
    },
    {
      "item_def_id": "uuid",
      "name": "BBs (10 units)",
      "type": "ammunition",
      "base_price": 100,
      "buy_price": 110,
      "is_stackable": true
    }
  ]
}
```

**Validation:**
1. Session exists and not expired
2. Return items from `trader_inventory` where `is_available = true`
3. Calculate `buy_price` using trader's commission

---

### 4.3 Get Player Backpack (Sell)

**Endpoint:** `GET /api/trade/backpack?trade_session_id={uuid}`

**Response:**
```json
{
  "items": [
    {
      "item_id": "uuid",
      "item_def_id": "uuid",
      "name": "Artifact: Moonlight",
      "type": "artifact",
      "base_price": 5000,
      "sell_price": 4000,
      "is_sellable": true,
      "quantity": 1
    },
    {
      "item_id": "uuid",
      "item_def_id": "uuid",
      "name": "BBs",
      "type": "ammunition",
      "base_price": 100,
      "sell_price": 80,
      "is_sellable": true,
      "quantity": 150
    }
  ]
}
```

**Validation:**
1. Session exists and not expired
2. Player is alive (dead players cannot sell)
3. Return only items in backpack (not equipped)
4. Calculate `sell_price` using trader's commission

**Errors:**
- `SESSION_EXPIRED`
- `PLAYER_DEAD_SELL_FORBIDDEN`

---

### 4.4 Execute Buy Transaction

**Endpoint:** `POST /api/trade/buy`

**Request:**
```json
{
  "trade_session_id": "uuid",
  "items": [
    {
      "item_def_id": "uuid",
      "quantity": 2
    },
    {
      "item_def_id": "uuid",
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "total_amount": 1200,
  "new_balance": 3800,
  "items_added": [
    {
      "item_def_id": "uuid",
      "name": "Medkit",
      "quantity": 2
    }
  ]
}
```

**Validation:**
1. Session exists and not expired
2. All items exist in trader's catalog
3. Calculate total price
4. Check player has sufficient funds
5. Check backpack has free slots:
   - Stackable item already exists → 0 slots
   - Stackable item new → 1 slot
   - Non-stackable → N slots
6. Execute transaction atomically

**Transaction Steps:**
```sql
START TRANSACTION;

-- 1. Deduct money
UPDATE players SET money = money - total_amount WHERE id = player_id;

-- 2. Add items to backpack
-- For stackable items (BBs):
INSERT INTO player_items (id, player_id, item_def_id, quantity)
VALUES (uuid, player_id, item_def_id, quantity)
ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity);

-- For non-stackable items:
INSERT INTO player_items (id, player_id, item_def_id, quantity)
VALUES (uuid, player_id, item_def_id, 1); -- Repeat N times

-- 3. Record transaction
INSERT INTO trade_transactions (...) VALUES (...);

-- 4. Update session status
UPDATE trade_sessions SET status = 'success' WHERE id = trade_session_id;

COMMIT;
```

**Errors:**
- `SESSION_EXPIRED`
- `INSUFFICIENT_FUNDS`
- `INVENTORY_FULL`
- `INVALID_QUANTITY`

---

### 4.5 Execute Sell Transaction

**Endpoint:** `POST /api/trade/sell`

**Request:**
```json
{
  "trade_session_id": "uuid",
  "items": [
    {
      "item_id": "uuid",
      "quantity": 1
    },
    {
      "item_id": "uuid",
      "quantity": 50
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "total_amount": 4080,
  "new_balance": 9080,
  "items_removed": [
    {
      "item_def_id": "uuid",
      "name": "Artifact: Moonlight",
      "quantity": 1
    }
  ]
}
```

**Validation:**
1. Session exists and not expired
2. Player is alive
3. All items exist in player's backpack
4. All items have `is_sellable = true`
5. For stackable items: quantity ≤ available
6. Execute transaction atomically

**Transaction Steps:**
```sql
START TRANSACTION;

-- 1. Remove items from backpack
-- For stackable items:
UPDATE player_items 
SET quantity = quantity - sold_quantity 
WHERE id = item_id;

DELETE FROM player_items WHERE quantity <= 0;

-- For non-stackable items:
DELETE FROM player_items WHERE id = item_id;

-- 2. Add money
UPDATE players SET money = money + total_amount WHERE id = player_id;

-- 3. Record transaction
INSERT INTO trade_transactions (...) VALUES (...);

-- 4. Update session status
UPDATE trade_sessions SET status = 'success' WHERE id = trade_session_id;

COMMIT;
```

**Errors:**
- `SESSION_EXPIRED`
- `PLAYER_DEAD_SELL_FORBIDDEN`
- `ITEM_NOT_IN_BACKPACK`
- `ITEM_NOT_SELLABLE`
- `INVALID_QUANTITY`

---

## 5. Food/Drink Redeem System

### 5.1 Redeem Item

**Endpoint:** `POST /api/trade/redeem`

**Request:**
```json
{
  "item_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "item": {
    "name": "Beer",
    "type": "drink"
  },
  "redeem_code": "ABC123",
  "message": "Show this code to the bartender"
}
```

**Validation:**
1. Item exists in player's backpack
2. Item type is `food` or `drink`
3. Item not already redeemed
4. Mark as redeemed and remove from backpack

**Transaction:**
```sql
UPDATE player_items 
SET is_redeemed = TRUE, redeemed_at = NOW() 
WHERE id = item_id;
```

---

## 6. Admin Panel Features

### 6.1 Item Definitions Management

**Page:** `/admin/items`

**Features:**
- List all item definitions
- Create new item (form with all fields)
- Edit existing item
- Toggle `is_active` status
- Delete item (if not referenced)

**Endpoints:**
- `GET /api/admin/items` - List all
- `POST /api/admin/items` - Create
- `PUT /api/admin/items/{id}` - Update
- `DELETE /api/admin/items/{id}` - Delete

---

### 6.2 Traders Management

**Page:** `/admin/traders`

**Features:**
- List all traders (NPC + Bartenders)
- Create NPC trader (name, location, radius, commissions)
- Assign bartender role to player
- Edit trader settings
- Toggle `is_active` status
- Manage trader inventory (add/remove items)

**Endpoints:**
- `GET /api/admin/traders` - List all
- `POST /api/admin/traders` - Create NPC
- `PUT /api/admin/traders/{id}` - Update
- `DELETE /api/admin/traders/{id}` - Delete
- `POST /api/admin/traders/{id}/inventory` - Add item to catalog
- `DELETE /api/admin/traders/{id}/inventory/{item_def_id}` - Remove item

---

### 6.3 Transaction History

**Page:** `/admin/transactions`

**Features:**
- List all transactions (paginated, 50 per page)
- Filter by type (buy/sell), player, trader, date range
- View transaction details (items, prices)
- "Clear All" button (delete all transactions)

**Endpoints:**
- `GET /api/admin/transactions?page=1&limit=50&type=buy&player_id=uuid`
- `DELETE /api/admin/transactions` - Clear all

---

## 7. Frontend UI

### 7.1 PDA - Trading Screen

**Route:** `/trade/:trader_id`

**Layout:**
```
┌─────────────────────────────────┐
│ Trading with: Sidorovich        │
│ Session expires: 4:32           │
├─────────────────────────────────┤
│ [Buy] [Sell]                    │
├─────────────────────────────────┤
│ Item List:                      │
│ ┌───────────────────────────┐   │
│ │ [IMG] Medkit              │   │
│ │ Price: 💰 550             │   │
│ │ [−] 0 [+]                 │   │
│ └───────────────────────────┘   │
│ ┌───────────────────────────┐   │
│ │ [IMG] BBs (10 units)      │   │
│ │ Price: 💰 110             │   │
│ │ [−] 0 [+]                 │   │
│ └───────────────────────────┘   │
├─────────────────────────────────┤
│ Total: 💰 1,210                 │
│ Balance: 💰 5,000               │
│ [Confirm Purchase]              │
└─────────────────────────────────┘
```

**Features:**
- Tab switching: Buy / Sell
- Quantity controls (+ / −)
- Real-time total calculation
- Confirmation modal
- Session timeout countdown
- Auto-close on timeout

---

### 7.2 PDA - Inventory Actions

**Context Menu for Food/Drink:**
```
┌─────────────────┐
│ Details         │
│ Redeem          │ ← New action
│ Drop            │
└─────────────────┘
```

**Redeem Modal:**
```
┌─────────────────────────────────┐
│ Redeem: Beer                    │
├─────────────────────────────────┤
│ Show this code to bartender:    │
│                                 │
│     ABC123                      │
│                                 │
│ [Close]                         │
└─────────────────────────────────┘
```

---

## 8. Error Codes

| Code | Description |
|------|-------------|
| `TRADER_NOT_FOUND` | Trader does not exist |
| `TRADER_INACTIVE` | Trader is not active |
| `TRADER_TOO_FAR` | Player is outside interaction radius |
| `SESSION_EXPIRED` | Trade session has expired (5 min) |
| `INSUFFICIENT_FUNDS` | Player doesn't have enough money |
| `INVENTORY_FULL` | Not enough free backpack slots |
| `ITEM_NOT_IN_BACKPACK` | Item doesn't exist in player's backpack |
| `ITEM_NOT_SELLABLE` | Item cannot be sold |
| `INVALID_QUANTITY` | Quantity is invalid or exceeds available |
| `PLAYER_DEAD_SELL_FORBIDDEN` | Dead players cannot sell items |

---

## 9. Implementation Priority

### Phase 1: Database & Backend (Week 1)
1. Create migration `004_trading_system.sql`
2. Implement backend handlers:
   - `src/handlers/trade.py` (session, buy, sell, redeem)
   - `src/handlers/admin_trade.py` (items, traders, transactions)
3. Add endpoints to SAM template
4. Deploy and test with Postman

### Phase 2: Admin Panel (Week 2)
1. Items management page
2. Traders management page
3. Transaction history page
4. Test full admin workflow

### Phase 3: PDA Frontend (Week 3)
1. Trading screen UI
2. Trader detection on map (NPC traders)
3. QR code scanning for bartenders
4. Redeem functionality in inventory
5. Integration testing

### Phase 4: Testing & Polish (Week 4)
1. End-to-end testing
2. Session timeout handling
3. Error handling and UX
4. Performance optimization

---

## 10. Testing Checklist

### Backend Tests
- [ ] Create trade session (NPC + Bartender)
- [ ] Distance validation for NPC traders
- [ ] Session expiration (5 min)
- [ ] Buy transaction (sufficient funds)
- [ ] Buy transaction (insufficient funds)
- [ ] Buy transaction (inventory full)
- [ ] Sell transaction (alive player)
- [ ] Sell transaction (dead player - should fail)
- [ ] Stackable items (BBs) - quantity handling
- [ ] Non-stackable items - multiple slots
- [ ] Redeem food/drink
- [ ] Transaction idempotency

### Frontend Tests
- [ ] Open trading screen (NPC)
- [ ] Open trading screen (Bartender QR)
- [ ] Buy items with quantity controls
- [ ] Sell items from backpack
- [ ] Session timeout countdown
- [ ] Auto-close on timeout
- [ ] Redeem food/drink from inventory
- [ ] Error handling (all error codes)

---

## 11. Future Enhancements (Post-MVP)

- P2P trading between players
- Faction-based price modifiers
- Trader reputation system
- Limited stock for traders
- Trade history for players
- Bulk operations (sell all, buy max)
- Wishlist / favorites
- Trade notifications via WebSocket

---

**End of Specification**
