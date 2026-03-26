# Fallout Of Civilization

Single-player browser RPG prototype. TypeScript monorepo with a Vite React client, Express API backend, shared `game/` rules and content package, dual-driver persistence, and automated tests.

## Current Phase

The current base is a Phase 1 vertical slice:

- registration, login, logout, and session restore
- save creation and save loading
- a mobile-friendly logged-in shell
- a stub overworld screen
- a vault or home panel
- one placeholder interior flow
- backend persistence with SQLite for local/CI and PostgreSQL support for staging/live
- authored content validation

## Architecture Rules

- `client/` renders UI and calls backend APIs.
- `backend/` owns auth, persistence, sessions, save handling, and API orchestration.
- `game/` is the source of truth for authored content, schemas, and deterministic helpers.
- Do not hardcode authoritative game content or branching rules in UI components.
- Keep runtime save state separate from authored content files.
- Keep all database driver usage inside `backend/src/db/`.
- Treat repos plus the shared DB layer as the only runtime DB access path.
- For Docker/Render production, treat the backend as the single runtime process that also serves the built client.

## Actual Repository Structure

```text
./
|-- client/
|   |-- src/components/     # React UI components
|   |-- src/lib/            # Client API calls, geometry, and scene helpers
|   |-- src/main.tsx        # Vite React app entry point
|   `-- src/styles/         # Global styling
|-- backend/
|   `-- src/
|       |-- controllers/    # Express route handlers
|       |-- db/             # Shared DB adapters, connection lifecycle, and migrations
|       |-- middleware/     # Session/auth middleware
|       |-- repos/          # Persistence helpers built on getDb()/withTransaction()
|       |-- services/       # Domain logic
|       |-- shared/         # Config and shared backend types
|       `-- __tests__/      # Vitest backend tests and DB contract checks
|-- game/
|   |-- content/            # YAML authored game content
|   `-- src/
|       |-- content/        # Content loaders
|       |-- schemas/        # Zod schemas
|       `-- __tests__/      # Content validation tests
|-- docs/todo/initial/      # Goal, stack, phases, and progress docs
|-- .claude/skills/         # Claude workflow guides
|-- package.json            # Workspace commands
`-- tsconfig.base.json      # Shared TypeScript config
```

## Stack

### Client

- Vite
- React 19
- PixiJS
- mobile-first CSS

### Backend

- Express
- SQLite via `better-sqlite3`
- PostgreSQL via `pg`
- cookie-based sessions
- `argon2` password hashing
- Zod validation

### Shared game layer

- TypeScript package under `game/`
- YAML content files under `game/content/`
- Zod schemas for content validation

## Source Of Truth Rules

If Chris wants to change:

- UI layout or app shell behavior: start in `client/`
- login, logout, sessions, or persistence: start in `backend/`
- DB driver behavior, connection lifecycle, or transaction handling: start in `backend/src/db/`
- a new location, map, or authored world content: start in `game/content/`
- content formats or validation rules: start in `game/src/schemas/`
- content loading behavior: start in `game/src/content/`
- database shape: start in `backend/src/db/migrations/`

Do not:

- add new authored locations directly in React components
- store runtime player state in `game/content/`
- treat `client/` as the source of truth for maps, quests, or progression
- call `better-sqlite3` or `pg` directly outside `backend/src/db/` and approved DB tests

## Persistence Rules

- SQLite remains the default local and CI driver.
- PostgreSQL must work for staging/live through the same repo and service layer.
- Shared runtime SQL should be written once with `?` placeholders.
- PostgreSQL placeholder conversion belongs in the Postgres adapter only.
- Do not add broad SQL regex rewrites for generic functions, aggregates, or JSON expressions.
- Audit runtime SQL for SQLite-only syntax before adding new persistence features.
- Do not use `datetime('now')`, `json_extract`, `sqlite_master`, `PRAGMA`, `INSERT OR IGNORE`, `INSERT OR REPLACE`, `last_insert_rowid()`, or `AUTOINCREMENT` in production runtime SQL outside approved dialect-specific DB code.
- Keep timestamp writes application-supplied and consistent with the existing epoch-millisecond model used by the backend.
- Use `getDb()` and `withTransaction()` for runtime access and transaction scoping.
- Multi-write gameplay flows should stay atomic through the shared transaction layer.

