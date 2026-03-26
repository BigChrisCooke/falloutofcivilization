import { hexDistance, toTileKey, type HexPoint } from "./hex.js";

export type GridPoint = HexPoint;

export interface ExplorationRouteResult {
  steps: HexPoint[];
  reachedTarget: boolean;
}

function isWithinBounds(point: HexPoint, width: number, height: number): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < width && point.y < height;
}

function buildAllTileSet(width: number, height: number): Set<string> {
  const validTiles = new Set<string>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      validTiles.add(`${x},${y}`);
    }
  }

  return validTiles;
}

export function hexNeighbors(point: HexPoint): HexPoint[] {
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

export function findPath(
  from: HexPoint,
  to: HexPoint,
  passableSet: Set<string>,
  blockedSet?: Set<string>
): HexPoint[] | null {
  const startKey = toTileKey(from);
  const goalKey = toTileKey(to);

  if (!passableSet.has(goalKey) || blockedSet?.has(goalKey)) {
    return null;
  }

  if (startKey === goalKey) {
    return [];
  }

  const queue: HexPoint[] = [from];
  const cameFrom = new Map<string, string>();
  cameFrom.set(startKey, "");

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = toTileKey(current);

    if (currentKey === goalKey) {
      const path: HexPoint[] = [];
      let key = goalKey;

      while (key !== startKey) {
        const [x = 0, y = 0] = key.split(",").map(Number);
        path.unshift({ x, y });
        key = cameFrom.get(key)!;
      }

      return path;
    }

    for (const neighbor of hexNeighbors(current)) {
      const neighborKey = toTileKey(neighbor);

      if (passableSet.has(neighborKey) && !cameFrom.has(neighborKey) && !blockedSet?.has(neighborKey)) {
        cameFrom.set(neighborKey, currentKey);
        queue.push(neighbor);
      }
    }
  }

  return null;
}

export function findNearestAdjacentTile(
  from: HexPoint,
  target: HexPoint,
  passableSet: Set<string>,
  blockedSet?: Set<string>
): HexPoint | null {
  const neighbors = hexNeighbors(target).filter((candidate) => {
    const key = toTileKey(candidate);

    return passableSet.has(key) && !blockedSet?.has(key);
  });

  if (neighbors.length === 0) {
    return null;
  }

  const fromKey = toTileKey(from);
  const currentNeighbor = neighbors.find((candidate) => toTileKey(candidate) === fromKey);

  if (currentNeighbor) {
    return currentNeighbor;
  }

  let best: HexPoint | null = null;
  let bestLength = Infinity;

  for (const neighbor of neighbors) {
    const path = findPath(from, neighbor, passableSet, blockedSet);

    if (path && path.length < bestLength) {
      best = neighbor;
      bestLength = path.length;
    }
  }

  return best;
}

export function bestStepToward(
  from: HexPoint,
  target: HexPoint,
  validTiles: Set<string>
): HexPoint | null {
  const neighbors = hexNeighbors(from);
  let best: HexPoint | null = null;
  let bestDistance = Infinity;

  for (const neighbor of neighbors) {
    if (!validTiles.has(toTileKey(neighbor))) {
      continue;
    }

    const distance = hexDistance(neighbor, target);

    if (distance < bestDistance) {
      best = neighbor;
      bestDistance = distance;
    }
  }

  return best;
}

export function findFrontierTile(
  from: HexPoint,
  target: HexPoint,
  passableSet: Set<string>
): HexPoint | null {
  let best: HexPoint | null = null;
  let bestPathLength = Infinity;
  let bestTargetDistance = Infinity;

  for (const key of passableSet) {
    const [x = 0, y = 0] = key.split(",").map(Number);
    const candidate = { x, y };
    const dx = candidate.x - target.x;
    const dy = candidate.y - target.y;
    const targetDistance = Math.abs(dx) + Math.abs(dy);

    if (targetDistance > bestTargetDistance) {
      continue;
    }

    const path = findPath(from, candidate, passableSet);

    if (!path) {
      continue;
    }

    if (targetDistance < bestTargetDistance || (targetDistance === bestTargetDistance && path.length < bestPathLength)) {
      best = candidate;
      bestPathLength = path.length;
      bestTargetDistance = targetDistance;
    }
  }

  return best;
}

export function buildExplorationRoute(
  from: HexPoint,
  target: HexPoint,
  discoveredTileKeys: Iterable<string>,
  width: number,
  height: number,
  maxFogSteps = 20
): ExplorationRouteResult | null {
  if (!isWithinBounds(target, width, height)) {
    return null;
  }

  const passableSet = new Set(discoveredTileKeys);
  const directPath = findPath(from, target, passableSet);

  if (directPath) {
    return {
      steps: directPath,
      reachedTarget: true
    };
  }

  const frontier = findFrontierTile(from, target, passableSet);

  if (!frontier) {
    return null;
  }

  const validTiles = buildAllTileSet(width, height);
  const pathToFrontier = findPath(from, frontier, passableSet) ?? [];
  const steps = [...pathToFrontier];
  let current = pathToFrontier[pathToFrontier.length - 1] ?? frontier;

  for (let step = 0; step < maxFogSteps; step += 1) {
    if (current.x === target.x && current.y === target.y) {
      return {
        steps,
        reachedTarget: true
      };
    }

    const next = bestStepToward(current, target, validTiles);

    if (!next || (next.x === current.x && next.y === current.y)) {
      return {
        steps,
        reachedTarget: false
      };
    }

    steps.push(next);
    current = next;
  }

  return {
    steps,
    reachedTarget: current.x === target.x && current.y === target.y
  };
}
