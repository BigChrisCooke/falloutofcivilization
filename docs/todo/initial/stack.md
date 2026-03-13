# Stack

This project is a TypeScript monorepo for a browser-based, single-player RPG with a real API backend, Astro frontend, shared game rules, authored content files, SQLite persistence, and automated tests.

## Phase 1 Target

Phase 1 is a platform-plus-vertical-slice milestone.

The first playable output is:

After login, a player can create or load a save, enter a basic in-game shell, view a stub overworld or region screen, open a vault or home panel, and transition into one placeholder location screen backed by persisted game state.

## Core Stack

### Language and workspace

- TypeScript across all workspaces
- Node.js 22 LTS
- `npm` workspaces
- Shared base config in `tsconfig.base.json`

### Frontend

- Astro for the frontend app shell, pages, and content-first routing
- React inside Astro for interactive UI and game-specific panels
- PixiJS for rendering the isometric / hex-based game map and tactical scenes
- CSS variables plus scoped CSS for styling
- Mobile-first layout

### Backend

- Express API server
- Zod for request and content validation
- Session-based authentication with HTTP-only cookies
- `argon2` for password hashing

### Database

- SQLite for local and early production persistence
- SQL migrations stored in-repo
- Repository layer for DB access
- Save data and auth data stored separately from authored content
- Initial persistence must cover:
  - users
  - authenticated sessions
  - save games
  - player characters
  - world state
  - discovered map state
  - quest state placeholders
  - faction standing placeholders

### Shared game layer

- `game/` package for:
  - authored content
  - schemas
  - deterministic rules
  - map definitions
  - quest, faction, and dialogue data

### Content format

- YAML for authored game content
- Zod schemas to validate YAML files into typed game objects
- Stable IDs for locations, maps, quests, factions, companions, and items
- Content must be linked by stable IDs, not hardcoded UI behavior
- Enterable overworld locations must be able to reference interior or special-location maps by ID
- Phase 1 should include placeholder authored content for:
  - one starting vault
  - one outdoor region
  - one tavern or building interior
  - one cave or hostile interior
  - one special landmark interior

### Testing

- Vitest for unit and backend/system tests
- Playwright for frontend smoke tests
- Content validation tests for YAML files
- Deterministic scenario tests for combat, dialogue, quest flow, and map transitions

## Why Astro

Astro is the frontend shell, not the game rules engine.

It is responsible for:

- landing pages
- login and registration pages
- app shell
- loading screens
- settings, codex, quest log, and account UI
- mounting React/Pixi game views where needed

For Phase 1, the frontend must also provide:

- registration and login screens
- protected app routing
- session restore on refresh
- a mobile-optimized logged-in shell
- a top bar with settings access
- a bottom navigation bar that opens basic dialogs or panels

React and PixiJS handle the heavy interactivity inside Astro pages.

## Architecture Boundaries

### `frontend/`

Responsible for:

- Astro pages and routing
- React UI components
- PixiJS map rendering
- API calls to the backend
- local UI state

It must not contain authoritative quest logic, faction rules, or map definitions.

### `backend/`

Responsible for:

- auth
- sessions
- save/load
- logout
- persistence
- API orchestration
- applying player actions
- validating and loading game content
- returning game state to the frontend

### `game/`

Responsible for:

- YAML content files
- content schemas
- world, location, and interior map definitions
- dialogue trees
- faction rules
- quest graphs
- deterministic formulas and shared rule helpers

This is the source of truth for game rules and content.

## Phase 1 Workflow

The repo should support these commands:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run db:migrate`

## Phase 1 Quality Gates

Before Phase 1 is considered complete:

- backend build passes
- frontend build passes
- tests pass
- coverage runs successfully
- content validation passes
