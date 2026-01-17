-- Quest System Migration
-- Version: 1.0
-- Date: 2026-01-11

-- =====================================================
-- 1. Extend contracts table for quest system
-- =====================================================

ALTER TABLE contracts
ADD COLUMN quest_type ENUM(
  'artifact_collection', 
  'delivery', 
  'patrol', 
  'visit'
) NULL COMMENT 'Quest-specific type (NULL for old contracts)',

ADD COLUMN quest_data JSON NULL COMMENT 'Quest objectives and progress',

ADD COLUMN auto_complete BOOLEAN DEFAULT FALSE COMMENT 'Auto-complete when objectives met',

ADD COLUMN failed BOOLEAN DEFAULT FALSE COMMENT 'Quest failed (death, timeout)',

ADD COLUMN failed_reason VARCHAR(255) NULL COMMENT 'Why quest failed';

CREATE INDEX idx_quest_type ON contracts(quest_type);
CREATE INDEX idx_auto_complete ON contracts(auto_complete);
CREATE INDEX idx_failed ON contracts(failed);

-- =====================================================
-- 2. Quest progress events (for tracking/analytics)
-- =====================================================

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
    
    progress_data JSON NULL COMMENT 'Snapshot of quest_data at event time',
    event_reason VARCHAR(255) NULL COMMENT 'e.g., player_death, timeout, checkpoint_reached',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quest_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_quest (quest_id),
    INDEX idx_player (player_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. NPC/Faction reputation
-- =====================================================

CREATE TABLE npc_reputation (
    id VARCHAR(36) PRIMARY KEY,
    player_id VARCHAR(36) NOT NULL,
    
    npc_id VARCHAR(36) NULL COMMENT 'Specific NPC trader',
    faction ENUM('stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner') NULL,
    
    reputation INT DEFAULT 0 COMMENT 'Reputation points (-10000 to +10000)',
    
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

-- =====================================================
-- 4. Extend traders table with faction
-- =====================================================

ALTER TABLE traders
ADD COLUMN faction ENUM('stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner') NULL COMMENT 'Trader faction';

-- Update Sidorovich to loner faction
UPDATE traders SET faction = 'loner' WHERE name = 'Sidorovich';
