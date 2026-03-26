import type Database from "better-sqlite3";

import type { PlayerInventoryRow } from "../shared/types.js";

export class InventoryRepo {
  public constructor(private readonly db: Database.Database) {}

  public getAll(saveId: string): PlayerInventoryRow[] {
    return this.db
      .prepare("SELECT * FROM player_inventory WHERE save_id = ? ORDER BY collected_at ASC")
      .all(saveId) as PlayerInventoryRow[];
  }

  public getCollectedItemIds(saveId: string): string[] {
    const rows = this.db
      .prepare("SELECT item_id FROM player_inventory WHERE save_id = ?")
      .all(saveId) as Array<{ item_id: string }>;

    return rows.map((row) => row.item_id);
  }

  public findItem(saveId: string, itemId: string): PlayerInventoryRow | undefined {
    return this.db
      .prepare("SELECT * FROM player_inventory WHERE save_id = ? AND item_id = ?")
      .get(saveId, itemId) as PlayerInventoryRow | undefined;
  }

  public findItemByTag(saveId: string, tag: string): PlayerInventoryRow | undefined {
    const rows = this.db
      .prepare("SELECT * FROM player_inventory WHERE save_id = ? AND tags IS NOT NULL")
      .all(saveId) as PlayerInventoryRow[];

    return rows.find((row) => {
      const tags: string[] = JSON.parse(row.tags ?? "[]");
      return tags.includes(tag);
    });
  }

  public addItem(row: PlayerInventoryRow): void {
    this.db
      .prepare(
        `INSERT INTO player_inventory (save_id, item_id, label, owned_by, quantity, description, tags, collected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (save_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity`
      )
      .run(row.save_id, row.item_id, row.label, row.owned_by, row.quantity, row.description, row.tags ?? null, row.collected_at);
  }

  public removeItem(saveId: string, itemId: string): void {
    this.db
      .prepare("DELETE FROM player_inventory WHERE save_id = ? AND item_id = ?")
      .run(saveId, itemId);
  }

  public updateQuantity(saveId: string, itemId: string, quantity: number): void {
    this.db
      .prepare("UPDATE player_inventory SET quantity = ? WHERE save_id = ? AND item_id = ?")
      .run(quantity, saveId, itemId);
  }
}
