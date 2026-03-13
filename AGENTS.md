# Fallout Of Civilization

Single-player browser RPG prototype. TypeScript monorepo with an Astro frontend shell, Express API backend, shared `game/` rules and content package, SQLite persistence, and automated tests.

## Phase 1 Target

Phase 1 is a platform-plus-vertical-slice milestone.

The first playable output is:

After login, a player can create or load a save, enter a basic in-game shell, view a stub overworld or region screen, open a vault or home panel, and transition into one placeholder location screen backed by persisted game state.

## Architecture Rules

- `frontend/` is responsible for rendering UI and calling backend APIs.
- `backend/` is responsible for auth, persistence, API orchestration, and save handling.
- `game/` is the source of truth for game rules, content schemas, and shared deterministic helpers.
- Quests, factions, dialogue, items, locations, maps, and progression data must be data-driven.
- Do not hardcode authoritative game content or branching rules in UI components.

## Expected Repository Structure

```text
./
├── frontend/                # Astro app shell + React/Pixi client UI
│   └── src/
│       ├── app/             # Bootstrapping, routes, providers
│       ├── components/      # Shared UI components
│       ├── features/        # Auth, shell, world, vault, location flows
│       ├── pages/           # Astro pages / route entry points
│       ├── lib/             # API client, helpers
│       └── styles/          # Tokens and global styles
├── backend/                 # Express API server
│   └── src/
│       ├── controllers/     # Route handlers
│       ├── services/        # Domain logic
│       ├── repos/           # SQLite data access
│       ├── validators/      # Zod request validation
│       ├── middleware/      # Auth/session/error handling
│       ├── db/              # Connection, migrations, test DB setup
│       ├── shared/          # Shared backend helpers/types
│       └── __tests__/       # Vitest backend tests
├── game/                    # Shared game content, schemas, deterministic rules
│   ├── content/
│   │   ├── world/
│   │   ├── locations/
│   │   └── maps/
│   ├── schemas/
│   └── rules/
├── docs/                    # Planning docs, ADRs, content notes
├── tools/                   # Local scripts and utilities
├── .claude/skills/          # Claude Code command/skill docs
├── package.json             # Workspace config
└── tsconfig.base.json       # Shared TypeScript config
```

## Stack

### Language and tooling

- TypeScript across all workspaces
- Node.js 22 LTS
- `npm` workspaces
- ES modules where supported by the toolchain
- Shared base TypeScript config in `tsconfig.base.json`

### Frontend

- Astro for app shell and routing
- React for interactive UI
- PixiJS for overworld or tactical map rendering when needed
- Mobile-first layout

### Backend

- Express API server
- Zod for request validation
- Session-based auth with HTTP-only cookies
- `argon2` for password hashing

### Persistence

- SQLite for local development
- SQL migrations committed in-repo
- Repository layer for data access
- Auth data and runtime save data stored separately from authored content

## Persistence Goals

Minimum Phase 1 persistence must cover:

- `users`
- authenticated sessions
- `save_games`
- `player_characters`
- `world_state`
- `map_discovery`
- `quest_state`
- `faction_standing`

## Content Rules

- Establish `game/content/` as the source of truth for authored content.
- Use stable IDs for locations, maps, quests, factions, companions, and items.
- Overworld locations must link to enterable interior or special-location maps by stable ID.
- Keep authored content separate from runtime save data.
- Content files define the map and metadata; save data defines what changed during play.

### Phase 1 content set

Phase 1 should include placeholder content for:

- one starting vault
- one outdoor region
- one tavern or building interior
- one cave or hostile interior
- one special landmark interior

### Content file expectations

Each location definition should include at least:

- unique ID
- display name
- type
- overworld position or region reference
- linked interior map ID if enterable
- faction tags
- quest tags
- encounter flags

Each interior map definition should include at least:

- unique ID
- theme
- tile or hex layout data
- spawn points
- exits
- interactables
- NPC placements
- loot or container placements
- quest hooks or trigger IDs

## Authentication Rules

- Registration, login, logout, and session restore on refresh are required in Phase 1.
- Passwords must be hashed before storage.
- Protected routes must require an authenticated session.
- The logged-in frontend shell must be reachable only through valid session state.

## Frontend Rules

For Phase 1, the frontend must provide:

- registration and login screens
- a protected logged-in shell
- a mobile-optimized layout
- a top bar with settings access
- a bottom navigation bar that opens basic dialogs or panels
- a stub overworld or region screen
- a vault or home panel
- one placeholder location or interior screen

The frontend must not own authoritative quest logic, faction rules, map definitions, or progression rules.

## Testing and Validation

- Use Vitest for backend unit tests.
- Add unit tests for registration and login.
- Coverage must run successfully.
- Content validation must fail fast with useful errors.
- Content files must be validated during development startup or via a test or validation command.

## Standard Commands

The repo should support these commands:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run db:migrate`

## Quality Gates

Before committing or opening a PR, agents must ensure relevant checks pass:

1. `npm run build` for affected workspaces
2. `npm run test`
3. content validation
4. `npm run db:migrate` still works for local setup changes

Do not commit if required checks fail.

## README and Environment Expectations

- Keep `README.md` aligned with the actual setup flow.
- Provide `.env.example`.
- Document local SQLite path.
- Document development ports.
- Document first-time setup, migration, run, and test steps.

## Claude Code Workflow

This repo should maintain lightweight Claude Code support under `.claude/skills/`.

Expected command-oriented docs or skills:

- `/test` for running the standard validation and test flow
- `/build` for running the build and verification flow
- `/commit` for pre-commit checks and commit guidance

If these do not exist yet, create or update them as part of repository workflow work rather than assuming they are already available.

## Non-Goals For Phase 1

- full tactical combat
- full procedural world expansion
- full quest content implementation
- final art assets
- production deployment
- bot framework implementation

## Gotchas

- Do not hardcode authored content in the frontend.
- Do not mix runtime save state into content files under `game/content/`.
- Do not couple location transitions through UI-specific conditionals when a content link by ID should exist.
- Keep backend logic deterministic where possible so it remains testable.
