import type { GameState } from "./api.js";
import type { GridPoint } from "./iso.js";

interface InteriorMarkerPlacement {
  id: string;
  point: GridPoint;
}

const INTERACTABLE_TILE_TOKENS = new Set([
  "stash",
  "terminal",
  "medbay",
  "bar",
  "table",
  "stage",
  "cache",
  "console",
  "relay"
]);

export interface InteriorPlacements {
  courier: GridPoint;
  exits: InteriorMarkerPlacement[];
  interactables: InteriorMarkerPlacement[];
  npcs: InteriorMarkerPlacement[];
  loot: InteriorMarkerPlacement[];
}

function collectTiles(layout: string[][], matcher: (tile: string) => boolean): GridPoint[] {
  const matches: GridPoint[] = [];

  for (let y = 0; y < layout.length; y += 1) {
    const row = layout[y] ?? [];

    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];

      if (tile && matcher(tile)) {
        matches.push({ x, y });
      }
    }
  }

  return matches;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function choosePlacement(
  preferred: GridPoint[],
  fallback: GridPoint[],
  used: Set<string>,
  index: number
): GridPoint | null {
  const candidates = [...preferred, ...fallback];

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(index + offset) % candidates.length];

    if (!candidate) {
      continue;
    }

    const key = `${candidate.x},${candidate.y}`;

    if (used.has(key)) {
      continue;
    }

    used.add(key);
    return candidate;
  }

  return null;
}

export function deriveInteriorPlacements(state: GameState): InteriorPlacements | null {
  const map = state.currentInteriorMap;

  if (!map) {
    return null;
  }

  const courier = map.spawnPoints[0] ?? { id: "fallback_spawn", x: 1, y: 1 };
  const floorTiles = collectTiles(map.layout, (tile) => tile === "floor");
  const interactableTiles = collectTiles(map.layout, (tile) => INTERACTABLE_TILE_TOKENS.has(tile));
  const used = new Set<string>([`${courier.x},${courier.y}`]);

  const interactables = map.interactables
    .map((item, index) => {
      const token = normalizeToken(item.id);
      const explicitTiles = collectTiles(map.layout, (tile) => tile === token || tile === normalizeToken(item.type));
      const point = choosePlacement(explicitTiles, interactableTiles, used, index);

      return point ? { id: item.id, point } : null;
    })
    .filter((entry): entry is InteriorMarkerPlacement => entry !== null);

  const exits = map.exits.map((exit) => {
    used.add(`${exit.x},${exit.y}`);
    return {
      id: exit.id,
      point: { x: exit.x, y: exit.y }
    };
  });

  const npcs = map.npcs
    .map((npc, index) => {
      const point = choosePlacement(floorTiles, interactableTiles, used, index);

      return point ? { id: npc.id, point } : null;
    })
    .filter((entry): entry is InteriorMarkerPlacement => entry !== null);

  const loot = map.loot
    .map((item, index) => {
      const point = choosePlacement(interactableTiles, floorTiles, used, index);

      return point ? { id: item.id, point } : null;
    })
    .filter((entry): entry is InteriorMarkerPlacement => entry !== null);

  return {
    courier: { x: courier.x, y: courier.y },
    exits,
    interactables,
    npcs,
    loot
  };
}
