export interface GridPoint {
  x: number;
  y: number;
}

export function hexNeighbors(point: GridPoint): GridPoint[] {
  const isOddRow = point.y & 1;
  if (isOddRow) {
    return [
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y - 1 },
      { x: point.x + 1, y: point.y - 1 },
      { x: point.x, y: point.y + 1 },
      { x: point.x + 1, y: point.y + 1 }
    ];
  }
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x - 1, y: point.y - 1 },
    { x: point.x, y: point.y - 1 },
    { x: point.x - 1, y: point.y + 1 },
    { x: point.x, y: point.y + 1 }
  ];
}

function toKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

/**
 * BFS pathfinding on a hex grid.
 * Returns the path from `from` to `to` (excluding `from`, including `to`), or null if unreachable.
 * `passableSet` contains keys of all passable tiles.
 * `blockedSet` (optional) contains keys of tiles the player cannot walk onto (e.g. NPC tiles).
 * The goal tile is reachable even if it's in blockedSet (used for "walk adjacent to NPC" — caller
 * should exclude the NPC tile from the goal in that case).
 */
export function findPath(
  from: GridPoint,
  to: GridPoint,
  passableSet: Set<string>,
  blockedSet?: Set<string>
): GridPoint[] | null {
  const startKey = toKey(from);
  const goalKey = toKey(to);

  if (!passableSet.has(goalKey) || blockedSet?.has(goalKey)) return null;

  if (startKey === goalKey) return [];

  const queue: GridPoint[] = [from];
  const cameFrom = new Map<string, string>();
  cameFrom.set(startKey, "");

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = toKey(current);

    if (currentKey === goalKey) {
      const path: GridPoint[] = [];
      let key = goalKey;
      while (key !== startKey) {
        const [px, py] = key.split(",").map(Number);
        path.unshift({ x: px, y: py });
        key = cameFrom.get(key)!;
      }
      return path;
    }

    for (const neighbor of hexNeighbors(current)) {
      const nKey = toKey(neighbor);
      if (passableSet.has(nKey) && !cameFrom.has(nKey) && !blockedSet?.has(nKey)) {
        cameFrom.set(nKey, currentKey);
        queue.push(neighbor);
      }
    }
  }

  return null;
}

/**
 * Find the nearest passable neighbor of a target point (excluding blocked tiles).
 * Returns the neighbor closest to `from` by BFS distance, or null if none reachable.
 */
export function findNearestAdjacentTile(
  from: GridPoint,
  target: GridPoint,
  passableSet: Set<string>,
  blockedSet?: Set<string>
): GridPoint | null {
  const neighbors = hexNeighbors(target).filter((n) => {
    const key = toKey(n);
    return passableSet.has(key) && !blockedSet?.has(key);
  });

  if (neighbors.length === 0) return null;

  // If already adjacent, return the one we're on
  const fromKey = toKey(from);
  const onNeighbor = neighbors.find((n) => toKey(n) === fromKey);
  if (onNeighbor) return onNeighbor;

  // Find the neighbor with shortest path from `from`
  let best: GridPoint | null = null;
  let bestLen = Infinity;

  for (const neighbor of neighbors) {
    const path = findPath(from, neighbor, passableSet, blockedSet);
    if (path && path.length < bestLen) {
      bestLen = path.length;
      best = neighbor;
    }
  }

  return best;
}

/**
 * Hex distance between two grid points (axial distance for offset coordinates).
 */
function hexDist(a: GridPoint, b: GridPoint): number {
  // Convert offset to cube coordinates
  function toCube(p: GridPoint) {
    const col = p.x - (p.y - (p.y & 1)) / 2;
    const row = p.y;
    return { q: col, r: row, s: -col - row };
  }
  const ca = toCube(a);
  const cb = toCube(b);
  return (Math.abs(ca.q - cb.q) + Math.abs(ca.r - cb.r) + Math.abs(ca.s - cb.s)) / 2;
}

/**
 * From a given position, find the neighbor hex that is closest to the target
 * and is within the valid tile set (map bounds).
 */
export function bestStepToward(
  from: GridPoint,
  target: GridPoint,
  validTiles: Set<string>
): GridPoint | null {
  const neighbors = hexNeighbors(from);
  let best: GridPoint | null = null;
  let bestDist = Infinity;

  for (const n of neighbors) {
    const key = toKey(n);
    if (!validTiles.has(key)) continue;
    const d = hexDist(n, target);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }

  return best;
}

export const STEP_DELAY_MS = 500;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
