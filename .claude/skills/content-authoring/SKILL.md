# content-authoring

Use this when adding or editing authored game content for regions, locations, or maps.

## Source Of Truth

Authored content lives under:

- `game/content/world/`
- `game/content/locations/`
- `game/content/maps/overworld/`
- `game/content/maps/interiors/`

## Rules

- content must stay data-driven
- location-to-map links must use stable IDs
- runtime save state must not be written into content files
- UI components must not become the source of truth for location data

## Typical Changes

### New location

- add a YAML file under `game/content/locations/`
- give it a unique ID
- connect it to a region ID
- reference an interior map ID if enterable

### New interior map

- add a YAML file under `game/content/maps/interiors/`
- give it a unique ID
- define layout, exits, interactables, NPCs, loot, and hooks

### New overworld region or map

- update `game/content/world/`
- add or update `game/content/maps/overworld/`

## Validate After Changes

Run from the repo root:

```bash
npm run content:validate
npm run test
```

## If Validation Fails

- check the content shape against `game/src/schemas/content.ts`
- check stable IDs and cross-file references
- make sure referenced regions and maps actually exist
