import { getDb } from "../db/connection.js";
import type { CombatStateRow } from "../shared/types.js";

export class CombatRepo {
  public async get(saveId: string): Promise<CombatStateRow | undefined> {
    return getDb().get<CombatStateRow>(
      "SELECT * FROM combat_state WHERE save_id = ?",
      [saveId]
    );
  }

  public async upsert(row: CombatStateRow): Promise<void> {
    await getDb().run(
      `INSERT INTO combat_state (save_id, map_id, turn_number, active_turn, npcs_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (save_id) DO UPDATE SET
         map_id = excluded.map_id,
         turn_number = excluded.turn_number,
         active_turn = excluded.active_turn,
         npcs_json = excluded.npcs_json,
         updated_at = excluded.updated_at`,
      [row.save_id, row.map_id, row.turn_number, row.active_turn, row.npcs_json, row.updated_at]
    );
  }

  public async delete(saveId: string): Promise<void> {
    await getDb().run("DELETE FROM combat_state WHERE save_id = ?", [saveId]);
  }
}
