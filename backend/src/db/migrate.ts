import { openDatabase } from "./connection.js";
import { runMigrations } from "./run_migrations.js";
import { getConfig } from "../shared/config.js";
import { loadEnv } from "../shared/load_env.js";

loadEnv();

const config = getConfig();
const db = openDatabase(config.sqlitePath);

runMigrations(db);

console.log(`[backend] migrations applied to ${config.sqlitePath}`);
