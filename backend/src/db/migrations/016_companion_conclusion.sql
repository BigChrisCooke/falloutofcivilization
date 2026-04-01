ALTER TABLE companion_instances ADD COLUMN conclusion_triggered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE companion_instances ADD COLUMN conclusion_accepted INTEGER;
