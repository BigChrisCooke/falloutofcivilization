ALTER TABLE world_state ADD COLUMN player_x INTEGER NULL;
ALTER TABLE world_state ADD COLUMN player_y INTEGER NULL;

ALTER TABLE map_discovery ADD COLUMN discovered_tiles_json TEXT NULL;
