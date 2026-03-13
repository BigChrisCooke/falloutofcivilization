import path from "node:path";

export interface AppConfig {
  port: number;
  frontendOrigin: string;
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
    port: readNumber(process.env.BACKEND_PORT, 3001),
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:4321",
    sqlitePath: path.resolve(process.cwd(), process.env.SQLITE_PATH ?? "./data/app.db"),
    sessionTtlDays: readNumber(process.env.SESSION_TTL_DAYS, 14),
    cookieName: "foc_session"
  };
}
