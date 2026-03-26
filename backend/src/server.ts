import { createApp } from "./app.js";
import { closeDb, initDb } from "./db/connection.js";
import { getConfig } from "./shared/config.js";
import { loadEnv } from "./shared/load_env.js";

loadEnv();

const config = getConfig();
await initDb(config);

const app = createApp(config);
const server = app.listen(config.port, () => {
  console.log(`[backend] listening on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
}

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});
