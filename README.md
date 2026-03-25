# Fallout Of Civilization

Phase 1 is a platform-plus-vertical-slice milestone for a browser-based RPG prototype. The current repo includes a real backend, a real client app, shared game content and schemas, SQLite persistence, and auth-backed save loading.

## What Exists In Phase 1

- `client/`: Vite React client with React UI for auth, save selection, top bar, bottom bar, overworld stub, vault panel, and one placeholder interior flow
- `backend/`: Express API with SQLite persistence, migrations, registration, login, logout, session restore, save creation/loading, and minimal game-state endpoints
- `game/`: schemas, YAML content, and validation for regions, locations, overworld maps, and interior maps

## First-Time Setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env` in the repo root.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

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
- `SQLITE_PATH`: SQLite file path relative to the `backend/` workspace, default `./data/app.db`
- `SESSION_TTL_DAYS`: login session lifetime, default `14`

## Commands

- `npm run dev`: starts the game content watcher, backend server, and client dev server
- `npm run dev:game`: runs only the game content watcher
- `npm run dev:backend`: runs only the backend API
- `npm run dev:client`: runs only the client
- `npm run build`: builds `game`, `backend`, and `client`
- `npm run test`: runs game content tests and backend auth tests with coverage
- `npm run db:migrate`: applies SQLite migrations
- `npm run content:validate`: validates authored game content directly

## Where To Change What

If you want to change:

- login, logout, sessions, or save handling: look in `backend/src/`
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
- Use SQLite for runtime save data.
- If you add or change content, run `npm run content:validate`.
- If you change code, run `npm run build` and `npm run test`.

## Phase 1 Flow

1. Register a user.
2. Log in.
3. Create or load a save.
4. Enter the logged-in shell.
5. View the overworld stub.
6. Open the vault panel.
7. Enter a placeholder location backed by authored content and persisted state.

## Git Cheat Sheet

### Save your work (commit)

```bash
# 1. See what you've changed
git status

# 2. Stage the files you want to save
git add -A                    # stages everything
# OR stage specific files:
git add client/src/components/AppRoot.tsx backend/src/services/game_service.ts

# 3. Commit with a message describing what you did
git commit -m "fix quest markers and add XP system"
```

### Push to GitHub

```bash
# Push your commits to the remote repository
git push
```

### Pull the latest changes (if working from multiple machines)

```bash
git pull
```

### Undo mistakes

```bash
# Undo changes to a single file (before staging)
git checkout -- path/to/file.ts

# Unstage a file (after git add, before commit)
git reset HEAD path/to/file.ts

# See what changed in a file
git diff path/to/file.ts
```

### Quick daily workflow

```bash
git pull                              # get latest
# ... make your changes ...
npm run build && npm run test         # make sure nothing is broken
git add -A                            # stage everything
git commit -m "describe what changed" # save it
git push                              # send to GitHub
```

## Project Notes

- Authored game content lives under `game/content/`.
- Runtime save data lives in SQLite and is separate from authored content.
- `AGENTS.md` defines the architecture and workflow rules for AI-assisted work on the repo.
- `.claude/skills/` contains repo-specific workflow guidance for Claude Code.
- `docs/todo/initial/phases/` tracks the current execution phases and progress.
