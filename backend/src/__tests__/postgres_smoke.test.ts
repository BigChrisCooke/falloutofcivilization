import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { closeDb, getDb, setDbForTests } from "../db/connection.js";
import { createPostgresAdapter } from "../db/postgres_adapter.js";
import { runMigrations } from "../db/run_migrations.js";
import { createTestConfig } from "./test_utils.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

async function resetPublicSchema() {
  await getDb().exec("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
}

describe.skipIf(!testDatabaseUrl)("postgres smoke", () => {
  beforeEach(async () => {
    await closeDb();
    const db = createPostgresAdapter({
      connectionString: testDatabaseUrl,
      max: 1
    });
    setDbForTests(db);
  });

  afterEach(async () => {
    await closeDb();
    setDbForTests(null);
  });

  it("boots fresh and runs the auth/save smoke flow", async () => {
    await resetPublicSchema();
    await runMigrations(getDb());

    const app = createApp({
      ...createTestConfig(),
      dbDriver: "postgres",
      databaseUrl: testDatabaseUrl!,
      sqlitePath: path.resolve(process.cwd(), "./unused.db")
    });
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      username: "postgres-smoke",
      password: "desertwind42"
    });

    expect(registerResponse.status).toBe(201);

    const createSaveResponse = await agent.post("/api/saves").send({
      name: "Postgres Smoke Save"
    });

    expect(createSaveResponse.status).toBe(201);

    const stateResponse = await agent.get("/api/game/state");

    expect(stateResponse.status).toBe(200);
    expect(stateResponse.body.saveLoaded).toBe(true);
    expect(stateResponse.body.state.save.name).toBe("Postgres Smoke Save");
  });

  it("upgrades a partial Postgres schema and preserves existing rows", async () => {
    await resetPublicSchema();
    await runMigrations(getDb(), { throughFileName: "003_player_special.sql" });

    await getDb().run("INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)", [
      "user-1",
      "pg-user",
      "hash",
      1000
    ]);
    await getDb().run(
      "INSERT INTO save_games (id, user_id, name, region_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ["save-1", "user-1", "PG Save", "frontier_valley", 1000, 1000]
    );
    await getDb().run(
      "INSERT INTO player_characters (id, save_id, name, level, archetype, created_at, special_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["pc-1", "save-1", "Courier", 1, "survivor", 1000, null]
    );
    await getDb().run(
      "INSERT INTO world_state (save_id, current_screen, current_region_id, current_location_id, current_map_id, current_panel, updated_at, player_x, player_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ["save-1", "overworld", "frontier_valley", null, "frontier_valley", null, 1000, 4, 5]
    );
    await getDb().run(
      "INSERT INTO map_discovery (save_id, discovered_locations_json, updated_at, discovered_tiles_json) VALUES (?, ?, ?, ?)",
      ["save-1", "[]", 1000, "[]"]
    );
    await getDb().run(
      "INSERT INTO quest_state (save_id, active_quests_json, completed_quests_json, updated_at) VALUES (?, ?, ?, ?)",
      ["save-1", "[]", "[]", 1000]
    );
    await getDb().run("INSERT INTO faction_standing (save_id, standings_json, updated_at) VALUES (?, ?, ?)", [
      "save-1",
      "{}",
      1000
    ]);

    await runMigrations(getDb());

    const questState = await getDb().get<{ dialogue_state_json: string; collected_actions_json: string }>(
      "SELECT dialogue_state_json, collected_actions_json FROM quest_state WHERE save_id = ?",
      ["save-1"]
    );

    expect(questState).toEqual({
      dialogue_state_json: "{}",
      collected_actions_json: "[]"
    });
  });
});
