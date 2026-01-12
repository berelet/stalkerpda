-- Trader Quests Migration
-- Links quest templates to traders who can give them
-- Date: 2026-01-11

CREATE TABLE IF NOT EXISTS trader_quests (
    id VARCHAR(36) PRIMARY KEY,
    trader_id VARCHAR(36) NOT NULL,
    quest_id VARCHAR(36) NOT NULL COMMENT 'Reference to contracts (quest template)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
    FOREIGN KEY (quest_id) REFERENCES contracts(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_trader_quest (trader_id, quest_id),
    INDEX idx_trader (trader_id),
    INDEX idx_quest (quest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
