Draft handoff.md: Dual SQLite/Postgres Alignment
Summary
Use this as the content for handoff.md. Goal: make the friend's game truly dual-driver, with SQLite staying the default for local dev and CI, and PostgreSQL working cleanly for live/staging. Follow the same overall model as this repo: one async DB adapter, one migration runner, and explicit dialect branches only where SQL genuinely diverges.

Implementation Changes
Centralize all DB access behind one async interface like DbAdapter with get, all, run, exec, transaction, close, dialect, and a RunResult that includes lastInsertRowid and changes.
Keep app/repo SQL written once with ? placeholders; convert placeholders in the Postgres adapter instead of duplicating query text.
Keep adapter rewrites conservative. Safe: placeholder conversion, insert-id handling, and tightly scoped compatibility rewrites. Unsafe: broad regex rewrites of generic SQL functions, aggregates, or JSON expressions.
Audit every runtime query for SQLite-only syntax. Remove or explicitly gate datetime('now'), sqlite_master, PRAGMA, json_extract, INSERT OR REPLACE, INSERT OR IGNORE, last_insert_rowid(), AUTOINCREMENT, and raw better-sqlite3 usage outside the adapter/tests.
Treat timestamp handling as a first-class portability task. Pick one canonical write/comparison strategy and apply it everywhere.
Do not leave mixed text timestamp formats as an accidental behavior. A mix of SQLite YYYY-MM-DD HH:MM:SS and JS ISO YYYY-MM-DDTHH:mm:ss.sssZ will cause subtle filter/order bugs.
If the repo already stores timestamps as text, prefer application-supplied UTC ISO strings for writes and comparisons. If that is not possible, add a dialect-aware helper and normalize all time comparisons consistently.
Migrations must have deterministic ordering. Do not rely on duplicate numeric prefixes if the runner sorts files lexicographically.
If using one canonical migration source, keep it SQLite-safe by default and only auto-transform simple Postgres DDL. For structural differences, use explicit SQLite/Postgres blocks instead of clever global rewrites.
Use dialect-specific migration sections for the same classes of problems seen here: SQLite table rebuilds, Postgres constraint replacement, schema introspection, JSON-function differences, and sequence resets after copying explicit ids.
After any PostgreSQL table rebuild or bulk copy that preserves id values, reset the sequence with setval(pg_get_serial_sequence(...), MAX(id), EXISTS(...)).
Never use ALTER TABLE ... ADD COLUMN IF NOT EXISTS in SQLite branches. If needed, keep that syntax Postgres-only and use a safe SQLite alternative.
If keeping one migration source, avoid Postgres-only schema types/functions like jsonb, uuid, bytea, timestamptz, or bare RETURNING in shared migration SQL unless isolated in Postgres-only sections.
Keep SQLite as the default local/CI driver. Add a smaller Postgres smoke/contract path instead of forcing the whole test suite onto Postgres.
Public Interfaces
Standardize env config around DB_DRIVER=sqlite|postgres, plus DATABASE_URL or discrete Postgres settings and optional pool sizing.
Expose one connection entrypoint equivalent to initDb(), getDb(), test injection, and closeDb().
If the repo lacks transaction scoping, add request-safe transaction context so nested repo calls automatically reuse the active transaction.
Preserve existing controller/service APIs where possible; this migration should stay inside the DB layer and migrations.
Test Plan
Fresh SQLite boot: run all migrations on an empty SQLite DB and verify core app startup and CRUD flows.
Fresh Postgres boot: run the same migrations on an empty Postgres DB and verify the same flows.
Upgrade path: run migrations against a copy of the current live schema/data, especially rebuilt tables and changed constraints.
Add regression coverage for insert id retrieval, upserts, timestamp window filters, JSON predicates, migration table rebuilds, and Postgres sequence repair.
Add adapter contract tests for placeholder conversion, transaction behavior, insert-id behavior, and “do not corrupt aggregate SQL” behavior.
Keep the normal SQLite backend test suite green; add a separate Postgres smoke/contract job if full Postgres CI is too heavy.
Acceptance Criteria
No production repo/service code talks directly to SQLite or Postgres drivers outside the adapter/connection layer.
No runtime SQL outside approved dialect branches contains SQLite-only syntax.
All migrations apply cleanly and idempotently on both SQLite and Postgres.
Any Postgres migration that copies explicit ids also repairs the sequence.
Time-based filters, rate limits, expiry checks, and ordering behave the same on both drivers.
SQLite remains the default local/CI path; Postgres is verified before deploy.