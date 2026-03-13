# Project Goals

This file defines the initial implementation goals for `falloutofcivilization`.

## Tracking

Implementation tracking is split into phase documents under `docs/todo/initial/phases/`.

- Read `docs/todo/initial/phases/_INITIAL.md` first.
- Use `docs/todo/initial/phases/PHASE-1.md` for the platform and playable-stub buildout.
- Use `docs/todo/initial/phases/PHASE-2.md` for AI automation, skills, agent alignment, and handoff hardening.
- Use `docs/todo/initial/phases/PHASE-3.md` for aligning the runnable base with the original game vision.
- Update `docs/todo/initial/phases/_PROGRESS.md` as work advances.

## Phase 1 Goal

Phase 1 is a platform-plus-vertical-slice milestone.

The target is not just "auth works." The target is:

After login, a player can create or load a save, enter a basic in-game shell, view a stub overworld screen, open a vault or home panel, and transition into one placeholder location screen backed by persisted game state.

## Architecture Rules

- `client/` is responsible for rendering UI and calling backend APIs.
- `backend/` is responsible for auth, persistence, API orchestration, and save handling.
- `game/` is the source of truth for game rules, content schemas, and shared deterministic helpers.
- Quests, factions, dialogue, items, locations, and progression data must be data-driven and must not be hardcoded in UI components.

## Initial Delivery Scope

### 1. Repository and workspace structure

- Set up the directory structure for `client/`, `backend/`, `game/`, and any required shared workspace packages.
- Add skeleton code so each major workspace has a clear entry point and can build and run.
- Make sure the backend, client, and game package all run in local development.

### 2. Backend foundation

- Set up SQLite for local development.
- Add migration support and a canonical migration flow.
- Create a `users` table stored in SQLite.
- Implement basic registration, login, logout, and session restoration flows.
- Persist registered users in SQLite.
- Define and implement a session storage strategy suitable for local development and extension later.
- Hash passwords securely before storage.

### 3. Frontend foundation

- Replace the placeholder marketing-only surface with a basic logged-in application shell.
- Ensure the logged-in experience is mobile-optimized.
- Add a basic top bar with settings access.
- Add a basic bottom navigation bar with buttons that open dialogs or panels.
- Add protected route handling and session restore on refresh.
- Make sure a logged-in user can reach and see this page successfully.

## Initial Gameplay Stub

- Allow a logged-in user to create or load a save.
- The user can reach a basic in-game screen after login.
- The user can view a placeholder overworld or region view.
- The user can open a vault or home panel.
- The user can enter one placeholder location or interior screen.
- This state is persisted and restored from SQLite.

## Persistence Goals

- Create persistence for users and authenticated sessions.
- Create persistence for save games and player state.
- Create persistence for at least basic world state, discovered map state, and quest or faction placeholders.

### Minimum game-state persistence

- `save_games`
- `player_characters`
- `world_state`
- `map_discovery`
- `quest_state`
- `faction_standing`

## Content and Validation Goals

- Create the initial `game/` package for deterministic rules, schemas, and content definitions.
- Add validation for content files so malformed content fails fast in development or test.

### 8. Data-driven location and map content

- Establish `game/content/` as the source of truth for authored game content.
- Define a content format for overworld regions, discoverable locations, and interior maps.
- Each enterable location such as a tavern, vault, cave, casino, fort, or major landmark must be able to reference its own map definition file.
- Support a link from an overworld location record to an interior or special-location map by stable ID, not hardcoded UI logic.
- Add placeholder content files for:
- one starting vault
- one outdoor region
- one tavern or building interior
- one cave or hostile interior
- one special landmark interior
- Define a schema for map and content files and validate them during development and test runs.
- Ensure malformed content fails fast with useful errors.
- Make map loading data-driven so entering a location loads the correct map, theme, NPC set, interactables, and encounter metadata from content files.

## Content File Goals

- Create a clear folder structure under `game/content/`, for example:
- `game/content/world/`
- `game/content/locations/`
- `game/content/maps/interiors/`
- `game/content/maps/overworld/`
- Each location file should include:
- unique ID
- display name
- type
- overworld position or region reference
- linked interior map ID if enterable
- faction tags
- quest tags
- encounter flags
- Each interior map file should include:
- unique ID
- theme
- tile or hex layout data
- spawn points
- exits
- interactables
- NPC placements
- loot or container placements
- quest hooks or trigger IDs
- Keep authored content separate from runtime save data. Content files define the map; save data defines what changed in that map during play.

### 7. Testing and quality

- Set up unit test infrastructure for backend auth flows.
- Add unit tests for registration.
- Add unit tests for login.
- Set up test coverage reporting and ensure it runs successfully.
- Add content validation to the quality workflow.

### 8. Agent and workflow support

- Update `AGENTS.md` so it reflects the real project architecture and workflow instead of the old template.
- Add Claude Code skills or repo instructions for `/test`, `/commit`, and `/build`.

### 9. Developer onboarding

- Write a basic `README.md` with first-time setup instructions.
- Include install, environment setup, migration, run, and test steps.
- Add `.env.example`.
- Document the local SQLite path and development ports.

## Standard Developer Workflow

The repo should support these commands as the default local workflow:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run db:migrate`

## Quality Gates

Before this phase is considered complete:

- Backend build passes.
- Frontend build passes.
- Tests pass.
- Coverage runs successfully.
- Content validation passes.
- `AGENTS.md` and `README.md` match the actual repo.

## Non-Goals For This Phase

- Full tactical combat
- Full procedural world expansion
- Full quest content implementation
- Final art assets
- Production deployment

## Done Criteria

This phase is complete when:

- A new developer can clone the repo, install dependencies, configure the environment, run migrations, start the app, register a user, log in, refresh the page without losing session state, and log out.
- A logged-in player can create or load a save and enter the basic in-game shell.
- The player can see a mobile-optimized stub overworld screen, open a vault or home panel, and transition into one placeholder location screen.
- User data and minimal game state are persisted in SQLite.
- Backend, client, and shared game code all build cleanly.
- Auth tests pass.
- Coverage runs successfully.
- Content validation passes.
- `AGENTS.md` and `README.md` match the actual repo.

## Done Criteria For This Area

This part is complete when:

- The project can load location definitions from content files.
- The project can load at least one interior map from a content file when the player enters a location.
- The location-to-map link is data-driven and validated by schema.
- At least three example authored content files exist and are wired into the game flow.
