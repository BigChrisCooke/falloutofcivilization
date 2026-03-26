import { afterEach, describe, expect, it } from "vitest";

import { closeDb, getDb, setDbForTests, withTransaction } from "../db/connection.js";
import { convertQuestionPlaceholdersToPostgres, splitSqlStatements } from "../db/sql.js";
import { createSqliteAdapter } from "../db/sqlite_adapter.js";

describe("db contract", () => {
  afterEach(async () => {
    await closeDb();
    setDbForTests(null);
  });

  it("converts placeholders without corrupting strings, comments, or quoted identifiers", () => {
    const sql = `
      SELECT ?, '?', "??", $$what?$$
      FROM demo
      WHERE note = ?
      -- ? should stay here
      /* and ? should stay here too */
    `;

    expect(convertQuestionPlaceholdersToPostgres(sql)).toContain("SELECT $1, '?', \"??\", $$what?$$");
    expect(convertQuestionPlaceholdersToPostgres(sql)).toContain("WHERE note = $2");
    expect(convertQuestionPlaceholdersToPostgres(sql)).toContain("-- ? should stay here");
    expect(convertQuestionPlaceholdersToPostgres(sql)).toContain("/* and ? should stay here too */");
  });

  it("splits SQL scripts without breaking semicolons inside literals", () => {
    const statements = splitSqlStatements(`
      INSERT INTO demo(label) VALUES ('alpha;beta');
      -- keep; comment
      INSERT INTO demo(label) VALUES ('gamma');
    `);

    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("alpha;beta");
    expect(statements[1]).toContain("gamma");
  });

  it("reports SQLite insert ids and change counts through the adapter", async () => {
    const db = createSqliteAdapter(":memory:");

    await db.exec("CREATE TABLE rowid_contract (id INTEGER PRIMARY KEY, label TEXT NOT NULL)");

    const result = await db.run("INSERT INTO rowid_contract (label) VALUES (?)", ["alpha"]);

    expect(result.changes).toBe(1);
    expect(typeof result.lastInsertRowid === "number" || typeof result.lastInsertRowid === "bigint").toBe(true);

    await db.close();
  });

  it("reuses nested SQLite transactions with savepoints", async () => {
    setDbForTests(createSqliteAdapter(":memory:"));
    await getDb().exec("CREATE TABLE contract_checks (id TEXT PRIMARY KEY, value INTEGER NOT NULL)");

    await withTransaction(async () => {
      await getDb().run("INSERT INTO contract_checks (id, value) VALUES (?, ?)", ["outer", 1]);

      await expect(
        withTransaction(async () => {
          await getDb().run("INSERT INTO contract_checks (id, value) VALUES (?, ?)", ["inner", 2]);
          throw new Error("nested failure");
        })
      ).rejects.toThrow("nested failure");

      const rows = await getDb().all<{ id: string }>("SELECT id FROM contract_checks ORDER BY id");
      expect(rows.map((row) => row.id)).toEqual(["outer"]);
    });

    const rows = await getDb().all<{ id: string }>("SELECT id FROM contract_checks ORDER BY id");
    expect(rows.map((row) => row.id)).toEqual(["outer"]);
  });

  it("rolls back the full transaction when the outer scope fails", async () => {
    setDbForTests(createSqliteAdapter(":memory:"));
    await getDb().exec("CREATE TABLE rollback_checks (id TEXT PRIMARY KEY, value INTEGER NOT NULL)");

    await expect(
      withTransaction(async () => {
        await getDb().run("INSERT INTO rollback_checks (id, value) VALUES (?, ?)", ["alpha", 1]);
        throw new Error("outer failure");
      })
    ).rejects.toThrow("outer failure");

    const rows = await getDb().all<{ id: string }>("SELECT id FROM rollback_checks");
    expect(rows).toHaveLength(0);
  });
});
