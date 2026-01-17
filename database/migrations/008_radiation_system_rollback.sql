-- Rollback for Migration 008: Radiation & Death System

-- Drop loot_events table
DROP TABLE IF EXISTS loot_events;

-- Drop respawn_zones table
DROP TABLE IF EXISTS respawn_zones;

-- Remove indexes from radiation_zones
DROP INDEX IF EXISTS idx_active_time ON radiation_zones;
DROP INDEX IF EXISTS idx_zone_respawn ON radiation_zones;

-- Remove columns from radiation_zones
ALTER TABLE radiation_zones
  DROP COLUMN IF EXISTS active_from,
  DROP COLUMN IF EXISTS active_to,
  DROP COLUMN IF EXISTS respawn_enabled,
  DROP COLUMN IF EXISTS respawn_delay_seconds,
  DROP COLUMN IF EXISTS respawn_radius_meters,
  DROP COLUMN IF EXISTS last_respawn_at;

-- Remove indexes from artifacts
DROP INDEX IF EXISTS idx_respawn ON artifacts;

-- Remove columns from artifacts
ALTER TABLE artifacts
  DROP COLUMN IF EXISTS pickup_radiation,
  DROP COLUMN IF EXISTS pickup_radiation_variance,
  DROP COLUMN IF EXISTS respawn_enabled,
  DROP COLUMN IF EXISTS respawn_delay_seconds,
  DROP COLUMN IF EXISTS respawn_radius_meters,
  DROP COLUMN IF EXISTS last_respawn_at;

-- Remove indexes from players
DROP INDEX IF EXISTS idx_radiation_zone ON players;
DROP INDEX IF EXISTS idx_status_lives ON players;

-- Remove columns from players
ALTER TABLE players
  DROP COLUMN IF EXISTS current_radiation_zone_id,
  DROP COLUMN IF EXISTS last_radiation_calc_at,
  DROP COLUMN IF EXISTS resurrection_progress_seconds,
  DROP COLUMN IF EXISTS last_resurrection_calc_at,
  DROP COLUMN IF EXISTS dead_at,
  DROP COLUMN IF EXISTS current_wounds;

-- Remove cache keys
DELETE FROM cache_versions WHERE cache_key IN ('radiation_zones', 'respawn_zones');
