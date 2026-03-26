import path from "node:path";

import { closeDb, setDbForTests } from "../db/connection.js";
import { runMigrations } from "../db/run_migrations.js";
import { createSqliteAdapter } from "../db/sqlite_adapter.js";
import type { AppConfig } from "../shared/config.js";

export async function resetTestDb(): Promise<void> {
  await closeDb();
  const db = createSqliteAdapter(":memory:");
  setDbForTests(db);
  await runMigrations(db);
}

export async function cleanupTestDb(): Promise<void> {
  await closeDb();
  setDbForTests(null);
}

export function createTestConfig(): AppConfig {
  return {
    port: 3001,
    clientOrigin: "http://localhost:4321",
    clientDistPath: path.resolve(process.cwd(), "..", "client", "dist"),
    dbDriver: "sqlite",
    sqlitePath: ":memory:",
    databaseUrl: null,
    postgresHost: null,
    postgresPort: 5432,
    postgresUser: null,
    postgresPassword: null,
    postgresDatabase: null,
    postgresSsl: false,
    dbPoolMax: 2,
    sessionTtlDays: 14,
    cookieName: "foc_session",
    cookieSecure: false,
    trustProxy: false
  };
}
