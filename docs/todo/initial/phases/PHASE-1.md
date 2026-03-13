# Phase 1

Read `docs/todo/initial/phases/_INITIAL.md` first. It is a constant guide for this phase.

## Purpose

Build the actual project base and the first playable stub.

This phase is about making the repo real, runnable, and understandable, not just documenting intent.

## Primary Outcome

After login, a player can create or load a save, enter a basic in-game shell, view a stub overworld or region screen, open a vault or home panel, and transition into one placeholder location screen backed by persisted SQLite state.

## Scope

### 1. Workspace and repository foundation

- Set up the real workspace structure for `frontend/`, `backend/`, `game/`, and any required shared packages.
- Add skeleton code and entry points so each major package builds and runs.
- Make sure local development starts cleanly.

### 2. Backend foundation

- Set up SQLite for local development.
- Add migrations and a canonical migration flow.
- Create a `users` table.
- Create runtime persistence for:
- `save_games`
- `player_characters`
- `world_state`
- `map_discovery`
- `quest_state`
- `faction_standing`
- Implement registration, login, logout, and session restore.
- Hash passwords securely.

### 3. Frontend foundation

- Replace the placeholder frontend with the real game-facing app shell.
- Create registration and login screens.
- Add protected route handling.
- Restore session state on refresh.
- Build a mobile-optimized logged-in shell.
- Add a top bar with settings access.
- Add a bottom bar with buttons that open dialogs or panels.

### 4. First playable stub

- Let the user create or load a save.
- Show a stub overworld or region view.
- Let the user open a vault or home panel.
- Support one placeholder transition into an interior or special-location screen.
- Persist and restore this state from SQLite.

### 5. Game package and content foundation

- Create `game/` as the source of truth for schemas, rules, and content definitions.
- Create `game/content/` with a clear folder structure.
- Support data-driven linking from overworld location to interior map by stable ID.
- Add placeholder authored content for:
- one starting vault
- one outdoor region
- one tavern or building interior
- one cave or hostile interior
- one special landmark interior
- Validate content files during development or test.

### 6. Tests and onboarding

- Set up backend unit tests.
- Add tests for register and login.
- Set up coverage and make sure it runs.
- Add `.env.example`.
- Write a usable first-time setup `README.md`.
- Document ports, SQLite path, migration flow, dev flow, and test flow.

## Exit Criteria

- `npm run dev` works for local development.
- `npm run build` works for the implemented workspaces.
- `npm run test` works.
- `npm run db:migrate` works.
- A user can register, log in, refresh without losing session state, and log out.
- A logged-in user can create or load a save and reach the in-game shell.
- The user can view a stub overworld, open a vault or home panel, and enter one placeholder location.
- Auth data and minimal save state persist in SQLite.
- Content validation runs and catches malformed content.
- README and repo structure are usable by Chris without extra interpretation.

## Out Of Scope

- full combat
- full procedural world generation
- full quest implementation
- final art
- production deployment
- bot framework implementation
