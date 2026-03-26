import { getDb } from "../db/connection.js";
import type { PlayerInventoryRow } from "../shared/types.js";

export class InventoryRepo {
  public async getAll(saveId: string): Promise<PlayerInventoryRow[]> {
    return getDb().all<PlayerInventoryRow>(
      "SELECT * FROM player_inventory WHERE save_id = ? ORDER BY collected_at ASC",
      [saveId]
    );
  }

  public async getCollectedItemIds(saveId: string): Promise<string[]> {
    const rows = await getDb().all<{ item_id: string }>(
      "SELECT item_id FROM player_inventory WHERE save_id = ?",
      [saveId]
    );

    return rows.map((row) => row.item_id);
  }

  public async findItem(saveId: string, itemId: string): Promise<PlayerInventoryRow | undefined> {
    return getDb().get<PlayerInventoryRow>(
      "SELECT * FROM player_inventory WHERE save_id = ? AND item_id = ?",
      [saveId, itemId]
    );
  }

  public async findItemByTag(saveId: string, tag: string): Promise<PlayerInventoryRow | undefined> {
    const rows = await getDb().all<PlayerInventoryRow>(
      "SELECT * FROM player_inventory WHERE save_id = ? AND tags IS NOT NULL",
      [saveId]
    );

    return rows.find((row) => {
      const tags: string[] = JSON.parse(row.tags ?? "[]");
      return tags.includes(tag);
    });
  }

  public async addItem(row: PlayerInventoryRow): Promise<void> {
    await getDb().run(
      `INSERT INTO player_inventory (save_id, item_id, label, owned_by, quantity, description, tags, collected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (save_id, item_id) DO UPDATE SET quantity = player_inventory.quantity + excluded.quantity`,
      [row.save_id, row.item_id, row.label, row.owned_by, row.quantity, row.description, row.tags ?? null, row.collected_at]
    );
  }

  public async removeItem(saveId: string, itemId: string): Promise<void> {
    await getDb().run("DELETE FROM player_inventory WHERE save_id = ? AND item_id = ?", [saveId, itemId]);
  }

  public async updateQuantity(saveId: string, itemId: string, quantity: number): Promise<void> {
    await getDb().run("UPDATE player_inventory SET quantity = ? WHERE save_id = ? AND item_id = ?", [
      quantity,
      saveId,
      itemId
    ]);
  }
}
