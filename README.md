# Fallout Of Civilization

Phase 1 is a platform-plus-vertical-slice milestone for a browser RPG prototype. The repo contains a real backend, a real client app, shared game content and schemas, authored content validation, and dual-driver runtime persistence with SQLite for local/CI and PostgreSQL for staging/live.

## What Exists In Phase 1

- `client/`: Vite React client with auth, save selection, shell UI, overworld, vault, and placeholder interior flow
- `backend/`: Express API with auth, sessions, saves, gameplay state, shared async DB layer, and ordered migrations
- `game/`: authored YAML content, schemas, loaders, and content validation

## First-Time Setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env` in the repo root.
3. Keep `DB_DRIVER=sqlite` for the default local setup.
4. Run `npm install`.
5. Run `npm run db:migrate`.
6. Run `npm run dev`.

## Default Local URLs

- Client: `http://localhost:6200`
- Backend: `http://localhost:6201`

## Environment Notes

The repo expects a root `.env` file.

Important variables:

- `BACKEND_PORT`: backend port, default `6201`
- `CLIENT_PORT`: client port, default `6200`
- `VITE_API_BASE_URL`: client API base URL, default `http://localhost:6201`
- `CLIENT_ORIGIN`: allowed browser origin for backend CORS, default `http://localhost:6200`
- `DB_DRIVER`: `sqlite` or `postgres`, default `sqlite`
- `SQLITE_PATH`: SQLite file path relative to the `backend/` workspace, default `./data/app.db`
- `DATABASE_URL`: primary PostgreSQL connection string for staging/live
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`: optional discrete PostgreSQL settings when `DATABASE_URL` is not used
- `POSTGRES_SSL`: enable PostgreSQL SSL, default `false`
- `DB_POOL_MAX`: PostgreSQL pool size, default `10`
- `SESSION_TTL_DAYS`: login session lifetime, default `14`

SQLite stays the default local/CI workflow. To run against PostgreSQL, set `DB_DRIVER=postgres` and provide either `DATABASE_URL` or the discrete Postgres settings before running `npm run db:migrate` and `npm run dev:backend`.

## Commands

- `npm run dev`: starts the game content watcher, backend server, and client dev server
- `npm run dev:game`: runs only the game content watcher
- `npm run dev:backend`: runs only the backend API
- `npm run dev:client`: runs only the client
- `npm run build`: builds `game`, `backend`, and `client`
- `npm run test`: runs the normal SQLite-first test suite across workspaces
- `npm run test:postgres`: runs the backend PostgreSQL smoke and upgrade tests against `TEST_DATABASE_URL`
- `npm run db:migrate`: applies migrations for the currently selected driver
- `npm run content:validate`: validates authored game content directly

## Where To Change What

If you want to change:

- login, logout, sessions, save handling, or persistence: look in `backend/src/`
- shared DB behavior or driver-specific plumbing: look in `backend/src/db/`
- page layout, app shell UI, top bar, bottom bar, or dialogs: look in `client/src/`
- API calls from the client: look in `client/src/lib/api.ts`
- authored locations, regions, or maps: look in `game/content/`
- content validation rules: look in `game/src/schemas/`
- content loading behavior: look in `game/src/content/`
- database structure: look in `backend/src/db/migrations/`

## Safe Editing Rules

- Do not put authored location or map data into React components.
- Do not store runtime player progress in `game/content/`.
- Use `game/content/` for authored game data.
- Use the backend DB layer for runtime state, not direct driver calls.
- Keep shared runtime SQL written with `?` placeholders.
- Keep migrations SQLite-safe by default; use `@sqlite` and `@postgres` blocks only where SQL really differs.
- If you add or change content, run `npm run content:validate`.
- If you change code, run `npm run build` and `npm run test`.
- If you change database behavior, also run `npm run db:migrate` and the relevant PostgreSQL smoke checks before deploy.

## Phase 1 Flow

1. Register a user.
2. Log in.
3. Create or load a save.
4. Enter the logged-in shell.
5. View the overworld.
6. Open the vault panel.
7. Enter a placeholder location backed by authored content and persisted state.

## Project Notes

- Authored game content lives under `game/content/`.
- Runtime save data lives in the backend database and is separate from authored content.
- SQLite is the default local/CI path.
- PostgreSQL is supported for staging/live through the shared async adapter and the same ordered migration source.
- `AGENTS.md` defines the architecture and AI workflow rules for the repo.
- `.claude/skills/` contains repo-specific workflow guidance for Claude Code.
- `docs/todo/initial/phases/` tracks the broader execution phases and progress.
