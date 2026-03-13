import type Database from "better-sqlite3";

import type { SessionRow } from "../shared/types.js";

export class SessionRepo {
  public constructor(private readonly db: Database.Database) {}

  public create(session: SessionRow): void {
    this.db
      .prepare("INSERT INTO sessions (id, user_id, current_save_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(session.id, session.user_id, session.current_save_id, session.expires_at, session.created_at);
  }

  public findById(sessionId: string): SessionRow | undefined {
    return this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | undefined;
  }

  public updateCurrentSave(sessionId: string, saveId: string | null): void {
    this.db.prepare("UPDATE sessions SET current_save_id = ? WHERE id = ?").run(saveId, sessionId);
  }

  public delete(sessionId: string): void {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  public deleteExpired(now: number): void {
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  }
}
