-- Migration: 002_seed_data.sql
-- Description: Seed initial artifact types and equipment types

-- Artifact Types
INSERT INTO artifact_types (id, name, rarity, base_value, bonus_lives, radiation_resist, other_effects) VALUES
('art-001', 'Moonlight', 'rare', 2500.00, 1, 20, '{}'),
('art-002', 'Flash', 'uncommon', 1200.00, 0, 15, '{}'),
('art-003', 'Droplet', 'common', 500.00, 0, 10, '{}'),
('art-004', 'Fireball', 'legendary', 5000.00, 2, 30, '{}'),
('art-005', 'Gravi', 'rare', 3000.00, 1, 25, '{}'),
('art-006', 'Crystal', 'uncommon', 1500.00, 0, 15, '{}'),
('art-007', 'Battery', 'common', 600.00, 0, 5, '{}'),
('art-008', 'Mica', 'rare', 2800.00, 1, 20, '{}');

-- Equipment Types - Armor
INSERT INTO equipment_types (id, name, category, bonus_wounds, radiation_resist, base_price, max_slots) VALUES
('eq-armor-001', 'Light Armor', 'armor', 1, 5, 2000.00, 1),
('eq-armor-002', 'Medium Armor', 'armor', 2, 10, 4000.00, 1),
('eq-armor-003', 'Heavy Armor', 'armor', 3, 15, 8000.00, 1);

-- Equipment Types - Rings
INSERT INTO equipment_types (id, name, category, bonus_wounds, radiation_resist, base_price, max_slots) VALUES
('eq-ring-001', 'Lead Ring', 'ring', 0, 10, 1000.00, 3),
('eq-ring-002', 'Silver Ring', 'ring', 0, 20, 2500.00, 3),
('eq-ring-003', 'Gold Ring', 'ring', 0, 30, 5000.00, 3);

-- Equipment Types - Consumables
INSERT INTO equipment_types (id, name, category, bonus_wounds, radiation_resist, radiation_removal, base_price, max_slots) VALUES
('eq-cons-001', 'Anti-Rad (Weak)', 'consumable', 0, 0, 10, 200.00, 99),
('eq-cons-002', 'Anti-Rad (Medium)', 'consumable', 0, 0, 50, 800.00, 99),
('eq-cons-003', 'Anti-Rad (Strong)', 'consumable', 0, 0, 100, 2000.00, 99);
