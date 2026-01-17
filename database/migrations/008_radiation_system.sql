-- Migration 008: Radiation & Death System
-- Date: 2026-01-17
-- Description: Add radiation tracking, respawn zones, and looting system

-- ============================================
-- 1. Extend players table
-- ============================================

-- Note: Most columns already exist from previous migrations
-- Indexes will be created only if they don't exist (handled by error suppression)

-- ============================================
-- 2. Extend artifacts table
-- ============================================

ALTER TABLE artifacts
  ADD COLUMN pickup_radiation INT DEFAULT 0 
    COMMENT 'Radiation applied on pickup (0-100)',
  
  ADD COLUMN pickup_radiation_variance INT DEFAULT 30 
    COMMENT 'Random variance % for pickup radiation (±30%)',
  
  -- Note: respawn_enabled, respawn_radius_meters already exist from migration 007
  -- Only add missing columns
  ADD COLUMN last_respawn_at TIMESTAMP NULL 
    COMMENT 'Last respawn timestamp';

-- Index already exists from migration 007

-- ============================================
-- 3. Extend radiation_zones table
-- ============================================

ALTER TABLE radiation_zones
  -- Time window (like artifacts)
  ADD COLUMN active_from TIMESTAMP NULL 
    COMMENT 'Zone becomes active at this time',
  
  ADD COLUMN active_to TIMESTAMP NULL 
    COMMENT 'Zone expires at this time',
  
  -- Respawn mechanics
  ADD COLUMN respawn_enabled BOOLEAN DEFAULT FALSE 
    COMMENT 'Auto-respawn zone after expiration',
  
  ADD COLUMN respawn_delay_seconds INT NULL 
    COMMENT 'Delay before zone respawns',
  
  ADD COLUMN respawn_radius_meters INT NULL 
    COMMENT 'Respawn within radius from center',
  
  ADD COLUMN last_respawn_at TIMESTAMP NULL 
    COMMENT 'Last respawn timestamp';

CREATE INDEX idx_active_time ON radiation_zones(active_from, active_to);
CREATE INDEX idx_zone_respawn ON radiation_zones(respawn_enabled, active);

-- ============================================
-- 4. Create respawn_zones table
-- ============================================

CREATE TABLE respawn_zones (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  
  -- Location
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  radius INT NOT NULL COMMENT 'Meters',
  
  -- Respawn settings
  respawn_time_seconds INT NOT NULL 
    COMMENT 'Required time inside zone to resurrect',
  
  -- Time window
  active_from TIMESTAMP NULL 
    COMMENT 'Zone becomes active at this time',
  active_to TIMESTAMP NULL 
    COMMENT 'Zone expires at this time',
  
  -- Respawn mechanics
  respawn_enabled BOOLEAN DEFAULT FALSE 
    COMMENT 'Auto-respawn zone after expiration',
  respawn_delay_seconds INT NULL 
    COMMENT 'Delay before zone respawns',
  respawn_radius_meters INT NULL 
    COMMENT 'Respawn within radius from center',
  last_respawn_at TIMESTAMP NULL 
    COMMENT 'Last respawn timestamp',
  
  -- Metadata
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE CASCADE,
  
  INDEX idx_active (active),
  INDEX idx_respawn_active_time (active_from, active_to),
  INDEX idx_respawn_respawn (respawn_enabled, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Extend looting_events table
-- ============================================

-- Add death_timestamp column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'pda_zone' AND TABLE_NAME = 'looting_events' AND COLUMN_NAME = 'death_timestamp');

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE looting_events ADD COLUMN death_timestamp TIMESTAMP NULL COMMENT "When victim died"',
  'SELECT "Column death_timestamp already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 6. Update cache_versions
-- ============================================

INSERT INTO cache_versions (cache_key, version) 
VALUES 
  ('radiation_zones', 1),
  ('respawn_zones', 1)
ON DUPLICATE KEY UPDATE version = version;

-- ============================================
-- 7. Update existing players (set defaults)
-- ============================================

UPDATE players 
SET current_wounds = 1 
WHERE current_wounds IS NULL OR current_wounds = 0;
