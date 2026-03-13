CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  current_save_id TEXT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS save_games (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  region_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_save_games_user_id ON save_games(user_id);

CREATE TABLE IF NOT EXISTS player_characters (
  id TEXT PRIMARY KEY,
  save_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  archetype TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (save_id) REFERENCES save_games(id)
);

CREATE TABLE IF NOT EXISTS world_state (
  save_id TEXT PRIMARY KEY,
  current_screen TEXT NOT NULL,
  current_region_id TEXT NOT NULL,
  current_location_id TEXT NULL,
  current_map_id TEXT NULL,
  current_panel TEXT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (save_id) REFERENCES save_games(id)
);

CREATE TABLE IF NOT EXISTS map_discovery (
  save_id TEXT PRIMARY KEY,
  discovered_locations_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (save_id) REFERENCES save_games(id)
);

CREATE TABLE IF NOT EXISTS quest_state (
  save_id TEXT PRIMARY KEY,
  active_quests_json TEXT NOT NULL,
  completed_quests_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (save_id) REFERENCES save_games(id)
);

CREATE TABLE IF NOT EXISTS faction_standing (
  save_id TEXT PRIMARY KEY,
  standings_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (save_id) REFERENCES save_games(id)
);
