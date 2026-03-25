import { AsyncLocalStorage } from "node:async_hooks";

import { createPostgresAdapter } from "./postgres_adapter.js";
import { createSqliteAdapter } from "./sqlite_adapter.js";
import type { DbAdapter } from "./types.js";
import type { AppConfig } from "../shared/config.js";

const dbStorage = new AsyncLocalStorage<DbAdapter>();

let rootDb: DbAdapter | null = null;

function getRequiredConfigValue(configuredValue: string | null | undefined, envName: string): string {
  if (!configuredValue) {
    throw new Error(`Missing required database setting: ${envName}`);
  }

  return configuredValue;
}

export async function initDb(config: AppConfig): Promise<DbAdapter> {
  if (rootDb) {
    return rootDb;
  }

  rootDb =
    config.dbDriver === "postgres"
      ? createPostgresAdapter({
          connectionString: config.databaseUrl ?? undefined,
          host: config.databaseUrl ? undefined : getRequiredConfigValue(config.postgresHost, "POSTGRES_HOST"),
          port: config.databaseUrl ? undefined : config.postgresPort,
          user: config.databaseUrl ? undefined : getRequiredConfigValue(config.postgresUser, "POSTGRES_USER"),
          password: config.databaseUrl ? undefined : getRequiredConfigValue(config.postgresPassword, "POSTGRES_PASSWORD"),
          database: config.databaseUrl ? undefined : getRequiredConfigValue(config.postgresDatabase, "POSTGRES_DATABASE"),
          max: config.dbPoolMax,
          ssl: config.postgresSsl ? { rejectUnauthorized: false } : undefined
        })
      : createSqliteAdapter(config.sqlitePath);

  return rootDb;
}

export function getDb(): DbAdapter {
  const transactionDb = dbStorage.getStore();

  if (transactionDb) {
    return transactionDb;
  }

  if (!rootDb) {
    throw new Error("Database has not been initialized.");
  }

  return rootDb;
}

export async function withTransaction<T>(callback: (db: DbAdapter) => Promise<T>): Promise<T> {
  return getDb().transaction((transactionDb) => dbStorage.run(transactionDb, () => callback(transactionDb)));
}

export function setDbForTests(db: DbAdapter | null): void {
  rootDb = db;
}

export async function closeDb(): Promise<void> {
  if (!rootDb) {
    return;
  }

  const dbToClose = rootDb;
  rootDb = null;
  await dbToClose.close();
}
