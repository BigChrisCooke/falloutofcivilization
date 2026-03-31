# Companion NPC System

Single-player companions that travel with the player, react to their choices, and unfold a personal story arc over the course of a run.

## Current State

One authored companion is implemented: **Dex**, a former caravan guard recruited at the Dusty Tavern.

---

## Recruitment

- Player enters the Dusty Tavern interior and speaks to Dex
- A dialogue option tagged `companionRecruit: "dex"` triggers recruitment
- Dex is added to the save with loyalty 50 and story stage 0
- Once departed, Dex cannot be re-recruited

---

## In-World Presence

**Interiors**
- Dex has his own position on the interior map, tracked separately from the player
- He loose-follows the player — moving one hex per player step toward a position 1–2 hexes behind
- If the player moves 4+ hexes away, Dex regroups (moves toward the player instead)
- When pursuing a goal, Dex pathfinds toward the goal tile instead of following
- Dex is suppressed from the NPC marker layer to avoid rendering twice

**Overworld**
- Dex does not appear on the overworld map — he travels with the player abstractly

---

## Pip-Boy Tab

- A **Companions** tab appears in the Pip-Boy overlay once a companion is recruited
- Shows name, current story stage title, and a loyalty bar (0–100)
- Loyalty bar turns red when below 20

---

## Loyalty

| Value | Meaning |
|-------|---------|
| 50 | Starting value |
| 0 | Companion departs permanently |
| < 20 | Warning reaction triggered |

**Increases from:**
- Generous dialogue choices (karma delta ≥ +2)

**Decreases from:**
- Stealing while Dex is present (−1 loyalty, negative reaction line plays)

When loyalty hits 0, a farewell message plays and the companion is marked `departed = 1` in the database.

---

## Story Arc

Dex has a four-stage story that advances automatically as the player explores the world.

| Stage | Title | Trigger | Summary |
|-------|-------|---------|---------|
| 0 | Old Roads | Immediate | Dex's history with the Crimson Caravan and the ambush that killed his crew |
| 1 | The Ambush | 2 locations visited | Insurance fraud discovered; Harland named as the probable inside man |
| 2 | Unfinished Business | 4 locations visited | Harland resurfaces; player chooses justice (expose) or confrontation |
| 3 | What Matters | 6 locations visited | Karma-branched ending — high karma leads to Harland's arrest, low karma sees him flee |

Story dialogue trees branch on karma. A `karmaMin >= 50` condition gates the moral resolution path at stage 3.

Story bubbles appear automatically on interior entry when a new stage triggers.

---

## Goals

Companions can pursue authored goals within locations — walking to specific tiles, completing character-arc moments, and optionally letting the player help. Goals are defined in the companion's YAML file.

**Goal schema fields:**
- `target` — `tile_type` (any tile of a given type) or `location_tile` (specific tile in a specific location)
- `triggerCondition` — optional; gates activation by `storyStage`, `karma`, or `locationId`
- `frequency` — `always`, `once`, or `sometimes` (~40% chance per location entry)
- `playerCanHelp` — if true, an interaction option appears when the player is adjacent to the companion at the goal tile
- `onComplete` — `dialogueTreeId`, `karmaDelta`, `storyNote`

**Dex's goals:**

| ID | Target | Trigger | Frequency | Player can help | On complete |
|----|--------|---------|-----------|-----------------|-------------|
| `investigate_supply_crate` | Any `crate` tile | Story stage ≥ 1 | Once | Yes | Fires `goal_supply_crate` dialogue — Dex finds Crimson Caravan shipping labels linking the circulating stolen cargo to the ambush |

---

## Reactions

Dex reacts to player actions during play:

- **Positive reaction** — plays after generous dialogue choices
- **Negative reaction** — plays after stealing or selfish choices
- **Warning** — plays when loyalty drops below 20
- **Farewell** — plays on departure

Reaction text is authored in `game/content/companions/dex-caravan-guard.yaml`.

---

## Architecture

| Layer | Location |
|-------|---------|
| Authored content | `game/content/companions/dex-caravan-guard.yaml` |
| Zod schema | `game/src/schemas/content.ts` — `companionSchema` |
| Database | `backend/src/db/migrations/007_companion_instances.sql` (base), `014_companion_position.sql`, `015_companion_goals.sql` |
| Repository | `backend/src/repos/companion_repo.ts` |
| Game service | `backend/src/services/game_service.ts` — recruit, story progression, movement, goal logic |
| Dialogue integration | `backend/src/services/dialogue_service.ts` — loyalty changes on option select |
| Inventory integration | `backend/src/services/inventory_service.ts` — stealing triggers loyalty loss |
| API endpoints | `backend/src/controllers/game_controller.ts` — `/companion/recruit`, `/companion/story` |
| Pip-Boy UI | `client/src/components/PipBoyOverlay.tsx` |
| Story/reaction bubbles | `client/src/components/InteriorMapPanel.tsx` |
| Token rendering | `client/src/lib/map/interior_layers.ts`, `interior_scene_model.ts` |
| State patching | `client/src/lib/game_state_patch.ts` — `applyCompanionStep` |

---

## Adding a New Companion

1. Create `game/content/companions/<id>.yaml` following `companionSchema`
2. Add a recruit dialogue option with `companionRecruit: "<id>"` in the relevant location's dialogue file
3. Add goals to the `goals` array in the YAML — no backend or UI changes required for standard goals
4. Run `npm run content:validate` to confirm the file is valid

---

## Known Limitations / Future Work

- Only one companion slot is tracked; multi-companion support is not implemented
- Companion does not wander or act independently while the player is stationary (only moves on player turns)
- Goal-triggered dialogue is queued as a story bubble; no mid-exploration dialogue interruption yet
