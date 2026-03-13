import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

export function runMigrations(db: Database.Database): void {
  const migrationsDir = path.resolve(import.meta.dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const fileName of files) {
    const sql = readFileSync(path.join(migrationsDir, fileName), "utf8");
    db.exec(sql);
  }
}
