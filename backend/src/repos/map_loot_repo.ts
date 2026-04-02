import { getDb } from "../db/connection.js";
import type { MapLootRow } from "../shared/types.js";

export class MapLootRepo {
  async drop(row: MapLootRow): Promise<void> {
    await getDb().run(
      "INSERT INTO map_loot (id, save_id, map_id, item_id, label, x, y, dropped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [row.id, row.save_id, row.map_id, row.item_id, row.label, row.x, row.y, row.dropped_at]
    );
  }

  async getForMap(saveId: string, mapId: string): Promise<MapLootRow[]> {
    return getDb().all<MapLootRow>(
      "SELECT * FROM map_loot WHERE save_id = ? AND map_id = ?",
      [saveId, mapId]
    );
  }

  async find(saveId: string, lootId: string): Promise<MapLootRow | undefined> {
    return getDb().get<MapLootRow>(
      "SELECT * FROM map_loot WHERE id = ? AND save_id = ?",
      [lootId, saveId]
    );
  }

  async remove(saveId: string, lootId: string): Promise<void> {
    await getDb().run(
      "DELETE FROM map_loot WHERE id = ? AND save_id = ?",
      [lootId, saveId]
    );
  }

  async removeForSave(saveId: string): Promise<void> {
    await getDb().run("DELETE FROM map_loot WHERE save_id = ?", [saveId]);
  }
}
