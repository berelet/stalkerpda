-- Quest System Enhancements
-- Date: 2026-01-11

-- 1. Add updated_at and reward_item_id to contracts
ALTER TABLE contracts
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
ADD COLUMN reward_item_id VARCHAR(36) NULL COMMENT 'Item reward (FK to item_definitions)' AFTER reward,
ADD COLUMN reward_reputation INT DEFAULT 0 COMMENT 'Reputation points reward' AFTER reward_item_id;

-- 2. Add new quest types: protection, manual, item_delivery
ALTER TABLE contracts
MODIFY COLUMN quest_type ENUM(
  'elimination', 
  'artifact_collection', 
  'delivery', 
  'patrol', 
  'visit',
  'protection',
  'manual',
  'item_delivery'
) NULL;

-- 3. Index on target_player_id (ignore if exists)
-- CREATE INDEX idx_target_player ON contracts(target_player_id);

-- 4. Add index on updated_at
CREATE INDEX idx_updated_at ON contracts(updated_at);
