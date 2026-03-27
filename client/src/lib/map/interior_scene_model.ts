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
import { isPassableTile } from "../../../../game/src/tiles.js";

import { getHexWorldPolygon } from "./hex_geometry.js";
import { hexNeighbors } from "./hex_pathfinding.js";
import type { CompanionActorNode, InteriorMarkerNode, InteriorSceneModel, InteriorTileNode } from "./types.js";

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
  isActionable: boolean,
  ownedBy?: string,
  interactRange?: number
): InteriorMarkerNode {
  return {
    id,
    kind,
    point,
    label,
    markerPosition: getMarkerPosition(point),
    hitRadius: isActionable ? 18 : 14,
    isActionable,
    zIndex: getTileZIndex(point) + zOffset,
    ownedBy,
    interactRange
  };
}

export function buildInteriorSceneModel(state: GameState, collectedLootIds?: Set<string>): InteriorSceneModel | null {
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
        isReachable: isPassable && !isCurrent,
        isPassable,
        exitId,
        zIndex: getTileZIndex(point)
      });
    }
  }

  const activeLoot = collectedLootIds
    ? map.loot.filter((item) => !collectedLootIds.has(item.id))
    : map.loot;

  const activeLootPlacements = collectedLootIds
    ? placements.loot.filter((p) => !collectedLootIds.has(p.id))
    : placements.loot;

  // Suppress recruited companion NPCs from the props layer
  const activeCompanionIds = new Set(state.companions.map((c) => c.companionId));
  const visibleNpcs = placements.npcs.filter((npc) => !activeCompanionIds.has(npc.id));

  const markers: InteriorMarkerNode[] = [
    ...map.exits.map((exit) =>
      createMarkerNode(exit.id, "exit", { x: exit.x, y: exit.y }, exit.target, 20, toTileKey({ x: exit.x, y: exit.y }) === currentTileKey)
    ),
    ...placements.interactables.map((item) => createMarkerNode(item.id, "interactable", item.point, item.id, 30, true)),
    ...activeLootPlacements.map((item) => {
      const lootDef = activeLoot.find((l) => l.id === item.id);
      return createMarkerNode(item.id, "loot", item.point, item.id, 32, true, lootDef?.ownedBy);
    }),
    ...visibleNpcs.map((npc) => createMarkerNode(npc.id, "npc", npc.point, npc.id, 35, true, undefined, npc.interactRange))
  ].sort((left, right) => left.zIndex - right.zIndex);

  // Compute companion actor position if a companion is active
  let companion: CompanionActorNode | null = null;
  const activeCompanion = state.companions[0];

  if (activeCompanion?.tokenColor) {
    const occupiedKeys = new Set([
      currentTileKey,
      ...markers.map((m) => toTileKey(m.point))
    ]);
    const passableKeys = new Set(
      tiles.filter((t) => t.isPassable).map((t) => t.key)
    );

    // Prefer the tile directly "behind" the player (higher y = visually behind in iso)
    // by sorting neighbors with higher y first, then by distance
    const neighbors = hexNeighbors(currentPoint)
      .filter((n) => {
        const key = toTileKey(n);
        return passableKeys.has(key) && !occupiedKeys.has(key);
      })
      .sort((a, b) => b.y - a.y || a.x - b.x);

    // If no adjacent tile is free, scan all passable tiles sorted by distance
    const companionPoint = neighbors[0] ?? tiles
      .filter((t) => t.isPassable && !occupiedKeys.has(t.key))
      .sort((a, b) => hexDistance(currentPoint, a.point) - hexDistance(currentPoint, b.point))[0]?.point
      ?? null;

    if (companionPoint) {
      companion = {
        id: `companion-${activeCompanion.companionId}`,
        companionId: activeCompanion.companionId,
        tokenColor: activeCompanion.tokenColor,
        point: companionPoint,
        anchor: getInteriorCourierAnchor(companionPoint),
        zIndex: getTileZIndex(companionPoint) + 85
      };
    }
  }

  return {
    mapId: map.id,
    mapName: map.name,
    mapTheme: map.theme,
    boardSize: getInteriorBoardSize(width, height),
    currentTileKey,
    hoverTileKey: null,
    hoveredMarkerId: null,
    tiles: tiles.sort((left, right) => left.zIndex - right.zIndex),
    markers,
    courier: {
      id: "courier",
      point: currentPoint,
      anchor: getInteriorCourierAnchor(currentPoint),
      zIndex: getTileZIndex(currentPoint) + 90
    },
    companion
  };
}
