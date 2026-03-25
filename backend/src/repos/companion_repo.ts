import type Database from "better-sqlite3";

import type { CompanionInstanceRow } from "../shared/types.js";

export class CompanionRepo {
  public constructor(private readonly db: Database.Database) {}

  public getAll(saveId: string): CompanionInstanceRow[] {
    return this.db
      .prepare("SELECT * FROM companion_instances WHERE save_id = ? AND departed = 0 ORDER BY recruited_at ASC")
      .all(saveId) as CompanionInstanceRow[];
  }

  public find(saveId: string, companionId: string): CompanionInstanceRow | undefined {
    return this.db
      .prepare("SELECT * FROM companion_instances WHERE save_id = ? AND companion_id = ?")
      .get(saveId, companionId) as CompanionInstanceRow | undefined;
  }

  public recruit(saveId: string, companionId: string): void {
    this.db
      .prepare(
        `INSERT INTO companion_instances (save_id, companion_id, recruited_at, loyalty, story_stage, departed)
         VALUES (?, ?, ?, 50, 0, 0)
         ON CONFLICT (save_id, companion_id) DO NOTHING`
      )
      .run(saveId, companionId, Date.now());
  }

  public updateLoyalty(saveId: string, companionId: string, loyalty: number): void {
    const clamped = Math.max(0, Math.min(100, loyalty));
    this.db
      .prepare("UPDATE companion_instances SET loyalty = ? WHERE save_id = ? AND companion_id = ? AND departed = 0")
      .run(clamped, saveId, companionId);
  }

  public updateStoryStage(saveId: string, companionId: string, storyStage: number): void {
    this.db
      .prepare("UPDATE companion_instances SET story_stage = ? WHERE save_id = ? AND companion_id = ? AND departed = 0")
      .run(storyStage, saveId, companionId);
  }

  public markStoryStageViewed(saveId: string, companionId: string, storyStage: number): void {
    this.db
      .prepare("UPDATE companion_instances SET story_stage_viewed = ? WHERE save_id = ? AND companion_id = ? AND departed = 0")
      .run(storyStage, saveId, companionId);
  }

  public remove(saveId: string, companionId: string): void {
    this.db
      .prepare("UPDATE companion_instances SET departed = 1, loyalty = 0 WHERE save_id = ? AND companion_id = ?")
      .run(saveId, companionId);
  }
}
