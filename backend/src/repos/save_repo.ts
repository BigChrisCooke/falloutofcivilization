import type Database from "better-sqlite3";

import { skillPointsPerLevel } from "../../../game/src/skills.js";
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

  public updateSpecial(saveId: string, specialJson: string): void {
    this.db
      .prepare("UPDATE player_characters SET special_json = ? WHERE save_id = ?")
      .run(specialJson, saveId);
  }

  public touchSave(saveId: string): void {
    this.db
      .prepare("UPDATE save_games SET updated_at = ? WHERE id = ?")
      .run(Date.now(), saveId);
  }

  public deleteSave(saveId: string): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM player_inventory WHERE save_id = ?").run(saveId);
      this.db.prepare("DELETE FROM faction_standing WHERE save_id = ?").run(saveId);
      this.db.prepare("DELETE FROM quest_state WHERE save_id = ?").run(saveId);
      this.db.prepare("DELETE FROM map_discovery WHERE save_id = ?").run(saveId);
      this.db.prepare("DELETE FROM world_state WHERE save_id = ?").run(saveId);
      this.db.prepare("DELETE FROM player_characters WHERE save_id = ?").run(saveId);
      this.db.prepare("DELETE FROM save_games WHERE id = ?").run(saveId);
    });

    transaction();
  }

  public updateKarma(saveId: string, karma: number): void {
    this.db
      .prepare("UPDATE player_characters SET karma = ? WHERE save_id = ?")
      .run(karma, saveId);
  }

  public awardXp(saveId: string, amount: number): { newXp: number; newLevel: number; leveledUp: boolean } {
    const pc = this.findPlayerCharacter(saveId);
    if (!pc) throw new Error("Player character not found.");
    const newXp = pc.xp + amount;
    const newLevel = Math.floor(newXp / 100) + 1;
    const leveledUp = newLevel > pc.level;
    this.db
      .prepare("UPDATE player_characters SET xp = ?, level = ? WHERE save_id = ?")
      .run(newXp, newLevel, saveId);

    // Award skill points on level-up
    if (leveledUp && pc.special_json) {
      const special = JSON.parse(pc.special_json) as Record<string, number>;
      const levelsGained = newLevel - pc.level;
      const pointsPerLvl = skillPointsPerLevel(special.int ?? 5);
      this.awardSkillPoints(saveId, levelsGained * pointsPerLvl);
    }

    return { newXp, newLevel, leveledUp };
  }

  public awardSkillPoints(saveId: string, amount: number): void {
    this.db
      .prepare("UPDATE player_characters SET unspent_skill_points = unspent_skill_points + ? WHERE save_id = ?")
      .run(amount, saveId);
  }

  public updateSkills(saveId: string, skillsJson: string, unspentPoints: number): void {
    this.db
      .prepare("UPDATE player_characters SET skills_json = ?, unspent_skill_points = ? WHERE save_id = ?")
      .run(skillsJson, unspentPoints, saveId);
  }

  public setTaggedSkills(saveId: string, taggedSkillsJson: string): void {
    this.db
      .prepare("UPDATE player_characters SET tagged_skills_json = ? WHERE save_id = ?")
      .run(taggedSkillsJson, saveId);
  }
}
