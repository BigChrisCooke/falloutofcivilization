import {
  getHexesInRadius,
  hexDistance,
  toTileKey,
  type GameContentBundle,
  type HexPoint,
  type LocationDefinition,
  type OverworldMapDefinition,
  type RegionDefinition
} from "../../../game/src/index.js";

interface RawExplorationState {
  playerX: number | null;
  playerY: number | null;
  discoveredLocationIdsJson: string;
  discoveredTileKeysJson: string | null;
}

export interface NormalizedExplorationState {
  playerPosition: HexPoint;
  discoveredLocationIds: string[];
  discoveredTileKeys: string[];
  changed: boolean;
}

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;

  return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
}

function sortTileKeys(tileKeys: Iterable<string>): string[] {
  return Array.from(new Set(tileKeys)).sort((left, right) => {
    const [leftX = 0, leftY = 0] = left.split(",").map(Number);
    const [rightX = 0, rightY = 0] = right.split(",").map(Number);

    if (leftY !== rightY) {
      return leftY - rightY;
    }

    return leftX - rightX;
  });
}

function isWithinMap(point: HexPoint, map: OverworldMapDefinition): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height;
}

export function getRegionLocations(content: GameContentBundle, regionId: string): LocationDefinition[] {
  return content.locations.filter((location) => location.regionId === regionId);
}

export function getRegion(content: GameContentBundle, regionId: string): RegionDefinition {
  const region = content.regions.find((candidate) => candidate.id === regionId);

  if (!region) {
    throw new Error(`Region content ${regionId} not found.`);
  }

  return region;
}

export function getOverworldMap(content: GameContentBundle, region: RegionDefinition): OverworldMapDefinition {
  const overworldMap = content.overworldMaps.find((candidate) => candidate.id === region.mapId);

  if (!overworldMap) {
    throw new Error(`Overworld map ${region.mapId} not found for region ${region.id}.`);
  }

  return overworldMap;
}

export function getStartingLocation(
  content: GameContentBundle,
  region: RegionDefinition,
  locations: LocationDefinition[]
): LocationDefinition {
  const startingLocation = locations.find((location) => location.id === region.startingLocationId);

  if (!startingLocation) {
    throw new Error(`Starting location ${region.startingLocationId} not found for region ${region.id}.`);
  }

  return startingLocation;
}

export function revealExploration(
  overworldMap: OverworldMapDefinition,
  locations: LocationDefinition[],
  playerPosition: HexPoint,
  discoveredLocationIds: string[],
  discoveredTileKeys: string[]
): Omit<NormalizedExplorationState, "changed"> {
  const revealedTileKeys = new Set(discoveredTileKeys);

  for (const tile of getHexesInRadius(playerPosition, overworldMap.fogRevealRadius, overworldMap.width, overworldMap.height)) {
    revealedTileKeys.add(toTileKey(tile));
  }

  const locationSet = new Set(discoveredLocationIds);

  for (const location of locations) {
    if (revealedTileKeys.has(toTileKey(location.position))) {
      locationSet.add(location.id);
    }
  }

  return {
    playerPosition,
    discoveredLocationIds: locations.filter((location) => locationSet.has(location.id)).map((location) => location.id),
    discoveredTileKeys: sortTileKeys(revealedTileKeys)
  };
}

export function normalizeExplorationState(
  overworldMap: OverworldMapDefinition,
  locations: LocationDefinition[],
  startingLocation: LocationDefinition,
  rawState: RawExplorationState
): NormalizedExplorationState {
  const playerPosition =
    rawState.playerX !== null &&
    rawState.playerY !== null &&
    isWithinMap({ x: rawState.playerX, y: rawState.playerY }, overworldMap)
      ? { x: rawState.playerX, y: rawState.playerY }
      : { ...startingLocation.position };

  const discoveredLocationIds = parseStringArray(rawState.discoveredLocationIdsJson);
  const discoveredTileKeys = parseStringArray(rawState.discoveredTileKeysJson);
  const revealedState = revealExploration(
    overworldMap,
    locations,
    playerPosition,
    discoveredLocationIds,
    discoveredTileKeys
  );
  const nextLocationIdsJson = JSON.stringify(revealedState.discoveredLocationIds);
  const nextTileKeysJson = JSON.stringify(revealedState.discoveredTileKeys);

  return {
    ...revealedState,
    changed:
      playerPosition.x !== rawState.playerX ||
      playerPosition.y !== rawState.playerY ||
      nextLocationIdsJson !== rawState.discoveredLocationIdsJson ||
      nextTileKeysJson !== (rawState.discoveredTileKeysJson ?? "[]")
  };
}

export function canTravel(from: HexPoint, to: HexPoint, overworldMap: OverworldMapDefinition): boolean {
  return isWithinMap(to, overworldMap) && hexDistance(from, to) === 1;
}
