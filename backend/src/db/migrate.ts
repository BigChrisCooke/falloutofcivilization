import { closeDb, initDb } from "./connection.js";
import { runMigrations } from "./run_migrations.js";
import { getConfig } from "../shared/config.js";
import { loadEnv } from "../shared/load_env.js";

loadEnv();

const config = getConfig();
const db = await initDb(config);

await runMigrations(db);

if (config.dbDriver === "postgres") {
  console.log("[backend] migrations applied to postgres");
} else {
  console.log(`[backend] migrations applied to ${config.sqlitePath}`);
}

await closeDb();
