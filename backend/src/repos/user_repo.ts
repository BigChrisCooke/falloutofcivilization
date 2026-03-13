import type Database from "better-sqlite3";

import type { UserRow } from "../shared/types.js";

export class UserRepo {
  public constructor(private readonly db: Database.Database) {}

  public findByUsername(username: string): UserRow | undefined {
    return this.db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  }

  public findById(userId: string): UserRow | undefined {
    return this.db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  }

  public create(user: UserRow): void {
    this.db
      .prepare("INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run(user.id, user.username, user.password_hash, user.created_at);
  }
}
