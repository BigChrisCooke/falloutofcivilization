import {
  hexDistance,
  type GameContentBundle,
  type HexPoint,
  type InteriorMapDefinition,
  type LocationDefinition
} from "../../../game/src/index.js";

const BLOCKING_INTERIOR_TILES = new Set(["wall", "rock", "metal"]);

export function getInteriorMap(content: GameContentBundle, mapId: string): InteriorMapDefinition {
  const interiorMap = content.interiorMaps.find((candidate) => candidate.id === mapId);

  if (!interiorMap) {
    throw new Error(`Interior map ${mapId} not found.`);
  }

  return interiorMap;
}

export function getInteriorLocation(content: GameContentBundle, locationId: string): LocationDefinition {
  const location = content.locations.find((candidate) => candidate.id === locationId);

  if (!location) {
    throw new Error(`Location ${locationId} not found.`);
  }

  return location;
}

export function isWithinInteriorMap(point: HexPoint, map: InteriorMapDefinition): boolean {
  return point.y >= 0 && point.y < map.layout.length && point.x >= 0 && point.x < (map.layout[point.y]?.length ?? 0);
}

export function getInteriorTile(point: HexPoint, map: InteriorMapDefinition): string | null {
  return map.layout[point.y]?.[point.x] ?? null;
}

export function isPassableInteriorTile(tile: string | null): boolean {
  return tile !== null && !BLOCKING_INTERIOR_TILES.has(tile);
}

export function getInteriorSpawnPoint(map: InteriorMapDefinition): HexPoint {
  for (const spawnPoint of map.spawnPoints) {
    const point = { x: spawnPoint.x, y: spawnPoint.y };

    if (isWithinInteriorMap(point, map) && isPassableInteriorTile(getInteriorTile(point, map))) {
      return point;
    }
  }

  for (let rowIndex = 0; rowIndex < map.layout.length; rowIndex += 1) {
    const row = map.layout[rowIndex] ?? [];

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const point = { x: columnIndex, y: rowIndex };

      if (isPassableInteriorTile(getInteriorTile(point, map))) {
        return point;
      }
    }
  }

  throw new Error(`Interior map ${map.id} has no passable spawn tile.`);
}

export function canMoveInterior(from: HexPoint, to: HexPoint, map: InteriorMapDefinition): boolean {
  return isWithinInteriorMap(to, map) && isPassableInteriorTile(getInteriorTile(to, map)) && hexDistance(from, to) === 1;
}

export function getInteriorExit(map: InteriorMapDefinition, exitId: string) {
  const exit = map.exits.find((candidate) => candidate.id === exitId);

  if (!exit) {
    throw new Error(`Exit ${exitId} not found in interior map ${map.id}.`);
  }

  return exit;
}
