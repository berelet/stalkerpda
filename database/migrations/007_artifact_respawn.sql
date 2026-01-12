-- Artifact Respawn Migration
-- Version: 1.0
-- Date: 2026-01-11

-- =====================================================
-- 1. Extend artifacts table for respawn system
-- =====================================================

-- Add respawning state to artifacts
ALTER TABLE artifacts
MODIFY COLUMN state ENUM('hidden', 'visible', 'extracting', 'extracted', 'lost', 'respawning') DEFAULT 'hidden';

-- Add respawn configuration columns
ALTER TABLE artifacts
ADD COLUMN respawn_enabled BOOLEAN DEFAULT FALSE COMMENT 'Auto-respawn after pickup',
ADD COLUMN respawn_delay_minutes INT NULL COMMENT 'Minutes until respawn',
ADD COLUMN respawn_radius_meters INT NULL COMMENT 'Random spawn radius in meters',
ADD COLUMN original_latitude DECIMAL(10,8) NULL COMMENT 'Original spawn location',
ADD COLUMN original_longitude DECIMAL(11,8) NULL COMMENT 'Original spawn location',
ADD COLUMN pickup_count INT DEFAULT 0 COMMENT 'How many times artifact was picked up',
ADD COLUMN last_pickup_at TIMESTAMP NULL COMMENT 'When artifact was last picked up';

CREATE INDEX idx_respawn_enabled ON artifacts(respawn_enabled);
CREATE INDEX idx_spawned_at ON artifacts(spawned_at);

-- =====================================================
-- 2. Add expires_at column if not exists
-- =====================================================

-- Check if expires_at exists, add if not
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'artifacts' 
               AND COLUMN_NAME = 'expires_at');

SET @query = IF(@exists = 0, 
    'ALTER TABLE artifacts ADD COLUMN expires_at TIMESTAMP NULL COMMENT ''When artifact becomes inactive''',
    'SELECT ''expires_at already exists''');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
