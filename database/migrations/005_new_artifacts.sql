-- New artifact types for PDA Zone

INSERT INTO artifact_types (id, name, rarity, base_value, bonus_lives, radiation_resist, image_url, created_by) VALUES
(UUID(), 'Ember Tear', 'common', 800, 0, 5, '', NULL),
(UUID(), 'Cold Vein', 'common', 900, 0, 10, '', NULL),
(UUID(), 'Grinder Bone', 'uncommon', 1500, 1, 0, '', NULL),
(UUID(), 'Ash Heart', 'uncommon', 1800, 0, 20, '', NULL),
(UUID(), 'Static Bloom', 'rare', 3000, 1, 15, '', NULL),
(UUID(), 'Black Sap', 'rare', 3200, 0, 35, '', NULL),
(UUID(), 'Night Glass', 'rare', 3800, 2, 0, '', NULL),
(UUID(), 'Burning Halo', 'legendary', 5000, 1, 40, '', NULL),
(UUID(), 'Dead Star', 'legendary', 6500, 2, 25, '', NULL),
(UUID(), 'Zone''s Breath', 'legendary', 9000, 3, 50, '', NULL);