## Deployment Rules

- Local dev uses separate frontend and backend dev servers.
- Docker/Render production uses one container and one public port.
- Do not add a second long-running frontend process to the production container unless explicitly requested.
- The backend should serve `client/dist` when that build output exists.
- Production Docker startup should generate browser-safe runtime config, run backend migrations, then start the backend server.
- Docker and Render env configuration should stay discoverable in `Dockerfile`, `.dockerignore`, `.env.example`, and `render.yaml`.
- Treat Docker/Render envs as two groups: server-only runtime envs and browser-safe runtime-config envs.
- Never expose secrets such as `DATABASE_URL`, Postgres credentials, cookie settings, or private tokens to browser runtime config.
- Render should rely on `PORT`, `DATABASE_URL`, and production-safe cookie/proxy settings.

## Migration Rules

- Keep one ordered migration source under `backend/src/db/migrations/`.
- Migration filenames must stay deterministically sortable.
- Migrations should be SQLite-safe by default.
- Use `@sqlite` and `@postgres` blocks only when SQL genuinely diverges.
- Do not use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in SQLite branches.
- If a PostgreSQL migration rebuilds a table or copies explicit ids into sequence-backed columns, repair the sequence with `setval(pg_get_serial_sequence(...), MAX(id), EXISTS(...))`.
- Current runtime ids are UUID/TEXT based, so future sequence repair work is only needed if a sequence-backed table is introduced.

## Current Content Structure

Authored content currently lives under:

- `game/content/world/`
- `game/content/locations/`
- `game/content/maps/overworld/`
- `game/content/maps/interiors/`

Location files reference interior maps by stable ID. That link must stay data-driven.

## Commands

Run these from the repo root:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run test:postgres`
- `npm run db:migrate`
- `npm run content:validate`

Default local ports:

- client: `6200`
- backend: `6201`

## Quality Gates

Before commit or PR:

1. Run `npm run build`
2. Run `npm run test`
3. Run `npm run content:validate`
4. Run `npm run db:migrate` if database setup or migration behavior changed
5. Run `npm run test:postgres` before deploy or when Postgres behavior, migrations, or adapter code changes

Do not commit if the relevant checks fail.

## Chris-Safe Workflow

The repo should be usable by someone who is not a programmer.

That means:

- commands must be obvious
- source-of-truth files must be discoverable
- authored content must be editable without touching core auth or persistence code
- validation should fail fast with useful errors
- AI guidance should prefer safe, local edits over architecture drift

## Claude Code Workflow

This repo uses lightweight guidance files under `.claude/skills/`.

Expected support:

- `/test`
- `/build`
- `/commit`
- `content-authoring`

These files should always match the real repo commands and structure.

## Current Non-Goals

- full combat
- procedural world generation
- full quest implementation
- production deployment
- a large skill framework for its own sake

## Gotchas

- `SQLITE_PATH` is relative to the `backend/` workspace when backend scripts run.
- Root `.env` should be the source of environment configuration.
- `DB_DRIVER=sqlite` is the default local workflow.
- PostgreSQL uses `DATABASE_URL` first, then the discrete `POSTGRES_*` settings if needed.
- `PORT` is provided by Render in production; local dev can keep using `BACKEND_PORT`.
- `CLIENT_DIST_PATH` defaults to `../client/dist` from the backend workspace for static production serving.
- `TRUST_PROXY=true` and `COOKIE_SECURE=true` are the intended Render defaults.
- Content files define authored world data; backend DB storage holds runtime save state.
- The safe way to add a new enterable location is: add content, validate content, then wire any UI affordance if needed.
