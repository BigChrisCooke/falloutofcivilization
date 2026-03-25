import { getDb } from "../db/connection.js";
import type { CompanionInstanceRow } from "../shared/types.js";

export class CompanionRepo {
  public async getAll(saveId: string): Promise<CompanionInstanceRow[]> {
    return getDb().all<CompanionInstanceRow>(
      "SELECT * FROM companion_instances WHERE save_id = ? AND departed = 0 ORDER BY recruited_at ASC",
      [saveId]
    );
  }

  public async find(saveId: string, companionId: string): Promise<CompanionInstanceRow | undefined> {
    return getDb().get<CompanionInstanceRow>(
      "SELECT * FROM companion_instances WHERE save_id = ? AND companion_id = ?",
      [saveId, companionId]
    );
  }

  public async recruit(saveId: string, companionId: string): Promise<void> {
    await getDb().run(
      `INSERT INTO companion_instances (save_id, companion_id, recruited_at, loyalty, story_stage, departed)
       VALUES (?, ?, ?, 50, 0, 0)
       ON CONFLICT (save_id, companion_id) DO NOTHING`,
      [saveId, companionId, Date.now()]
    );
  }

  public async updateLoyalty(saveId: string, companionId: string, loyalty: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, loyalty));
    await getDb().run(
      "UPDATE companion_instances SET loyalty = ? WHERE save_id = ? AND companion_id = ? AND departed = 0",
      [clamped, saveId, companionId]
    );
  }

  public async updateStoryStage(saveId: string, companionId: string, storyStage: number): Promise<void> {
    await getDb().run(
      "UPDATE companion_instances SET story_stage = ? WHERE save_id = ? AND companion_id = ? AND departed = 0",
      [storyStage, saveId, companionId]
    );
  }

  public async markStoryStageViewed(saveId: string, companionId: string, storyStage: number): Promise<void> {
    await getDb().run(
      "UPDATE companion_instances SET story_stage_viewed = ? WHERE save_id = ? AND companion_id = ? AND departed = 0",
      [storyStage, saveId, companionId]
    );
  }

  public async remove(saveId: string, companionId: string): Promise<void> {
    await getDb().run(
      "UPDATE companion_instances SET departed = 1, loyalty = 0 WHERE save_id = ? AND companion_id = ?",
      [saveId, companionId]
    );
  }
}
