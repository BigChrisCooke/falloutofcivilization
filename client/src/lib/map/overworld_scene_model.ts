import type { GameState, LocationSummary } from "../api.js";
import {
  getCourierAnchor,
  getHexBoardSize,
  getMarkerAnchor,
  getTileZIndex,
  hexDistance,
  projectHex,
  toTileKey
} from "../iso.js";

import { getHexWorldPolygon } from "./hex_geometry.js";
import { hexNeighbors } from "./hex_pathfinding.js";
import type { CompanionActorNode, OverworldLocationNode, OverworldQuestMarkerNode, OverworldSceneModel, OverworldTileNode } from "./types.js";

function getPrimaryLocation(locations: LocationSummary[]): LocationSummary | null {
  return locations[0] ?? null;
}

function getPrimaryEnterableLocation(locations: LocationSummary[]): LocationSummary | null {
  return locations.find((location) => location.interiorMapId) ?? null;
}

export function buildOverworldSceneModel(state: GameState, selectedQuestId?: string | null, highlightedLocationId?: string | null): OverworldSceneModel | null {
  const overworldMap = state.overworldMap;
  const playerX = state.worldState.player_x;
  const playerY = state.worldState.player_y;

  if (!overworldMap || playerX === null || playerY === null) {
    return null;
  }

  const currentPoint = { x: playerX, y: playerY };
  const currentTileKey = toTileKey(currentPoint);
  const discoveredTiles = new Set(state.mapDiscovery.discoveredTileKeys);
  const discoveredLocations = state.locations.filter((location) => location.discovered);
  const locationsByTile = new Map<string, LocationSummary[]>();

  for (const location of discoveredLocations) {
    const tileKey = toTileKey(location.position);
    const existing = locationsByTile.get(tileKey) ?? [];
    existing.push(location);
    locationsByTile.set(tileKey, existing);
  }

  const tiles: OverworldTileNode[] = [];

  for (let rowIndex = 0; rowIndex < overworldMap.layout.length; rowIndex += 1) {
    const row = overworldMap.layout[rowIndex] ?? [];

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const point = { x: columnIndex, y: rowIndex };
      const tileKey = toTileKey(point);
      const tileLocations = locationsByTile.get(tileKey) ?? [];
      const primaryLocation = getPrimaryLocation(tileLocations);
      const enterableLocation = getPrimaryEnterableLocation(tileLocations);

      tiles.push({
        key: tileKey,
        point,
        terrain: row[columnIndex] ?? "sand",
        projected: projectHex(point),
        polygon: getHexWorldPolygon(point),
        discovered: discoveredTiles.has(tileKey),
        isCurrent: tileKey === currentTileKey,
        isReachable: tileKey !== currentTileKey && discoveredTiles.has(tileKey),
        zIndex: getTileZIndex(point),
        locationId: primaryLocation?.id ?? null,
        locationType: primaryLocation?.type ?? null,
        enterableLocationId:
          tileKey === currentTileKey && enterableLocation?.interiorMapId ? enterableLocation.id : null
      });
    }
  }

  const locations: OverworldLocationNode[] = discoveredLocations
    .map((location) => {
      const isCurrent = location.position.x === currentPoint.x && location.position.y === currentPoint.y;
      const markerAnchor = getMarkerAnchor(location.position);

      return {
        id: location.id,
        tileKey: toTileKey(location.position),
        name: location.name,
        type: location.type,
        point: location.position,
        markerPosition: {
          x: markerAnchor.x + (isCurrent ? 22 : 0),
          y: markerAnchor.y - 4
        },
        hitRadius: isCurrent && location.interiorMapId ? 22 : 18,
        interiorMapId: location.interiorMapId,
        discovered: location.discovered,
        isCurrent,
        isHighlighted: location.id === highlightedLocationId,
        zIndex: getTileZIndex(location.position) + 50
      };
    })
    .sort((left, right) => left.zIndex - right.zIndex);

  const activeQuestIds = new Set(state.questState.active);
  const questMarkers: OverworldQuestMarkerNode[] = [];

  for (const quest of state.questState.definitions) {
    if (!activeQuestIds.has(quest.id)) {
      continue;
    }

    // Use activeMapMarker (points to next incomplete objective) with fallback to static mapMarker
    const marker = quest.activeMapMarker ?? quest.mapMarker;
    if (!marker) {
      continue;
    }

    const targetLocation = discoveredLocations.find((loc) => loc.id === marker.locationId);

    if (!targetLocation) {
      continue;
    }

    const markerAnchor = getMarkerAnchor(targetLocation.position);

    questMarkers.push({
      id: `quest_${quest.id}`,
      questId: quest.id,
      label: marker.label,
      point: targetLocation.position,
      markerPosition: {
        x: markerAnchor.x - 22,
        y: markerAnchor.y - 28
      },
      zIndex: getTileZIndex(targetLocation.position) + 70,
      isSelected: quest.id === selectedQuestId
    });
  }

  // Compute companion position on overworld (mirrors interior_scene_model.ts pattern)
  let companion: CompanionActorNode | null = null;
  const activeCompanion = state.companions[0];

  if (activeCompanion?.tokenColor) {
    const neighbors = hexNeighbors(currentPoint)
      .filter((n) => {
        const key = toTileKey(n);
        return discoveredTiles.has(key) && key !== currentTileKey;
      })
      .sort((a, b) => b.y - a.y || a.x - b.x);

    const companionPoint = neighbors[0] ?? tiles
      .filter((t) => t.discovered && t.key !== currentTileKey)
      .sort((a, b) => hexDistance(currentPoint, a.point) - hexDistance(currentPoint, b.point))[0]?.point
      ?? null;

    if (companionPoint) {
      companion = {
        id: `companion-${activeCompanion.companionId}`,
        companionId: activeCompanion.companionId,
        tokenColor: activeCompanion.tokenColor,
        point: companionPoint,
        anchor: getCourierAnchor(companionPoint),
        zIndex: getTileZIndex(companionPoint) + 85
      };
    }
  }

  return {
    mapId: overworldMap.id,
    mapName: overworldMap.name,
    mapTheme: overworldMap.theme,
    boardSize: getHexBoardSize(overworldMap.width, overworldMap.height),
    currentTileKey,
    hoverTileKey: null,
    tiles: tiles.sort((left, right) => left.zIndex - right.zIndex),
    locations,
    courier: {
      id: "courier",
      point: currentPoint,
      anchor: getCourierAnchor(currentPoint),
      zIndex: getTileZIndex(currentPoint) + 90
    },
    companion,
    routes: [],
    terrainFeatures: [],
    questMarkers,
    factionMarkers: [],
    borders: [],
    encounterMarkers: [],
    ambientOverlays: []
  };
}
