import path from "node:path";

import type { DbDialect } from "../db/types.js";

export interface AppConfig {
  port: number;
  clientOrigin: string;
  clientDistPath: string;
  dbDriver: DbDialect;
  sqlitePath: string;
  databaseUrl: string | null;
  postgresHost: string | null;
  postgresPort: number;
  postgresUser: string | null;
  postgresPassword: string | null;
  postgresDatabase: string | null;
  postgresSsl: boolean;
  dbPoolMax: number;
  sessionTtlDays: number;
  cookieName: string;
  cookieSecure: boolean;
  trustProxy: boolean;
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value === "1" || value.toLowerCase() === "true";
}

export function getConfig(): AppConfig {
  const dbDriver = (process.env.DB_DRIVER ?? "sqlite").toLowerCase();
  const sqlitePath = process.env.SQLITE_PATH ?? "./data/app.db";

  if (dbDriver !== "sqlite" && dbDriver !== "postgres") {
    throw new Error(`Unsupported DB_DRIVER value: ${dbDriver}`);
  }

  return {
    port: readNumber(process.env.PORT ?? process.env.BACKEND_PORT, 6201),
    clientOrigin: process.env.CLIENT_ORIGIN ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:6200",
    clientDistPath: path.resolve(process.cwd(), process.env.CLIENT_DIST_PATH ?? "../client/dist"),
    dbDriver,
    sqlitePath: sqlitePath === ":memory:" ? sqlitePath : path.resolve(process.cwd(), sqlitePath),
    databaseUrl: process.env.DATABASE_URL ?? null,
    postgresHost: process.env.POSTGRES_HOST ?? process.env.PGHOST ?? null,
    postgresPort: readNumber(process.env.POSTGRES_PORT ?? process.env.PGPORT, 5432),
    postgresUser: process.env.POSTGRES_USER ?? process.env.PGUSER ?? null,
    postgresPassword: process.env.POSTGRES_PASSWORD ?? process.env.PGPASSWORD ?? null,
    postgresDatabase: process.env.POSTGRES_DATABASE ?? process.env.PGDATABASE ?? null,
    postgresSsl: readBoolean(process.env.POSTGRES_SSL, false),
    dbPoolMax: readNumber(process.env.DB_POOL_MAX, 10),
    sessionTtlDays: readNumber(process.env.SESSION_TTL_DAYS, 14),
    cookieName: "foc_session",
    cookieSecure: readBoolean(process.env.COOKIE_SECURE, false),
    trustProxy: readBoolean(process.env.TRUST_PROXY, false)
  };
}
