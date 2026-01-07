-- Trading System Migration v2.0
-- Version: 2.0
-- Date: 2026-01-07
-- Note: players.balance already exists (decimal), we'll use it as money
-- Note: player_roles.is_bartender already exists
-- Note: Old shop_inventory and purchase_transactions exist but will be replaced

-- Drop old and new tables if exist
DROP TABLE IF EXISTS trade_transactions;
DROP TABLE IF EXISTS trade_sessions;
DROP TABLE IF EXISTS trader_inventory;
DROP TABLE IF EXISTS traders;
DROP TABLE IF EXISTS player_items;
DROP TABLE IF EXISTS item_definitions;
DROP TABLE IF EXISTS purchase_transactions;
DROP TABLE IF EXISTS shop_inventory;

-- Item definitions (armor, medicine, ammunition, food, drink)
CREATE TABLE item_definitions (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  type ENUM('armor', 'armor_addon', 'medicine', 'ammunition', 'food', 'drink') NOT NULL,
  base_price INT NOT NULL DEFAULT 0,
  is_sellable BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_stackable BOOLEAN DEFAULT FALSE,
  
  -- Item effects
  wounds_protection INT DEFAULT 0,
  radiation_resistance INT DEFAULT 0,
  extra_lives INT DEFAULT 0,
  anti_radiation INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player items (backpack)
CREATE TABLE player_items (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  player_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  item_def_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  quantity INT DEFAULT 1,
  is_redeemed BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redeemed_at TIMESTAMP NULL,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (item_def_id) REFERENCES item_definitions(id) ON DELETE RESTRICT,
  
  INDEX idx_player (player_id),
  INDEX idx_item_def (item_def_id),
  INDEX idx_redeemed (is_redeemed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Traders (NPC and Bartenders)
CREATE TABLE traders (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('bartender', 'npc') NOT NULL,
  player_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NULL,
  
  -- Location (for NPC)
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  interaction_radius INT DEFAULT 20,
  
  -- Commissions
  commission_buy_pct INT DEFAULT 10,
  commission_sell_pct INT DEFAULT 20,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
  
  INDEX idx_type (type),
  INDEX idx_active (is_active),
  INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trader inventory (catalog)
CREATE TABLE trader_inventory (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  trader_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  item_def_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_def_id) REFERENCES item_definitions(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_trader_item (trader_id, item_def_id),
  INDEX idx_trader (trader_id),
  INDEX idx_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trade sessions (5 min timeout)
CREATE TABLE trade_sessions (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  player_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  trader_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
  
  INDEX idx_player (player_id),
  INDEX idx_status (status),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trade transactions (history)
CREATE TABLE trade_transactions (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  trade_session_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  type ENUM('buy', 'sell') NOT NULL,
  player_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  trader_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  total_amount INT NOT NULL,
  lines_json JSON NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data: Sample items
INSERT INTO item_definitions (id, name, description, type, base_price, is_stackable, extra_lives) VALUES
(UUID(), 'Medkit', 'Restores 2 lives', 'medicine', 500, FALSE, 2),
(UUID(), 'Bandage', 'Restores 1 life', 'medicine', 200, FALSE, 1),
(UUID(), 'Anti-Rad', 'Reduces radiation by 30 points', 'medicine', 300, FALSE, 0),
(UUID(), 'BBs (10 units)', 'Ammunition for airsoft guns', 'ammunition', 100, TRUE, 0),
(UUID(), 'Beer', 'Refreshing drink', 'drink', 150, FALSE, 0),
(UUID(), 'Energy Drink', 'Boosts stamina', 'drink', 100, FALSE, 0),
(UUID(), 'Canned Food', 'Nutritious meal', 'food', 200, FALSE, 0);

-- Seed data: Sample NPC trader
INSERT INTO traders (id, name, type, latitude, longitude, interaction_radius, commission_buy_pct, commission_sell_pct, is_active) VALUES
(UUID(), 'Sidorovich', 'npc', 50.450001, 30.523333, 20, 10, 20, TRUE);

-- Add all items to Sidorovich's inventory
INSERT INTO trader_inventory (id, trader_id, item_def_id, is_available)
SELECT UUID(), t.id, i.id, TRUE
FROM traders t
CROSS JOIN item_definitions i
WHERE t.name = 'Sidorovich';
