# Fallout Of Civilization

Single-player browser RPG prototype. TypeScript monorepo with a Vite React client, Express API backend, shared `game/` rules and content package, SQLite persistence, and automated tests.

## Current Phase

The current base is a Phase 1 vertical slice:

- registration, login, logout, and session restore
- save creation and save loading
- a mobile-friendly logged-in shell
- a stub overworld screen
- a vault or home panel
- one placeholder interior flow
- SQLite persistence
- authored content validation

## Architecture Rules

- `client/` renders UI and calls backend APIs.
- `backend/` owns auth, persistence, sessions, save handling, and API orchestration.
- `game/` is the source of truth for authored content, schemas, and deterministic helpers.
- Do not hardcode authoritative game content or branching rules in UI components.
- Keep runtime save state separate from authored content files.

## Actual Repository Structure

```text
./
├── client/
│   ├── src/components/     # React UI components
│   ├── src/lib/            # Client API calls, geometry, and scene helpers
│   ├── src/main.tsx        # Vite React app entry point
│   └── src/styles/         # Global styling
├── backend/
│   └── src/
│       ├── controllers/    # Express route handlers
│       ├── db/             # SQLite connection and migrations
│       ├── middleware/     # Session/auth middleware
│       ├── repos/          # SQLite access helpers
│       ├── services/       # Domain logic
│       ├── shared/         # Config and shared backend types
│       └── __tests__/      # Vitest auth tests
├── game/
│   ├── content/            # YAML authored game content
│   └── src/
│       ├── content/        # Content loaders
│       ├── schemas/        # Zod schemas
│       └── __tests__/      # Content validation tests
├── docs/todo/initial/      # Goal, stack, phases, and progress docs
├── .claude/skills/         # Claude workflow guides
├── package.json            # Workspace commands
└── tsconfig.base.json      # Shared TypeScript config
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
- a new location, map, or authored world content: start in `game/content/`
- content formats or validation rules: start in `game/src/schemas/`
- content loading behavior: start in `game/src/content/`
- database shape: start in `backend/src/db/migrations/`

Do not:

- add new authored locations directly in React components
- store runtime player state in `game/content/`
- treat `client/` as the source of truth for maps, quests, or progression

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
- Content files define authored world data; SQLite stores runtime save state.
- The safe way to add a new enterable location is: add content, validate content, then wire any UI affordance if needed.
