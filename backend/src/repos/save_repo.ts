import type Database from "better-sqlite3";

import type { PlayerCharacterRow, SaveGameRow } from "../shared/types.js";

export class SaveRepo {
  public constructor(private readonly db: Database.Database) {}

  public listByUser(userId: string): SaveGameRow[] {
    return this.db
      .prepare("SELECT * FROM save_games WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as SaveGameRow[];
  }

  public findById(saveId: string): SaveGameRow | undefined {
    return this.db.prepare("SELECT * FROM save_games WHERE id = ?").get(saveId) as SaveGameRow | undefined;
  }

  public create(save: SaveGameRow, playerCharacter: PlayerCharacterRow): void {
    const transaction = this.db.transaction(() => {
      this.db
        .prepare("INSERT INTO save_games (id, user_id, name, region_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(save.id, save.user_id, save.name, save.region_id, save.created_at, save.updated_at);
      this.db
        .prepare("INSERT INTO player_characters (id, save_id, name, level, archetype, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(
          playerCharacter.id,
          playerCharacter.save_id,
          playerCharacter.name,
          playerCharacter.level,
          playerCharacter.archetype,
          playerCharacter.created_at
        );
    });

    transaction();
  }

  public findPlayerCharacter(saveId: string): PlayerCharacterRow | undefined {
    return this.db.prepare("SELECT * FROM player_characters WHERE save_id = ?").get(saveId) as PlayerCharacterRow | undefined;
  }
}
