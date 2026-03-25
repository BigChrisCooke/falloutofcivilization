import { getDb } from "../db/connection.js";
import type { SessionRow } from "../shared/types.js";

export class SessionRepo {
  public async create(session: SessionRow): Promise<void> {
    await getDb().run(
      "INSERT INTO sessions (id, user_id, current_save_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
      [session.id, session.user_id, session.current_save_id, session.expires_at, session.created_at]
    );
  }

  public async findById(sessionId: string): Promise<SessionRow | undefined> {
    return getDb().get<SessionRow>("SELECT * FROM sessions WHERE id = ?", [sessionId]);
  }

  public async updateCurrentSave(sessionId: string, saveId: string | null): Promise<void> {
    await getDb().run("UPDATE sessions SET current_save_id = ? WHERE id = ?", [saveId, sessionId]);
  }

  public async delete(sessionId: string): Promise<void> {
    await getDb().run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  }

  public async deleteExpired(now: number): Promise<void> {
    await getDb().run("DELETE FROM sessions WHERE expires_at <= ?", [now]);
  }
}
