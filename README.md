# Fallout Of Civilization

Phase 1 is a platform-plus-vertical-slice milestone for a browser-based RPG prototype. The current repo includes a real backend, a real frontend shell, shared game content and schemas, SQLite persistence, and auth-backed save loading.

## What Exists In Phase 1

- `frontend/`: Astro shell with React UI for auth, save selection, top bar, bottom bar, overworld stub, vault panel, and one placeholder interior flow
- `backend/`: Express API with SQLite persistence, migrations, registration, login, logout, session restore, save creation/loading, and minimal game-state endpoints
- `game/`: schemas, YAML content, and validation for regions, locations, overworld maps, and interior maps

## First-Time Setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env` in the repo root.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

## Default Local URLs

- Frontend: `http://localhost:4321`
- Backend: `http://localhost:3001`

## Environment Notes

The repo expects a root `.env` file.

Important variables:

- `BACKEND_PORT`: backend port, default `3001`
- `PUBLIC_API_BASE_URL`: frontend API base URL, default `http://localhost:3001`
- `FRONTEND_ORIGIN`: allowed browser origin for backend CORS, default `http://localhost:4321`
- `SQLITE_PATH`: SQLite file path relative to the `backend/` workspace, default `./data/app.db`
- `SESSION_TTL_DAYS`: login session lifetime, default `14`

## Commands

- `npm run dev`: starts the game content watcher, backend server, and frontend dev server
- `npm run build`: builds `game`, `backend`, and `frontend`
- `npm run test`: runs game content tests and backend auth tests with coverage
- `npm run db:migrate`: applies SQLite migrations
- `npm run content:validate`: validates authored game content directly

## Phase 1 Flow

1. Register a user.
2. Log in.
3. Create or load a save.
4. Enter the logged-in shell.
5. View the overworld stub.
6. Open the vault panel.
7. Enter a placeholder location backed by authored content and persisted state.

## Project Notes

- Authored game content lives under `game/content/`.
- Runtime save data lives in SQLite and is separate from authored content.
- `AGENTS.md` defines the architecture and workflow rules for AI-assisted work on the repo.
- `docs/todo/initial/phases/` tracks the current execution phases and progress.
