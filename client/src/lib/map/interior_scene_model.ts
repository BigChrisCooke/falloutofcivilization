import type { GameState } from "../api.js";
import {
  getInteriorBoardSize,
  getInteriorCourierAnchor,
  getTileZIndex,
  hexDistance,
  INTERIOR_ISO_METRICS,
  projectHex,
  toTileKey
} from "../iso.js";
import { deriveInteriorPlacements } from "../interior_layout.js";

import { getHexWorldPolygon } from "./hex_geometry.js";
import type { InteriorMarkerNode, InteriorSceneModel, InteriorTileNode } from "./types.js";

const PASSABLE_INTERIOR_TILES = new Set([
  "floor",
  "exit",
  "stash",
  "terminal",
  "medbay",
  "bar",
  "table",
  "stage",
  "trap",
  "cache",
  "console",
  "relay"
]);

function isPassableTile(tile: string): boolean {
  return PASSABLE_INTERIOR_TILES.has(tile);
}

function getMarkerPosition(point: { x: number; y: number }) {
  const projected = projectHex(point, INTERIOR_ISO_METRICS);

  return {
    x: projected.x,
    y: projected.y - INTERIOR_ISO_METRICS.tileHeight * 0.3
  };
}

function createMarkerNode(
  id: string,
  kind: InteriorMarkerNode["kind"],
  point: { x: number; y: number },
  label: string,
  zOffset: number,
  isActionable: boolean
): InteriorMarkerNode {
  return {
    id,
    kind,
    point,
    label,
    markerPosition: getMarkerPosition(point),
    hitRadius: isActionable ? 18 : 14,
    isActionable,
    zIndex: getTileZIndex(point) + zOffset
  };
}

export function buildInteriorSceneModel(state: GameState): InteriorSceneModel | null {
  const map = state.currentInteriorMap;
  const playerX = state.worldState.player_x;
  const playerY = state.worldState.player_y;
  const placements = deriveInteriorPlacements(state);

  if (!map || playerX === null || playerY === null || !placements) {
    return null;
  }

  const currentPoint = { x: playerX, y: playerY };
  const currentTileKey = toTileKey(currentPoint);
  const width = Math.max(...map.layout.map((row) => row.length), 1);
  const height = map.layout.length;
  const tiles: InteriorTileNode[] = [];
  const exitByTileKey = new Map<string, string>();

  for (const exit of map.exits) {
    exitByTileKey.set(toTileKey({ x: exit.x, y: exit.y }), exit.id);
  }

  for (let rowIndex = 0; rowIndex < map.layout.length; rowIndex += 1) {
    const row = map.layout[rowIndex] ?? [];

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const point = { x: columnIndex, y: rowIndex };
      const tileKey = toTileKey(point);
      const terrain = row[columnIndex] ?? "floor";
      const isPassable = isPassableTile(terrain);
      const isCurrent = tileKey === currentTileKey;
      const exitId = exitByTileKey.get(tileKey) ?? null;

      tiles.push({
        key: tileKey,
        point,
        terrain,
        projected: projectHex(point, INTERIOR_ISO_METRICS),
        polygon: getHexWorldPolygon(point, INTERIOR_ISO_METRICS),
        isCurrent,
        isReachable: isPassable && hexDistance(currentPoint, point) === 1,
        isPassable,
        exitId,
        zIndex: getTileZIndex(point)
      });
    }
  }

  const markers: InteriorMarkerNode[] = [
    ...map.exits.map((exit) =>
      createMarkerNode(exit.id, "exit", { x: exit.x, y: exit.y }, exit.target, 20, toTileKey({ x: exit.x, y: exit.y }) === currentTileKey)
    ),
    ...placements.interactables.map((item) => createMarkerNode(item.id, "interactable", item.point, item.id, 30, false)),
    ...placements.loot.map((item) => createMarkerNode(item.id, "loot", item.point, item.id, 32, false)),
    ...placements.npcs.map((npc) => createMarkerNode(npc.id, "npc", npc.point, npc.id, 35, false))
  ].sort((left, right) => left.zIndex - right.zIndex);

  return {
    mapId: map.id,
    mapName: map.name,
    mapTheme: map.theme,
    boardSize: getInteriorBoardSize(width, height),
    currentTileKey,
    hoverTileKey: null,
    tiles: tiles.sort((left, right) => left.zIndex - right.zIndex),
    markers,
    courier: {
      id: "courier",
      point: currentPoint,
      anchor: getInteriorCourierAnchor(currentPoint),
      zIndex: getTileZIndex(currentPoint) + 90
    }
  };
}
