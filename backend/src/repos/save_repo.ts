import { skillPointsPerLevel } from "../../../game/src/skills.js";
import { withTransaction, getDb } from "../db/connection.js";
import type { PlayerCharacterRow, SaveGameRow } from "../shared/types.js";

export class SaveRepo {
  public async listByUser(userId: string): Promise<SaveGameRow[]> {
    return getDb().all<SaveGameRow>(
      "SELECT * FROM save_games WHERE user_id = ? ORDER BY updated_at DESC",
      [userId]
    );
  }

  public async findById(saveId: string): Promise<SaveGameRow | undefined> {
    return getDb().get<SaveGameRow>("SELECT * FROM save_games WHERE id = ?", [saveId]);
  }

  public async create(save: SaveGameRow, playerCharacter: PlayerCharacterRow): Promise<void> {
    await withTransaction(async () => {
      const db = getDb();

      await db.run(
        "INSERT INTO save_games (id, user_id, name, region_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [save.id, save.user_id, save.name, save.region_id, save.created_at, save.updated_at]
      );

      await db.run(
        "INSERT INTO player_characters (id, save_id, name, level, xp, archetype, special_json, karma, skills_json, tagged_skills_json, unspent_skill_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          playerCharacter.id,
          playerCharacter.save_id,
          playerCharacter.name,
          playerCharacter.level,
          playerCharacter.xp,
          playerCharacter.archetype,
          playerCharacter.special_json,
          playerCharacter.karma,
          playerCharacter.skills_json,
          playerCharacter.tagged_skills_json,
          playerCharacter.unspent_skill_points,
          playerCharacter.created_at
        ]
      );
    });
  }

  public async findPlayerCharacter(saveId: string): Promise<PlayerCharacterRow | undefined> {
    return getDb().get<PlayerCharacterRow>("SELECT * FROM player_characters WHERE save_id = ?", [saveId]);
  }

  public async updateSpecial(saveId: string, specialJson: string): Promise<void> {
    await getDb().run("UPDATE player_characters SET special_json = ? WHERE save_id = ?", [specialJson, saveId]);
  }

  public async touchSave(saveId: string): Promise<void> {
    await getDb().run("UPDATE save_games SET updated_at = ? WHERE id = ?", [Date.now(), saveId]);
  }

  public async deleteSave(saveId: string): Promise<void> {
    await withTransaction(async () => {
      const db = getDb();

      await db.run("DELETE FROM player_inventory WHERE save_id = ?", [saveId]);
      await db.run("DELETE FROM faction_standing WHERE save_id = ?", [saveId]);
      await db.run("DELETE FROM quest_state WHERE save_id = ?", [saveId]);
      await db.run("DELETE FROM map_discovery WHERE save_id = ?", [saveId]);
      await db.run("DELETE FROM world_state WHERE save_id = ?", [saveId]);
      await db.run("DELETE FROM player_characters WHERE save_id = ?", [saveId]);
      await db.run("DELETE FROM save_games WHERE id = ?", [saveId]);
    });
  }

  public async updateKarma(saveId: string, karma: number): Promise<void> {
    await getDb().run("UPDATE player_characters SET karma = ? WHERE save_id = ?", [karma, saveId]);
  }

  public async awardXp(saveId: string, amount: number): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
    return withTransaction(async () => {
      const db = getDb();
      const pc = await this.findPlayerCharacter(saveId);

      if (!pc) {
        throw new Error("Player character not found.");
      }

      const currentXp = pc.xp ?? 0;
      const newXp = currentXp + amount;
      const newLevel = Math.floor(newXp / 100) + 1;
      const leveledUp = newLevel > pc.level;

      await db.run("UPDATE player_characters SET xp = ?, level = ? WHERE save_id = ?", [newXp, newLevel, saveId]);

      if (leveledUp && pc.special_json) {
        const special = JSON.parse(pc.special_json) as Record<string, number>;
        const levelsGained = newLevel - pc.level;
        const pointsPerLevel = skillPointsPerLevel(special.int ?? 5);

        await db.run(
          "UPDATE player_characters SET unspent_skill_points = unspent_skill_points + ? WHERE save_id = ?",
          [levelsGained * pointsPerLevel, saveId]
        );
      }

      return { newXp, newLevel, leveledUp };
    });
  }

  public async awardSkillPoints(saveId: string, amount: number): Promise<void> {
    await getDb().run(
      "UPDATE player_characters SET unspent_skill_points = unspent_skill_points + ? WHERE save_id = ?",
      [amount, saveId]
    );
  }

  public async updateSkills(saveId: string, skillsJson: string, unspentPoints: number): Promise<void> {
    await getDb().run("UPDATE player_characters SET skills_json = ?, unspent_skill_points = ? WHERE save_id = ?", [
      skillsJson,
      unspentPoints,
      saveId
    ]);
  }

  public async setTaggedSkills(saveId: string, taggedSkillsJson: string): Promise<void> {
    await getDb().run("UPDATE player_characters SET tagged_skills_json = ? WHERE save_id = ?", [
      taggedSkillsJson,
      saveId
    ]);
  }
}
