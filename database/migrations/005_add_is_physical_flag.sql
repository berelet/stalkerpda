-- Migration: Add is_physical flag to item_definitions
-- Date: 2026-01-09
-- Description: Add is_physical column to mark real-world items (BBs, drinks, food)

ALTER TABLE item_definitions 
ADD COLUMN is_physical BOOLEAN DEFAULT FALSE AFTER is_stackable;

-- Update existing items
-- Mark BBs as physical
UPDATE item_definitions SET is_physical = TRUE WHERE type = 'ammunition';

-- Mark food and drinks as physical
UPDATE item_definitions SET is_physical = TRUE WHERE type IN ('food', 'drink');
