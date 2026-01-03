-- Add image_url column to artifact_types
ALTER TABLE artifact_types ADD COLUMN image_url VARCHAR(500) AFTER other_effects;
