import type { GameState } from "./api.js";
import type { GridPoint } from "./iso.js";

interface InteriorMarkerPlacement {
  id: string;
  point: GridPoint;
  interactRange?: number;
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
  "relay",
  "notice",
  "pool",
  "desk",
  "crate",
  "shelves",
  "pump",
  "machine",
  "counter",
  "electronics"
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
  for (const candidate of preferred) {
    const key = `${candidate.x},${candidate.y}`;

    if (!used.has(key)) {
      used.add(key);
      return candidate;
    }
  }

  for (let offset = 0; offset < fallback.length; offset += 1) {
    const candidate = fallback[(index + offset) % fallback.length];

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

  // Pre-reserve explicit NPC and loot positions so interactables avoid them
  for (const npc of map.npcs) {
    if (npc.x !== undefined && npc.y !== undefined) {
      used.add(`${npc.x},${npc.y}`);
    }
  }
  for (const item of map.loot) {
    if (item.x !== undefined && item.y !== undefined) {
      used.add(`${item.x},${item.y}`);
    }
  }
  for (const exit of map.exits) {
    used.add(`${exit.x},${exit.y}`);
  }

  const interactables = map.interactables
    .map((item, index) => {
      // Use explicit position if provided
      if (item.x !== undefined && item.y !== undefined) {
        used.add(`${item.x},${item.y}`);
        return { id: item.id, point: { x: item.x, y: item.y } };
      }
      const token = normalizeToken(item.id);
      const typeToken = normalizeToken(item.type);
      // Prefer exact tile matches first
      const exactTiles = collectTiles(map.layout, (tile) => {
        const normalTile = normalizeToken(tile);
        return normalTile === token || normalTile === typeToken;
      });
      // Fall back to word-boundary matches only if no exact match
      const explicitTiles = exactTiles.length > 0 ? exactTiles : collectTiles(map.layout, (tile) => {
        const normalTile = normalizeToken(tile);
        const tokenParts = token.split("_");
        const typeParts = typeToken.split("_");
        return tokenParts.includes(normalTile) || typeParts.includes(normalTile);
      });
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
      if (npc.x !== undefined && npc.y !== undefined) {
        used.add(`${npc.x},${npc.y}`);
        return { id: npc.id, point: { x: npc.x, y: npc.y }, interactRange: npc.interactRange };
      }
      const point = choosePlacement(floorTiles, interactableTiles, used, index);

      return point ? { id: npc.id, point, interactRange: npc.interactRange } : null;
    })
    .filter((entry): entry is InteriorMarkerPlacement => entry !== null);

  const loot = map.loot
    .map((item, index) => {
      if (item.x !== undefined && item.y !== undefined) {
        used.add(`${item.x},${item.y}`);
        return { id: item.id, point: { x: item.x, y: item.y } };
      }
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
