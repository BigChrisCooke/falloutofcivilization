import { mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import type { DbAdapter, DbParams, RunResult } from "./types.js";

let sqliteSavepointCounter = 0;

function getSavepointName(depth: number): string {
  sqliteSavepointCounter += 1;
  return `sqlite_sp_${depth}_${sqliteSavepointCounter}`;
}

export class SqliteAdapter implements DbAdapter {
  public readonly dialect = "sqlite" as const;

  public constructor(
    private readonly db: Database.Database,
    private readonly transactionDepth = 0,
    private readonly ownsConnection = false
  ) {}

  public async get<T>(sql: string, params: DbParams = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  public async all<T>(sql: string, params: DbParams = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  public async run(sql: string, params: DbParams = []): Promise<RunResult> {
    const result = this.db.prepare(sql).run(...params);

    return {
      changes: result.changes,
      lastInsertRowid:
        typeof result.lastInsertRowid === "number" ||
        typeof result.lastInsertRowid === "bigint" ||
        typeof result.lastInsertRowid === "string"
          ? result.lastInsertRowid
          : null
    };
  }

  public async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  public async transaction<T>(callback: (db: DbAdapter) => Promise<T>): Promise<T> {
    if (this.transactionDepth === 0) {
      this.db.exec("BEGIN IMMEDIATE");

      try {
        const result = await callback(new SqliteAdapter(this.db, 1, false));
        this.db.exec("COMMIT");
        return result;
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }

    const savepointName = getSavepointName(this.transactionDepth + 1);
    this.db.exec(`SAVEPOINT ${savepointName}`);

    try {
      const result = await callback(new SqliteAdapter(this.db, this.transactionDepth + 1, false));
      this.db.exec(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      this.db.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      this.db.exec(`RELEASE SAVEPOINT ${savepointName}`);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.ownsConnection) {
      this.db.close();
    }
  }
}

export function createSqliteAdapter(databasePath: string): SqliteAdapter {
  if (databasePath !== ":memory:") {
    mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");

  return new SqliteAdapter(db, 0, true);
}
