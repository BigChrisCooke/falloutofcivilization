import argon2 from "argon2";
import type Database from "better-sqlite3";

import { SessionRepo } from "../repos/session_repo.js";
import { UserRepo } from "../repos/user_repo.js";
import type { AppConfig } from "../shared/config.js";
import type { AuthUser, SessionRow, UserRow } from "../shared/types.js";

export class AuthService {
  private readonly userRepo: UserRepo;
  private readonly sessionRepo: SessionRepo;

  public constructor(
    db: Database.Database,
    private readonly config: AppConfig
  ) {
    this.userRepo = new UserRepo(db);
    this.sessionRepo = new SessionRepo(db);
  }

  public async register(username: string, password: string): Promise<AuthUser> {
    const existingUser = this.userRepo.findByUsername(username);

    if (existingUser) {
      throw new Error("A user with that username already exists.");
    }

    const user: UserRow = {
      id: crypto.randomUUID(),
      username,
      password_hash: await argon2.hash(password),
      created_at: Date.now()
    };

    this.userRepo.create(user);

    return {
      id: user.id,
      username: user.username
    };
  }

  public async login(username: string, password: string): Promise<AuthUser> {
    const user = this.userRepo.findByUsername(username);

    if (!user) {
      throw new Error("Invalid username or password.");
    }

    const matches = await argon2.verify(user.password_hash, password);
    if (!matches) {
      throw new Error("Invalid username or password.");
    }

    return {
      id: user.id,
      username: user.username
    };
  }

  public createSession(userId: string): SessionRow {
    const now = Date.now();
    const expiresAt = now + this.config.sessionTtlDays * 24 * 60 * 60 * 1000;
    const session: SessionRow = {
      id: crypto.randomUUID(),
      user_id: userId,
      current_save_id: null,
      expires_at: expiresAt,
      created_at: now
    };

    this.sessionRepo.create(session);
    return session;
  }

  public getSession(sessionId: string): { user: AuthUser; session: SessionRow } | null {
    const now = Date.now();
    this.sessionRepo.deleteExpired(now);
    const session = this.sessionRepo.findById(sessionId);

    if (!session || session.expires_at <= now) {
      return null;
    }

    const user = this.userRepo.findById(session.user_id);
    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        username: user.username
      },
      session
    };
  }

  public logout(sessionId: string): void {
    this.sessionRepo.delete(sessionId);
  }

  public updateCurrentSave(sessionId: string, saveId: string | null): void {
    this.sessionRepo.updateCurrentSave(sessionId, saveId);
  }
}
