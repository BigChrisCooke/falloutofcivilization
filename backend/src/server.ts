import { createApp } from "./app.js";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/run_migrations.js";
import { getConfig } from "./shared/config.js";
import { loadEnv } from "./shared/load_env.js";

loadEnv();

const config = getConfig();
const db = openDatabase(config.sqlitePath);

runMigrations(db);

const app = createApp(db, config);

app.listen(config.port, () => {
  console.log(`[backend] listening on http://localhost:${config.port}`);
});
