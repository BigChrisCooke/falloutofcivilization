import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

export function runMigrations(db: Database.Database): void {
  const migrationsDir = path.resolve(import.meta.dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const appliedAt = Date.now();

  db.prepare(
    "CREATE TABLE IF NOT EXISTS schema_migrations (file_name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)"
  ).run();

  const appliedFiles = new Set(
    (db.prepare("SELECT file_name FROM schema_migrations ORDER BY file_name").all() as Array<{ file_name: string }>).map(
      (row) => row.file_name
    )
  );

  for (const fileName of files) {
    if (appliedFiles.has(fileName)) {
      continue;
    }

    const sql = readFileSync(path.join(migrationsDir, fileName), "utf8");
    const transaction = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (file_name, applied_at) VALUES (?, ?)").run(fileName, appliedAt);
    });

    transaction();
  }
}
