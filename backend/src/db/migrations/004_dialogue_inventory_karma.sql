-- Track dialogue state per NPC (which node the player is on)
ALTER TABLE quest_state ADD COLUMN dialogue_state_json TEXT NOT NULL DEFAULT '{}';

-- Server-persisted inventory
CREATE TABLE IF NOT EXISTS player_inventory (
  save_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  label TEXT NOT NULL,
  owned_by TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  collected_at INTEGER NOT NULL,
  PRIMARY KEY (save_id, item_id),
  FOREIGN KEY (save_id) REFERENCES save_games(id)
);

-- Karma tracking
ALTER TABLE player_characters ADD COLUMN karma INTEGER NOT NULL DEFAULT 0;
