-- @sqlite
CREATE TABLE IF NOT EXISTS companion_instances (
  save_id TEXT NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
  companion_id TEXT NOT NULL,
  recruited_at INTEGER NOT NULL,
  loyalty INTEGER NOT NULL DEFAULT 50,
  story_stage INTEGER NOT NULL DEFAULT 0,
  departed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (save_id, companion_id)
);

-- @postgres
CREATE TABLE IF NOT EXISTS companion_instances (
  save_id TEXT NOT NULL REFERENCES save_games(id) ON DELETE CASCADE,
  companion_id TEXT NOT NULL,
  recruited_at BIGINT NOT NULL,
  loyalty INTEGER NOT NULL DEFAULT 50,
  story_stage INTEGER NOT NULL DEFAULT 0,
  departed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (save_id, companion_id)
);
