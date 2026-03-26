ALTER TABLE player_characters ADD COLUMN skills_json TEXT DEFAULT NULL;
ALTER TABLE player_characters ADD COLUMN tagged_skills_json TEXT DEFAULT NULL;
ALTER TABLE player_characters ADD COLUMN unspent_skill_points INTEGER NOT NULL DEFAULT 0;
