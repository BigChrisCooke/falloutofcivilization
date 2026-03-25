import { afterEach, describe, expect, it } from "vitest";

import { closeDb } from "../db/connection.js";
import { runMigrations } from "../db/run_migrations.js";
import { createSqliteAdapter } from "../db/sqlite_adapter.js";

describe("migration upgrade path", () => {
  afterEach(async () => {
    await closeDb();
  });

  it("upgrades a pre-inventory SQLite schema without losing existing save data", async () => {
    const db = createSqliteAdapter(":memory:");

    await runMigrations(db, { throughFileName: "003_player_special.sql" });

    await db.run("INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)", [
      "user-1",
      "courier",
      "hash",
      1000
    ]);
    await db.run(
      "INSERT INTO save_games (id, user_id, name, region_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ["save-1", "user-1", "Wasteland", "frontier_valley", 1000, 1000]
    );
    await db.run(
      "INSERT INTO player_characters (id, save_id, name, level, archetype, created_at, special_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["pc-1", "save-1", "Courier", 1, "survivor", 1000, null]
    );
    await db.run(
      "INSERT INTO world_state (save_id, current_screen, current_region_id, current_location_id, current_map_id, current_panel, updated_at, player_x, player_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ["save-1", "overworld", "frontier_valley", null, "frontier_valley", null, 1000, 4, 5]
    );
    await db.run(
      "INSERT INTO map_discovery (save_id, discovered_locations_json, updated_at, discovered_tiles_json) VALUES (?, ?, ?, ?)",
      ["save-1", "[]", 1000, "[]"]
    );
    await db.run(
      "INSERT INTO quest_state (save_id, active_quests_json, completed_quests_json, updated_at) VALUES (?, ?, ?, ?)",
      ["save-1", "[]", "[]", 1000]
    );
    await db.run("INSERT INTO faction_standing (save_id, standings_json, updated_at) VALUES (?, ?, ?)", [
      "save-1",
      "{}",
      1000
    ]);

    await runMigrations(db);

    const player = await db.get<{ karma: number; xp: number }>(
      "SELECT karma, xp FROM player_characters WHERE save_id = ?",
      ["save-1"]
    );
    const questState = await db.get<{ dialogue_state_json: string; collected_actions_json: string }>(
      "SELECT dialogue_state_json, collected_actions_json FROM quest_state WHERE save_id = ?",
      ["save-1"]
    );
    const mapDiscovery = await db.get<{ entered_locations_json: string | null }>(
      "SELECT entered_locations_json FROM map_discovery WHERE save_id = ?",
      ["save-1"]
    );

    expect(player).toEqual({ karma: 0, xp: 0 });
    expect(questState).toEqual({
      dialogue_state_json: "{}",
      collected_actions_json: "[]"
    });
    expect(mapDiscovery?.entered_locations_json ?? null).toBeNull();

    await db.run(
      "INSERT INTO player_inventory (save_id, item_id, label, owned_by, quantity, description, collected_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["save-1", "caps", "Caps", null, 10, "currency", 1001]
    );
    await db.run(
      "INSERT INTO companion_instances (save_id, companion_id, recruited_at, loyalty, story_stage, departed, story_stage_viewed) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["save-1", "dex_caravan_guard", 1002, 50, 0, 0, -1]
    );

    const inventoryCount = await db.get<{ count: number }>("SELECT COUNT(*) AS count FROM player_inventory");
    const companionCount = await db.get<{ count: number }>("SELECT COUNT(*) AS count FROM companion_instances");

    expect(inventoryCount?.count).toBe(1);
    expect(companionCount?.count).toBe(1);

    await db.close();
  });
});
