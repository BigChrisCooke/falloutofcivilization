import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { DbAdapter, DbDialect } from "./types.js";

export interface RunMigrationsOptions {
  throughFileName?: string;
}

function resolveMigrationSql(sql: string, dialect: DbDialect): string {
  if (!sql.includes("-- @")) {
    return sql;
  }

  const includedLines: string[] = [];
  let currentSection: "all" | "sqlite" | "postgres" = "all";

  for (const line of sql.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (trimmed === "-- @all") {
      currentSection = "all";
      continue;
    }

    if (trimmed === "-- @sqlite") {
      currentSection = "sqlite";
      continue;
    }

    if (trimmed === "-- @postgres") {
      currentSection = "postgres";
      continue;
    }

    if (currentSection === "all" || currentSection === dialect) {
      includedLines.push(line);
    }
  }

  return includedLines.join("\n").trim();
}

function getMigrationFiles(throughFileName?: string): string[] {
  const migrationsDir = path.resolve(import.meta.dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  if (!throughFileName) {
    return files;
  }

  const migrationIndex = files.indexOf(throughFileName);
  if (migrationIndex === -1) {
    throw new Error(`Unknown migration file: ${throughFileName}`);
  }

  return files.slice(0, migrationIndex + 1);
}

export async function runMigrations(db: DbAdapter, options: RunMigrationsOptions = {}): Promise<void> {
  const migrationsDir = path.resolve(import.meta.dirname, "migrations");
  const files = getMigrationFiles(options.throughFileName);
  const appliedAt = Date.now();

  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (file_name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)"
  );

  const appliedRows = await db.all<{ file_name: string }>(
    "SELECT file_name FROM schema_migrations ORDER BY file_name"
  );
  const appliedFiles = new Set(appliedRows.map((row) => row.file_name));

  for (const fileName of files) {
    if (appliedFiles.has(fileName)) {
      continue;
    }

    const rawSql = readFileSync(path.join(migrationsDir, fileName), "utf8");
    const sql = resolveMigrationSql(rawSql, db.dialect);

    await db.transaction(async (transactionDb) => {
      if (sql.length > 0) {
        await transactionDb.exec(sql);
      }

      await transactionDb.run(
        "INSERT INTO schema_migrations (file_name, applied_at) VALUES (?, ?)",
        [fileName, appliedAt]
      );
    });
  }
}
