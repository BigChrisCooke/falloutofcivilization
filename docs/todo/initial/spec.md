# Courier RPG AI Starter

Starter document for another AI agent to scaffold and extend a new game project using a structure similar to this repo, with the frontend moved to `/frontend`.

## Project Summary

Build a single-player, isometric, turn-based RPG on a hex map. The player starts as a Courier in a vault and explores a fog-of-war world that expands as they travel. The main inspirations are the exploration feel and angled map presentation of *Civilization IV* and the factions, tension, and quest structure of *Fallout: New Vegas*.

The game has two exploration layers:

1. The overworld hex map for travel, discovery, encounters, faction pressure, and route planning.
2. Interior or special-location maps for detailed exploration inside buildings, caves, vaults, forts, dams, casinos, and similar spaces.

Character progression is centered on the Courier rather than the base. The starting vault grows over time, but the core loop is exploration, dialogue, faction reputation, combat, loot, quest resolution, and character build development.

## IP Note

If this moves beyond a private prototype, replace copyrighted names, factions, locations, dialogue, story beats, and visual references with original or properly licensed material. Treat Fallout and Civilization references as creative direction, not production-safe content.

## Core Design Pillars

- Exploration first: the player should steadily reveal the map and feel pulled toward unknown tiles, landmarks, and rumors.
- Small tactical choices: movement, elevation, cover, range, line of sight, and AP economy matter in turn-based encounters.
- Consequential dialogue: faction standing, quest availability, companion approval, and endings change based on dialogue and actions.
- Layered world: exterior travel is broad and strategic; interior maps are denser, more handcrafted, and more narrative.
- Character-led progression: the Courier's skills, perks, gear, companions, and relationships matter more than settlement management.
- Strong reactivity: quest branches should track who lived, who died, who was convinced, who was betrayed, and which factions benefited.

## Repository Structure

```text
./
├── frontend/                    # React frontend (Vite)
│   └── src/
│       ├── api/                 # HTTP client, query helpers, DTO mapping
│       ├── app/                 # Router, providers, bootstrapping
│       ├── components/          # Reusable UI components
│       ├── features/            # Exploration, combat, dialogue, quests, vault
│       ├── pages/               # Route-level screens
│       ├── contexts/            # Auth, session, world state, UI state
│       ├── hooks/               # Shared hooks
│       ├── styles/              # Global tokens and shared styles
│       └── types/               # Frontend-only view models
├── backend/                     # API server and orchestration layer
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── services/            # Domain logic entry points
│   │   ├── repos/               # Persistence access
│   │   ├── validators/          # Request validation
│   │   ├── middleware/          # Auth, saves, error handling
│   │   ├── systems/             # Turn resolution, AI turns, fog, pathing
│   │   ├── shared/              # Types, helpers, result objects
│   │   └── __tests__/           # Backend/system tests
│   └── data/
│       ├── seeds/               # Test and local dev save seeds
│       └── migrations/          # SQL migrations
├── game/                        # Source-of-truth game content and rules data
│   ├── content/
│   │   ├── factions/            # Faction definitions and reputation rules
│   │   ├── quests/              # Quest graphs and scripted consequences
│   │   ├── companions/          # Companion data and trigger rules
│   │   ├── dialogue/            # Dialogue trees and skill checks
│   │   ├── locations/           # Overworld landmarks and interior locations
│   │   ├── encounters/          # Enemy groups, loot tables, ambient events
│   │   ├── items/               # Weapons, armor, consumables, quest items
│   │   ├── skills/              # Player skills, perks, passive effects
│   │   └── world/               # Region layouts, biome rules, expansion seeds
│   ├── schemas/                 # Zod/JSON schemas for content validation
│   └── rules/                   # Deterministic rules helpers shared by backend
├── bots/                        # Simulation and regression bots
├── packages/
│   ├── shared-types/            # Shared contracts used by frontend/backend/game
│   └── map-tools/               # Hex helpers, generation tools, debug utilities
├── docs/                        # Design docs, ADRs, content guides
├── package.json                 # Workspace config
└── tsconfig.base.json           # Shared TypeScript config
```

## Architecture Summary

### Backend

Use a layered structure:

`controllers -> validators -> services -> repos -> db`

Put all persistent game rules in `game/` and keep the backend responsible for:

- save loading and saving
- turn execution
- encounter setup
- dialogue outcome application
- quest state transitions
- faction standing updates
- inventory/equipment changes
- procedural reveal and spawn decisions

### Frontend

The frontend should render state and send intents. It should not own core rules. Keep rule evaluation on the backend or in shared deterministic helpers under `game/rules/`.

Recommended feature slices:

- `features/exploration`
- `features/combat`
- `features/dialogue`
- `features/quests`
- `features/companions`
- `features/inventory`
- `features/character`
- `features/vault`

### Game Content

`/game` is the source of truth for content and balance. Treat it like a data pack plus rules package. It should contain:

