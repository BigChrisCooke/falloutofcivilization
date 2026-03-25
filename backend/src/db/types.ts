export type DbDialect = "sqlite" | "postgres";

export type DbValue = string | number | bigint | boolean | null | Uint8Array;
export type DbParams = readonly DbValue[];

export interface RunResult {
  changes: number;
  lastInsertRowid: string | number | bigint | null;
}

export interface DbAdapter {
  readonly dialect: DbDialect;
  get<T>(sql: string, params?: DbParams): Promise<T | undefined>;
  all<T>(sql: string, params?: DbParams): Promise<T[]>;
  run(sql: string, params?: DbParams): Promise<RunResult>;
  exec(sql: string): Promise<void>;
  transaction<T>(callback: (db: DbAdapter) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
