import argon2 from "argon2";

import { withTransaction } from "../db/connection.js";
import { SessionRepo } from "../repos/session_repo.js";
import { UserRepo } from "../repos/user_repo.js";
import type { AppConfig } from "../shared/config.js";
import type { AuthUser, SessionRow, UserRow } from "../shared/types.js";

export class AuthService {
  private readonly userRepo = new UserRepo();
  private readonly sessionRepo = new SessionRepo();

  public constructor(private readonly config: AppConfig) {}

  public async register(username: string, password: string): Promise<AuthUser> {
    const passwordHash = await argon2.hash(password);

    return withTransaction(async () => {
      const existingUser = await this.userRepo.findByUsername(username);

      if (existingUser) {
        throw new Error("A user with that username already exists.");
      }

      const user: UserRow = {
        id: crypto.randomUUID(),
        username,
        password_hash: passwordHash,
        created_at: Date.now()
      };

      await this.userRepo.create(user);

      return {
        id: user.id,
        username: user.username
      };
    });
  }

  public async registerWithSession(username: string, password: string): Promise<{ user: AuthUser; session: SessionRow }> {
    const passwordHash = await argon2.hash(password);
    const now = Date.now();
    const expiresAt = now + this.config.sessionTtlDays * 24 * 60 * 60 * 1000;

    return withTransaction(async () => {
      const existingUser = await this.userRepo.findByUsername(username);

      if (existingUser) {
        throw new Error("A user with that username already exists.");
      }

      const user: UserRow = {
        id: crypto.randomUUID(),
        username,
        password_hash: passwordHash,
        created_at: now
      };
      const session: SessionRow = {
        id: crypto.randomUUID(),
        user_id: user.id,
        current_save_id: null,
        expires_at: expiresAt,
        created_at: now
      };

      await this.userRepo.create(user);
      await this.sessionRepo.create(session);

      return {
        user: {
          id: user.id,
          username: user.username
        },
        session
      };
    });
  }

  public async login(username: string, password: string): Promise<AuthUser> {
    const user = await this.userRepo.findByUsername(username);

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

  public async loginWithSession(username: string, password: string): Promise<{ user: AuthUser; session: SessionRow }> {
    const user = await this.login(username, password);
    const session = await this.createSession(user.id);

    return { user, session };
  }

  public async createSession(userId: string): Promise<SessionRow> {
    const now = Date.now();
    const expiresAt = now + this.config.sessionTtlDays * 24 * 60 * 60 * 1000;
    const session: SessionRow = {
      id: crypto.randomUUID(),
      user_id: userId,
      current_save_id: null,
      expires_at: expiresAt,
      created_at: now
    };

    await this.sessionRepo.create(session);
    return session;
  }

  public async getSession(sessionId: string): Promise<{ user: AuthUser; session: SessionRow } | null> {
    const now = Date.now();
    await this.sessionRepo.deleteExpired(now);
    const session = await this.sessionRepo.findById(sessionId);

    if (!session || session.expires_at <= now) {
      return null;
    }

    const user = await this.userRepo.findById(session.user_id);
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

  public async logout(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId);
  }

  public async updateCurrentSave(sessionId: string, saveId: string | null): Promise<void> {
    await this.sessionRepo.updateCurrentSave(sessionId, saveId);
  }
}