- map region definitions
- location metadata
- encounter templates
- dialogue trees
- faction reputation thresholds
- quest state machines
- skill/perk definitions
- loot tables
- companion trigger rules

Do not hardcode these in React components or route handlers.

## Core Systems To Build

### 1. Overworld Hex Exploration

- Fog of war starts around the vault and expands as the player moves.
- The world should reveal by chunk, ring, or seeded region instead of requiring one giant prebuilt map.
- Travel consumes action points, time, or supplies.
- Hexes can contain terrain, hazard tags, encounter chance, discovery chance, and points of interest.
- Certain tiles unlock interior maps or story scenes.

### 2. Interior / Special Location Maps

- Entering a location loads a different tactical map with its own art set, collision, NPCs, interactables, and encounter state.
- Interior maps should support scripted dialogue, loot containers, hidden paths, and quest flags.
- A location can exist in two linked forms:
  - overworld entry node
  - interior map instance or template

### 3. Turn-Based Tactical Combat

- Combat uses AP, initiative, movement range, attack costs, hit calculations, damage, armor, and status effects.
- Prefer deterministic, testable formulas with explicit randomness injection.
- Support cover, elevation, melee, ranged, and simple area effects early.
- Companions and enemies should use the same core combat rules.

### 4. Dialogue and Faction Standing

- Dialogue choices can gate quest lines, modify faction reputation, recruit or lose companions, avoid combat, or change endings.
- Dialogue checks should be data-driven and tied to character skills, perks, inventory items, quest flags, or faction standing.
- Reputation should support thresholds like `vilified`, `shunned`, `neutral`, `liked`, `idolized`.

### 5. Quest Framework

Support three main quest families from the start:

- Companion quests
  - Triggered by companion affinity, travel history, dialogue history, or entering specific locations.
- Faction quests
  - Triggered by allegiance, reputation thresholds, completed jobs, or major story choices.
- Retrieval quests
  - Go to a dangerous location, secure an item, and decide who receives it.

Every quest should support:

- prerequisites
- branching objectives
- failure states
- mutually exclusive resolutions
- reward bundles
- dialogue and faction effects
- ending flags

### 6. Character Progression

- The Courier levels up skills and perks.
- Skills should affect combat, dialogue, lockpicking, medicine, repair, stealth, scouting, and survival.
- Base growth exists, but should be secondary to character progression.

### 7. Vault Development

- The starting vault acts as a home base, stash, recovery zone, companion hub, and quest anchor.
- Keep vault progression light and useful rather than turning the game into a city builder.
- Good vault upgrades: medbay, workshop, scouting station, caravan support, archives, training room.

## Project Rules For The Other AI

### Engineering Rules

- Use TypeScript across frontend, backend, bots, and shared packages.
- Use strict mode. No `any` in new code.
- Use ES modules with explicit `.js` import extensions where the toolchain requires them.
- Keep backend logic deterministic and easy to test.
- Prefer small, domain-focused services over large god objects.
- Put shared contracts in `packages/shared-types/`.
- Validate content files with schemas before loading them into the game.

### Content Rules

- All quests, dialogue, companions, factions, items, and map definitions must be data-driven.
- Never hardcode quest branches in UI components.
- Never hardcode faction reaction rules in more than one place.
- Interior maps must be linked from world locations through IDs, not by stringly coupled ad hoc logic.
- Use tags and flags for content gating instead of scattered boolean fields.
- Every quest and dialogue effect should declare its state changes explicitly.

### Gameplay Rules

- Exploration must continue to generate meaningful discoveries after the first few sessions.
- Combat should be avoidable in some cases through stealth, dialogue, disguise, or faction alignment.
- Choices should usually trade one advantage for another instead of only giving obviously correct outcomes.
- Companion content should respond to party composition and visited locations.
- Retrieval quests should allow at least three outcomes when appropriate:
  - return item to the requester
  - keep or repurpose the item
  - hand it to a rival

### Separation Rules

- `frontend/` renders and orchestrates UX.
- `backend/` executes intents and persists state.
- `game/` owns content, balance, and deterministic rule helpers.
- `bots/` simulates playthroughs, battle cases, and progression edge cases.

## Naming Conventions

- Backend files: `snake_case.ts`
- Frontend React components: `PascalCase.tsx`
- Shared packages: `kebab-case`
- TypeScript variables/functions: `camelCase`
- TypeScript interfaces/types/classes: `PascalCase`
- DB tables and columns: `snake_case`

## Suggested Commands

| Command | Description |
|---|---|
| `npm run dev` | Start backend and frontend together |
| `npm run dev:backend` | Run API/server only |
| `npm run dev:frontend` | Run React frontend only |
| `npm run build` | Build backend, frontend, and shared packages |
| `npm run test` | Run core automated tests |
| `npm run test:backend` | Run backend/system tests |
| `npm run test:content` | Validate all content files against schemas |
| `npm run bots:smoke` | Run scripted simulation passes |

