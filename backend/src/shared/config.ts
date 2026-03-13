import path from "node:path";

export interface AppConfig {
  port: number;
  clientOrigin: string;
  sqlitePath: string;
  sessionTtlDays: number;
  cookieName: string;
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getConfig(): AppConfig {
  return {
    port: readNumber(process.env.BACKEND_PORT, 6201),
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:6200",
    sqlitePath: path.resolve(process.cwd(), process.env.SQLITE_PATH ?? "./data/app.db"),
    sessionTtlDays: readNumber(process.env.SESSION_TTL_DAYS, 14),
    cookieName: "foc_session"
  };
}
