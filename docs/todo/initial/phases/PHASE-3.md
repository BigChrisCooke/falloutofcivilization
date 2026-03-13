# Phase 3

Read `docs/todo/initial/phases/_INITIAL.md` first. It is a constant guide for this phase.

## Purpose

Phase 3 is the alignment phase between the current runnable base and the original game vision in `docs/todo/initial/original.md`.

Phase 1 proved that the repo can run.

Phase 2 proved that Chris can work on it safely with AI help.

Phase 3 must prove that the project is becoming the actual game, not just a well-structured shell.

## Main Gap

The current repo is structurally sound, but it still does not deliver the strongest parts of the original pitch:

- isometric or hex-based graphical exploration
- fog of war
- map-driven discovery
- strong visual game identity
- dialogue and faction consequence hooks
- quest structure that reflects the Courier fantasy

So the focus of this phase is not auth, migrations, or documentation.

The focus is game feel, map presentation, and the first visible steps toward the intended RPG experience.

## Primary Outcome

After login and loading a save, the project should feel recognizably closer to the original game direction:

- the overworld should feel like a game map, not a list of buttons
- the player should feel like a courier moving through a world
- location transitions should feel like entering distinct spaces
- the UI should begin showing actual exploration identity instead of only application structure

## Source Material

This phase must stay grounded in:

- `docs/todo/initial/original.md`
- `docs/todo/initial/stack.md`
- `docs/todo/initial/goal.md`
- the completed Phase 1 and Phase 2 outputs

Do not treat this phase as a rewrite of the base architecture. Build on the finished base.

## Scope

### 1. Visual exploration foundation

Goal:

Turn the overworld into a real graphical exploration surface.

Deliver:

- render a real hex map instead of a text-only location list
- choose and commit to the first actual map renderer for the client
- support tile selection, hover, and current player position
- show a courier marker on the map
- visually represent fog of war
- reveal nearby hexes as the player explores
- load the map view from authored content, not hardcoded client data

Why this matters:

This is the fastest way to move the repo toward the original vision of a Civilization-like exploration layer.

### 2. Interior map presentation

Goal:

Make interior transitions feel like entering a different playable space.

Deliver:

- define a graphical or strongly spatial interior-map presentation
- support distinct themes for vaults, taverns, caves, and special landmarks
- render exits, interactables, NPC placements, and loot markers in a clearer visual way
- improve transitions between overworld and interior states

Why this matters:

The original direction depends on locations becoming deeper, themed spaces when entered.

### 3. Exploration systems

Goal:

Make exploration matter beyond selecting a location.

Deliver:

- fog-of-war reveal rules
- movement or travel-cost rules
- discovered-location tracking tied to visible map state
- location discovery events or reveal behavior
- a first pass on region expansion or reveal logic
- persisted map-state updates

Why this matters:

The original concept is built around exploration and discovery, not just static scene switching.

### 4. Dialogue and faction hooks

Goal:

Start proving the New Vegas-style consequence layer.

Deliver:

- a dialogue UI flow for an NPC or interaction
- data-driven dialogue content
- faction standing changes from choices
- one or two concrete consequence examples
- one recruitable or companion-adjacent content hook

Why this matters:

The game is not only about maps. It is also about choices, standing, and outcomes.

### 5. Quest structure

Goal:

Introduce the three quest families named in `original.md`.

Deliver:

- one companion-style quest trigger
- one faction quest
- one retrieval quest
- quest state transitions stored in save data
- links between quest state, dialogue, factions, and locations

Why this matters:

This is the point where the game starts feeling like an RPG instead of only a navigation shell.

### 6. Character and vault progression hooks

Goal:

Align progression with the original pitch.

Deliver:

- first pass on character skills or stats
- progression hooks that affect exploration or dialogue
- a small perk or specialization structure
- vault-growth hooks that remain secondary to character growth
- one or two vault improvements that unlock support features

Why this matters:

The original direction is character-led progression with light vault development, not base-building as the main loop.

## Immediate Next Milestone

Do not attempt the whole phase at once.

The first milestone for Phase 3 should be:

### Milestone 1: Make The Overworld Feel Like The Game

Deliver:

- a real graphical hex map
- a courier marker
- visible fog of war
- click-to-enter authored locations on the map
- one improved graphical interior transition

This milestone is the highest-value move because it changes the feel of the project immediately and visibly.

## Rules

- keep authored content in `game/content/`
- keep schemas and validation data-driven
- do not move authoritative gameplay logic into React components
- keep runtime save-state updates in backend persistence
- make visual changes prove game identity, not just decorate existing panels
- preserve the Chris-safe structure established in Phase 2

## Exit Criteria

Phase 3 is succeeding when:

- the first thing you see after login feels like a game world, not a form-driven shell
- the overworld visually communicates exploration and discovery
- entering a location feels like entering a distinct space
- early dialogue and faction hooks start affecting what happens next
- the repo still stays safe and understandable for Chris to extend with AI help

## Anti-Goals

Do not turn Phase 3 into:

- a backend-only expansion pass
- a pure art exercise with no gameplay wiring
- a rewrite of the finished base architecture
- a huge systems spike with no visible player-facing improvement

Phase 3 should create visible, playable movement toward the original vision.
