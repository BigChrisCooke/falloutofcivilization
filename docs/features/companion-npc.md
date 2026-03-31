# Companion NPC System

## Overview

Companions are recruitable NPCs that travel with the player through the wasteland. Each companion has a story arc, loyalty system, reactions to player behavior, and goals they pursue autonomously in interiors.

Currently implemented: **Dex** (caravan guard, recruited at the Dusty Tavern).

## Position and Movement

Companions have their own position in interior maps, stored as `companion_x` and `companion_y` in the `companion_instances` table.

### Loose Follow

After each player step in an interior, the companion takes one step:

1. **Regroup** (4+ hexes from player): companion moves toward a tile adjacent to the player
2. **Goal pursuit** (active goal): companion moves toward the goal tile instead of following
3. **Loose follow** (default): companion moves toward a position 1-2 hexes behind the player (opposite the player's direction of travel)

The companion never steps onto a non-passable tile or the player's tile.

### Position Lifecycle

- **On recruit**: seeded to a hex adjacent to the player
- **On enter interior/vault**: placed adjacent to the spawn point
- **On exit interior**: position cleared (NULL)

## Goal System

Companions can pursue authored goals at locations. Goals are defined in the companion's YAML file and drive autonomous behavior during interior exploration.

### YAML Schema

```yaml
goals:
  - id: investigate_supply_crate
    target:
      type: tile_type        # or "location_tile"
      tileType: crate         # matches any tile of this type in any interior
    triggerCondition:
      storyStage: 1           # optional: minimum story stage
      karma: 50               # optional: minimum karma
      locationId: some_loc    # optional: only triggers in this location
    frequency: once           # "always", "once", or "sometimes"
    playerCanHelp: true       # enables player-help interaction
    onComplete:
      dialogueTreeId: goal_supply_crate   # optional: triggers dialogue
      karmaDelta: 5                        # optional: karma change
      storyNote: "Description of what happened"  # optional: narrative log
```

### Target Types

- **tile_type**: matches any tile of the given type in any interior (e.g., `crate`, `terminal`)
- **location_tile**: matches a specific tile at exact coordinates in a specific location

### Goal Activation

When a companion enters an interior (via `enterLocation`), the system checks their authored goals:

1. Skip goals already completed (for `once` frequency)
2. Check trigger conditions (story stage, karma, location)
3. Verify the interior contains a matching tile
4. For `sometimes` goals, roll ~40% probability
5. First eligible goal is activated via `setActiveGoal`

### Goal Execution

While a goal is active:

- The companion pathfinds toward the goal tile each turn instead of loose-following
- Regroup (4+ hexes from player) still takes priority over goal pursuit
- When the companion reaches the goal tile, `onComplete` fires:
  - `karmaDelta` is applied to the player
  - `dialogueTreeId` is queued for the companion's story dialogue
  - `storyNote` is logged
  - The goal is marked complete and `active_goal_id` is cleared

### Player Help

When `playerCanHelp` is true on the active goal:

- If the player moves adjacent to the companion while the companion is on the goal tile, a help interaction becomes available
- Selecting help triggers `onComplete` plus a loyalty bonus (+5)
- Endpoint: `POST /api/game/companion/help-goal` with `{ companionId }`

## Persistence

Goal state is stored in `companion_instances`:

- `active_goal_id` (TEXT, nullable): the currently active goal ID
- `goal_progress` (TEXT, nullable): JSON array of completed goal IDs

## Recruitment

Companions are recruited through dialogue options tagged with `companionRecruit`. The recruitment flow:

1. Player selects a dialogue option with `companionRecruit: "dex"`
2. Backend creates a `companion_instances` row with loyalty=50, story_stage=0
3. Companion position is seeded adjacent to the player

## Loyalty

- Starts at 50, range [0, 100]
- Increases on generous/positive player choices (karma gains)
- Decreases on stealing or selfish choices
- Warning reaction at loyalty < 20
- Farewell and departure at loyalty = 0

## Story Arc

Companions have story stages triggered by conditions (locations visited, karma thresholds). Each stage unlocks a dialogue tree in the Pip-Boy companion tab.

## Adding a New Companion

1. Create `game/content/companions/<id>.yaml` with the companion schema
2. Add story dialogues under `storyDialogues`
3. Add goals under `goals` (optional)
4. Reference the companion in a location NPC's dialogue via `companionRecruit`
5. Run `npm run content:validate`

## Known Limitations

- Single companion slot only
- No overworld companion presence (only appears in interiors)
- Companion does not wander when player is stationary
- Goal completion dialogue is not yet animated in the client UI
- Player-help interaction UI not yet wired in the client
