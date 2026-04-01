ALTER TABLE player_characters ADD COLUMN hp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_characters ADD COLUMN max_hp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_characters ADD COLUMN equipped_weapon_id TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS combat_state (
  save_id       TEXT PRIMARY KEY,
  map_id        TEXT NOT NULL,
  turn_number   INTEGER NOT NULL DEFAULT 1,
  active_turn   TEXT NOT NULL DEFAULT 'player',
  npcs_json     TEXT NOT NULL DEFAULT '[]',
  updated_at    INTEGER NOT NULL
);
