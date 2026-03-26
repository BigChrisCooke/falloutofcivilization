import { getDb } from "../db/connection.js";
import type { UserRow } from "../shared/types.js";

export class UserRepo {
  public async findByUsername(username: string): Promise<UserRow | undefined> {
    return getDb().get<UserRow>("SELECT * FROM users WHERE username = ?", [username]);
  }

  public async findById(userId: string): Promise<UserRow | undefined> {
    return getDb().get<UserRow>("SELECT * FROM users WHERE id = ?", [userId]);
  }

  public async create(user: UserRow): Promise<void> {
    await getDb().run(
      "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
      [user.id, user.username, user.password_hash, user.created_at]
    );
  }
}