## Data Model Expectations

At minimum, define and validate these content entities:

- `Faction`
- `Companion`
- `Quest`
- `QuestObjective`
- `DialogueNode`
- `DialogueChoice`
- `Location`
- `InteriorMap`
- `EncounterTemplate`
- `EnemyTemplate`
- `Item`
- `Weapon`
- `Armor`
- `Skill`
- `Perk`
- `WorldRegion`
- `HexTileRule`

At minimum, persist these runtime entities:

- `PlayerCharacter`
- `SaveGame`
- `WorldState`
- `MapDiscoveryState`
- `FactionStanding`
- `QuestState`
- `CompanionState`
- `InventoryEntry`
- `LocationState`
- `CombatState`

## Testing Expectations

Every systemic change should come with tests that verify behavior rather than snapshots of assumptions.

Minimum coverage areas:

- fog-of-war reveal logic
- chunk or region expansion rules
- map transition rules between overworld and interiors
- dialogue checks and outcome application
- faction reputation thresholds
- quest branching and mutually exclusive resolutions
- combat hit, damage, AP, and death resolution
- loot generation and retrieval quest item placement
- companion trigger conditions
- save/load integrity

## Skill Set To Create For The Other AI

Use a small set of focused skills rather than one giant project skill.

### 1. `hex-exploration`

Use when building or tuning overworld generation, fog of war, terrain rules, travel costs, scouting, chunk reveal, landmark placement, and encounter rolls.

### 2. `tactical-combat`

Use when implementing AP systems, initiative, attacks, cover, line of sight, status effects, damage formulas, enemy AI turns, and combat regression tests.

### 3. `dialogue-faction`

Use when writing dialogue trees, speech checks, faction reputation changes, NPC reaction logic, persuasion outcomes, and ending-state consequences.

### 4. `quest-design`

Use when defining quest graphs, objectives, branching outcomes, failure states, trigger conditions, and reward/effect payloads.

### 5. `companion-content`

Use when building companion personalities, affinity systems, travel banter triggers, loyalty quests, and companion-specific reactions to places or factions.

### 6. `location-maps`

Use when designing interior maps, special-location transitions, room logic, interactables, theme variations, encounter placement, and location metadata.

### 7. `character-progression`

Use when implementing skills, perks, level curves, loadouts, stat checks, progression pacing, and non-combat build viability.

### 8. `vault-progression`

Use when working on the home-base loop, vault upgrades, unlocked services, companion facilities, and long-term support systems that should not overpower the RPG core.

### 9. `content-schema`

Use when defining JSON or TS content formats, schema validation, import pipelines, ID rules, and content authoring safety checks.

### 10. `ui-style`

Use when building the frontend look and feel, HUD, inventory panels, tactical overlays, dialogue presentation, quest logs, and responsive interaction patterns.

### 11. `save-and-state`

Use when implementing save structure, migration rules, world-state persistence, deterministic replay concerns, and rollback-safe state updates.

### 12. `test`

Use when adding backend or systemic tests. Focus on scenario-based tests that prove game rules instead of fragile implementation snapshots.

### 13. `build-release`

Use when running quality gates, preparing releases, updating changelogs, and verifying workspace builds.

## Recommended Skill Rules

Each skill should define:

- when it must be used
- source-of-truth files it owns
- test expectations
- naming rules
- common pitfalls
- change checklist

Examples:

- `dialogue-faction` should forbid hardcoding faction effects in UI files.
- `quest-design` should require explicit success, fail, and branch states.
- `content-schema` should require schema validation for every content file type.
- `tactical-combat` should require deterministic tests with controlled randomness.

## Initial Milestone Plan

### Milestone 1: Vertical Slice

Build:

- one starting vault
- one nearby outdoor region
- two or three explorable landmarks
- one interior dungeon or facility
- one recruitable companion
- one faction quest
- one companion quest trigger
- one retrieval quest
- one tactical combat scenario
- one dialogue branch that changes faction standing

### Milestone 2: System Hardening

Add:

- robust content schemas
- save/load migration support
- bot-driven smoke playthroughs
- regression tests for combat, quests, and dialogue
- more location transition coverage

### Milestone 3: Content Expansion

Add:

- multiple factions with competing questlines
- more companions
- larger region expansion
- more interior themes
- ending-state tracking

## Short Prompt To Hand To Another AI

> Build this as a TypeScript monorepo with `frontend/`, `backend/`, `game/`, `bots/`, and `packages/`. Keep all content and balance data-driven under `game/`. The game is an isometric, turn-based hex RPG where the Courier explores a fog-of-war world from a starting vault, enters interior maps for detailed locations, builds faction standing through dialogue and quest choices, and progresses mainly through character skills and perks. Support companion quests, faction quests, and dangerous retrieval quests from the start. Do not hardcode quests, factions, or dialogue in UI code. Make systems deterministic and testable.
