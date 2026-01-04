-- Migration: Inventory System v2.0
-- Date: 2026-01-03
-- Description: Update inventory system with equipment slots and backpack

-- ============================================
-- 1. Update player_equipment table
-- ============================================

-- Drop old equipped column
ALTER TABLE player_equipment
  DROP COLUMN equipped;

-- Add new slot system
ALTER TABLE player_equipment
  ADD COLUMN slot_type ENUM('backpack', 'armor', 'ring', 'artifact') DEFAULT 'backpack' AFTER equipment_type_id,
  ADD COLUMN slot_position INT DEFAULT 0 AFTER slot_type,
  ADD INDEX idx_slot (player_id, slot_type, slot_position);

-- ============================================
-- 2. Update artifacts table
-- ============================================

-- Add slot_type for artifacts
ALTER TABLE artifacts
  ADD COLUMN slot_type ENUM('backpack', 'artifact') DEFAULT 'backpack' AFTER owner_id,
  ADD INDEX idx_artifact_slot (owner_id, slot_type);

-- ============================================
-- 3. Update equipment_types table
-- ============================================

-- Change max_slots for rings from 3 to 2
UPDATE equipment_types 
SET max_slots = 2 
WHERE category = 'ring';

-- ============================================
-- 4. Add backpack capacity to players
-- ============================================

ALTER TABLE players
  ADD COLUMN backpack_capacity INT DEFAULT 50 AFTER current_radiation;

-- ============================================
-- 5. Update artifact_types for bonusLives
-- ============================================

-- Ensure bonus_lives column exists (should already exist from 001_initial_schema.sql)
-- This is just a safety check
ALTER TABLE artifact_types
  MODIFY COLUMN bonus_lives INT DEFAULT 0;

-- ============================================
-- 6. Create helper views (optional)
-- ============================================

-- View: Player equipped items
CREATE OR REPLACE VIEW player_equipped_items AS
SELECT 
  pe.player_id,
  pe.id AS item_id,
  pe.equipment_type_id,
  et.name AS item_name,
  et.category,
  pe.slot_type,
  pe.slot_position,
  et.bonus_wounds,
  et.radiation_resist
FROM player_equipment pe
JOIN equipment_types et ON pe.equipment_type_id = et.id
WHERE pe.slot_type != 'backpack';

-- View: Player backpack items
CREATE OR REPLACE VIEW player_backpack_items AS
SELECT 
  pe.player_id,
  pe.id AS item_id,
  pe.equipment_type_id,
  et.name AS item_name,
  et.category,
  et.base_price
FROM player_equipment pe
JOIN equipment_types et ON pe.equipment_type_id = et.id
WHERE pe.slot_type = 'backpack';

-- View: Player total bonuses
CREATE OR REPLACE VIEW player_total_bonuses AS
SELECT 
  p.id AS player_id,
  p.nickname,
  COALESCE(SUM(et.bonus_wounds), 0) AS total_wounds,
  COALESCE(SUM(et.radiation_resist), 0) AS total_equipment_rad_resist,
  COALESCE(
    (SELECT SUM(at.radiation_resist) 
     FROM artifacts a 
     JOIN artifact_types at ON a.type_id = at.id 
     WHERE a.owner_id = p.id AND a.slot_type = 'artifact'), 
    0
  ) AS total_artifact_rad_resist,
  COALESCE(
    (SELECT SUM(at.bonus_lives) 
     FROM artifacts a 
     JOIN artifact_types at ON a.type_id = at.id 
     WHERE a.owner_id = p.id AND a.slot_type = 'artifact'), 
    0
  ) AS total_bonus_lives
FROM players p
LEFT JOIN player_equipment pe ON p.id = pe.player_id AND pe.slot_type != 'backpack'
LEFT JOIN equipment_types et ON pe.equipment_type_id = et.id
GROUP BY p.id, p.nickname;

-- ============================================
-- 7. Data migration (if needed)
-- ============================================

-- If there's existing data with old 'equipped' column, migrate it
-- This assumes old data had equipped=1 for equipped items
-- Uncomment if needed:

-- UPDATE player_equipment
-- SET slot_type = CASE 
--   WHEN equipment_type_id IN (SELECT id FROM equipment_types WHERE category = 'armor') THEN 'armor'
--   WHEN equipment_type_id IN (SELECT id FROM equipment_types WHERE category = 'ring') THEN 'ring'
--   ELSE 'backpack'
-- END
-- WHERE slot_type = 'backpack';

-- ============================================
-- 8. Constraints and validation
-- ============================================

-- Ensure only one armor equipped per player
DELIMITER //
CREATE TRIGGER check_armor_slot_limit
BEFORE INSERT ON player_equipment
FOR EACH ROW
BEGIN
  IF NEW.slot_type = 'armor' THEN
    IF (SELECT COUNT(*) FROM player_equipment 
        WHERE player_id = NEW.player_id AND slot_type = 'armor') >= 1 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'Player can only equip one armor';
    END IF;
  END IF;
END//
DELIMITER ;

-- Ensure only two rings equipped per player
DELIMITER //
CREATE TRIGGER check_ring_slot_limit
BEFORE INSERT ON player_equipment
FOR EACH ROW
BEGIN
  IF NEW.slot_type = 'ring' THEN
    IF (SELECT COUNT(*) FROM player_equipment 
        WHERE player_id = NEW.player_id AND slot_type = 'ring') >= 2 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'Player can only equip two rings';
    END IF;
  END IF;
END//
DELIMITER ;

-- Ensure only one artifact equipped per player
DELIMITER //
CREATE TRIGGER check_artifact_slot_limit
BEFORE UPDATE ON artifacts
FOR EACH ROW
BEGIN
  IF NEW.slot_type = 'artifact' THEN
    IF (SELECT COUNT(*) FROM artifacts 
        WHERE owner_id = NEW.owner_id AND slot_type = 'artifact' AND id != NEW.id) >= 1 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'Player can only equip one artifact';
    END IF;
  END IF;
END//
DELIMITER ;

-- Ensure backpack capacity limit (50 items)
DELIMITER //
CREATE TRIGGER check_backpack_capacity
BEFORE INSERT ON player_equipment
FOR EACH ROW
BEGIN
  DECLARE backpack_count INT;
  DECLARE capacity INT;
  
  IF NEW.slot_type = 'backpack' THEN
    SELECT COUNT(*) INTO backpack_count
    FROM player_equipment
    WHERE player_id = NEW.player_id AND slot_type = 'backpack';
    
    SELECT backpack_capacity INTO capacity
    FROM players
    WHERE id = NEW.player_id;
    
    IF backpack_count >= capacity THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'Backpack is full';
    END IF;
  END IF;
END//
DELIMITER ;

-- ============================================
-- Migration complete
-- ============================================
