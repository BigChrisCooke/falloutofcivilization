import { Pool, type PoolClient, type PoolConfig, types } from "pg";

import { convertQuestionPlaceholdersToPostgres, splitSqlStatements } from "./sql.js";
import type { DbAdapter, DbParams, RunResult } from "./types.js";

let pgTypeParsersConfigured = false;
let postgresSavepointCounter = 0;

function configurePgTypeParsers(): void {
  if (pgTypeParsersConfigured) {
    return;
  }

  const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafeInteger = BigInt(Number.MIN_SAFE_INTEGER);

  types.setTypeParser(20, (value) => {
    const parsed = BigInt(value);

    if (parsed > maxSafeInteger || parsed < minSafeInteger) {
      throw new Error(`Postgres int8 value is outside JavaScript's safe integer range: ${value}`);
    }

    return Number(parsed);
  });

  pgTypeParsersConfigured = true;
}

function getSavepointName(depth: number): string {
  postgresSavepointCounter += 1;
  return `pg_sp_${depth}_${postgresSavepointCounter}`;
}

function normalizeLastInsertRowid(rows: Record<string, unknown>[]): string | number | bigint | null {
  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  const firstKey = Object.keys(firstRow)[0];
  if (!firstKey) {
    return null;
  }

  const value = firstRow[firstKey];
  return typeof value === "string" || typeof value === "number" || typeof value === "bigint" ? value : null;
}

type Queryable = Pool | PoolClient;

export class PostgresAdapter implements DbAdapter {
  public readonly dialect = "postgres" as const;

  public constructor(
    private readonly executor: Queryable,
    private readonly transactionDepth = 0,
    private readonly pool?: Pool,
    private readonly releaseClient?: () => void
  ) {}

  public async get<T>(sql: string, params: DbParams = []): Promise<T | undefined> {
    const result = await this.query<T>(sql, params);
    return result.rows[0] as T | undefined;
  }

  public async all<T>(sql: string, params: DbParams = []): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows as T[];
  }

  public async run(sql: string, params: DbParams = []): Promise<RunResult> {
    const result = await this.query<Record<string, unknown>>(sql, params);

    return {
      changes: result.rowCount ?? 0,
      lastInsertRowid: normalizeLastInsertRowid(result.rows)
    };
  }

  public async exec(sql: string): Promise<void> {
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      const text = convertQuestionPlaceholdersToPostgres(statement);
      await this.executor.query(text);
    }
  }

  public async transaction<T>(callback: (db: DbAdapter) => Promise<T>): Promise<T> {
    if (this.executor instanceof Pool) {
      const client = await this.executor.connect();

      try {
        await client.query("BEGIN");
        const txAdapter = new PostgresAdapter(client, 1, this.executor, () => client.release());
        const result = await callback(txAdapter);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    const savepointName = getSavepointName(this.transactionDepth + 1);
    await this.executor.query(`SAVEPOINT ${savepointName}`);

    try {
      const txAdapter = new PostgresAdapter(
        this.executor,
        this.transactionDepth + 1,
        this.pool,
        this.releaseClient
      );
      const result = await callback(txAdapter);
      await this.executor.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      await this.executor.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      await this.executor.query(`RELEASE SAVEPOINT ${savepointName}`);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.releaseClient?.();
      return;
    }

    if (this.executor instanceof Pool) {
      await this.executor.end();
    }
  }

  private async query<T>(sql: string, params: DbParams): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> {
    const text = convertQuestionPlaceholdersToPostgres(sql);
    const result = await this.executor.query<Record<string, unknown>>(text, [...params]);

    return {
      rows: result.rows,
      rowCount: result.rowCount
    };
  }
}

export function createPostgresAdapter(poolConfig: PoolConfig): PostgresAdapter {
  configurePgTypeParsers();
  const pool = new Pool(poolConfig);
  return new PostgresAdapter(pool, 0, pool);
}
