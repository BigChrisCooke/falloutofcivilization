# Progress Tracker

Update this file as work advances.

## Overall Status

- Phase 1: completed
- Phase 2: completed
- Phase 3: in progress

## Current Snapshot

- Goal, stack, and phase tracking docs are in place.
- `AGENTS.md` has been rewritten to match the actual repo structure and workflow.
- The real workspace scaffold now exists for `client/`, `backend/`, and `game/`.
- Root commands now exist for build, test, migrations, and content validation.
- SQLite migrations are implemented and working.
- Registration, login, logout, and session restore are implemented.
- Save creation and save loading are implemented.
- The logged-in shell, top bar, bottom bar, overworld stub, vault panel, and placeholder interior flow are implemented.
- Placeholder authored content and schema validation are implemented in `game/`.
- `README.md` and `.env.example` now exist with first-run setup guidance.
- Claude Code workflow guides now exist under `.claude/skills/`.
- Root helper commands now exist for `dev:game`, `dev:backend`, and `dev:client`.
- Runtime smoke checks have passed for backend, client, and the game watcher on isolated ports.
- Phase 3 Milestone 1 is underway with real overworld travel and a graphical map shell.

## Phase 1 Progress

- Status: completed
- Completed:
- Root workspace config and TypeScript base config
- `client/` Vite React client with React client UI
- `backend/` Express API with SQLite persistence
- `game/` package with YAML content, schemas, and validation
- Auth endpoints and cookie-backed session flow
- Save endpoints and minimal persisted game state
- Placeholder authored region, locations, and interior maps
- Backend auth tests
- Backend save/game-flow integration test
- Game content validation test
- Cleanup of accidental generated source artifacts in `game/src/`
- Cleanup of the stray old SQLite artifact path under `backend/backend/`
- Verified commands:
- `npm run build`
- `npm run test`
- `npm run db:migrate`
- `npm run content:validate`
- `npm run dev -w game` stays alive as a watcher
- `npm run dev -w backend` stays alive as a watcher
- `npm run dev -w client` stays alive as a watcher
- Isolated-port runtime smoke pass confirmed:
- backend responds to `/api/health`
- client serves the app shell
- game watcher stays alive without crashing
- Notes:
- There is still room for future refinement, but the current Phase 1 goals and done criteria are satisfied.

## Phase 2 Progress

- Status: completed
- Completed:
- Re-grounded against `_INITIAL.md` before phase work
- Re-aligned `AGENTS.md` to the actual repo
- Strengthened `README.md` with Chris-safe edit guidance
- Added `.claude/skills/test/SKILL.md`
- Added `.claude/skills/build/SKILL.md`
- Added `.claude/skills/commit/SKILL.md`
- Added `.claude/skills/content-authoring/SKILL.md`
- Added explicit source-of-truth guidance for where Chris should edit auth, UI, content, schemas, and persistence
- Notes:
- If the repo structure changes materially later, Phase 2 docs should be re-verified against reality again.

## Phase 3 Progress

- Status: in progress
- Completed:
- Added hex-map helpers and authored overworld tile layout support in `game/`
- Tightened content validation for starting locations, map bounds, and point-of-interest links
- Added migration tracking plus overworld exploration persistence fields
- Added persisted player position and discovered-tile state in SQLite
- Added backend travel flow with fog-of-war reveal and location-discovery updates
- Added backend integration coverage for travel, discovery, and location gating
- Replaced the flat overworld DOM board with a PixiJS-rendered angled hex scene
- Replaced the text-only courier label with a full-body placeholder token rendered above the active tile
- Added fog, terrain depth, location markers, and drag-pan behavior to the overworld renderer
- Reworked vault and location screens to render as PixiJS angled interior scenes
- Added client projection helper tests and included client tests in the root `npm run test` path
- Verified commands:
- `npm run build`
- `npm run test`
- `npm run db:migrate`
- `npm run content:validate`
- Next focus:
- stronger click-to-enter affordances and transition polish
- first dialogue UI and data-driven interaction flow
- first faction consequence hook tied to a location or NPC
- visible movement toward the original game vision in `docs/todo/initial/original.md`
