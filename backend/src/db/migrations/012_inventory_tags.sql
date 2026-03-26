-- Add tags column to player_inventory for item classification (e.g. "food", "weapon")
ALTER TABLE player_inventory ADD COLUMN tags TEXT DEFAULT NULL;
