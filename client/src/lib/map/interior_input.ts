import { findTileAtWorldPoint } from "./hex_geometry.js";
import type { InteriorInteractionTarget, InteriorMarkerNode, InteriorSceneModel, WorldPoint } from "./types.js";

function isWithinMarker(marker: InteriorMarkerNode, worldPoint: WorldPoint): boolean {
  const deltaX = worldPoint.x - marker.markerPosition.x;
  const deltaY = worldPoint.y - marker.markerPosition.y;

  return deltaX * deltaX + deltaY * deltaY < marker.hitRadius * marker.hitRadius;
}

function resolveExitMarkerTarget(scene: InteriorSceneModel, worldPoint: WorldPoint): InteriorInteractionTarget {
  for (const marker of scene.markers) {
    if (marker.kind !== "exit" || !marker.isActionable) {
      continue;
    }

    if (isWithinMarker(marker, worldPoint)) {
      return {
        kind: "exit",
        exitId: marker.id,
        tileKey: `${marker.point.x},${marker.point.y}`
      };
    }
  }

  return { kind: "none" };
}

export function resolveInteriorHover(
  scene: InteriorSceneModel,
  worldPoint: WorldPoint
): { tileKey: string | null; markerId: string | null } {
  // Check interactive markers first (NPC, loot, interactable)
  for (const marker of scene.markers) {
    if (marker.kind === "npc" || marker.kind === "loot" || marker.kind === "interactable") {
      if (isWithinMarker(marker, worldPoint)) {
        return { tileKey: null, markerId: marker.id };
      }
    }
  }

  // Check exit markers
  const exitTarget = resolveExitMarkerTarget(scene, worldPoint);
  if (exitTarget.kind === "exit") {
    return { tileKey: exitTarget.tileKey, markerId: null };
  }

  // Check companion token hover
  if (scene.companion) {
    const compDx = worldPoint.x - scene.companion.anchor.x;
    const compDy = worldPoint.y - scene.companion.anchor.y;
    if (compDx * compDx + compDy * compDy < 20 * 20) {
      return { tileKey: null, markerId: `companion-${scene.companion.companionId}` };
    }
  }

  // Check player token hover (after markers so overlapping markers take priority)
  const courierDx = worldPoint.x - scene.courier.anchor.x;
  const courierDy = worldPoint.y - scene.courier.anchor.y;
  if (courierDx * courierDx + courierDy * courierDy < 18 * 18) {
    return { tileKey: null, markerId: "player" };
  }

  const tile = findTileAtWorldPoint(worldPoint, scene.tiles);
  if (!tile) {
    return { tileKey: null, markerId: null };
  }

  const tileKey = tile.isReachable || (tile.isCurrent && tile.exitId) ? tile.key : null;
  return { tileKey, markerId: null };
}

/** Find an interactive marker (NPC/loot/interactable) sitting on the given grid tile. */
function findMarkerOnTile(scene: InteriorSceneModel, tileX: number, tileY: number): InteriorInteractionTarget {
  for (const marker of scene.markers) {
    if (marker.point.x !== tileX || marker.point.y !== tileY) continue;
    if (marker.kind === "npc") return { kind: "npc", npcId: marker.id };
    if (marker.kind === "loot") return { kind: "loot", lootId: marker.id };
    if (marker.kind === "interactable") return { kind: "interactable", interactableId: marker.id };
  }
  return { kind: "none" };
}

export function resolveInteriorInteractionTarget(
  scene: InteriorSceneModel,
  worldPoint: WorldPoint
): InteriorInteractionTarget {
  // Check NPC, loot, interactable markers first (direct hit on sprite)
  for (const marker of scene.markers) {
    if (!isWithinMarker(marker, worldPoint)) {
      continue;
    }

    if (marker.kind === "npc") {
      return { kind: "npc", npcId: marker.id };
    }

    if (marker.kind === "loot") {
      return { kind: "loot", lootId: marker.id };
    }

    if (marker.kind === "interactable") {
      return { kind: "interactable", interactableId: marker.id };
    }
  }

  // Then exit markers
  const exitTarget = resolveExitMarkerTarget(scene, worldPoint);
  if (exitTarget.kind !== "none") {
    return exitTarget;
  }

  // Check companion token click
  if (scene.companion) {
    const compDx = worldPoint.x - scene.companion.anchor.x;
    const compDy = worldPoint.y - scene.companion.anchor.y;
    if (compDx * compDx + compDy * compDy < 20 * 20) {
      return { kind: "companion", companionId: scene.companion.companionId };
    }
  }

  // If click is on the player token, check if there's an interactive object on the same tile
  const courierDx = worldPoint.x - scene.courier.anchor.x;
  const courierDy = worldPoint.y - scene.courier.anchor.y;
  if (courierDx * courierDx + courierDy * courierDy < 18 * 18) {
    const sameCell = findMarkerOnTile(scene, scene.courier.point.x, scene.courier.point.y);
    if (sameCell.kind !== "none") return sameCell;
    return { kind: "player" };
  }

  const tile = findTileAtWorldPoint(worldPoint, scene.tiles);

  if (!tile) {
    return { kind: "none" };
  }

  // If clicking a tile, check for interactive objects on that tile
  if (tile.isCurrent) {
    const sameCell = findMarkerOnTile(scene, tile.point.x, tile.point.y);
    if (sameCell.kind !== "none") return sameCell;
  }

  if (tile.isCurrent && tile.exitId) {
    return {
      kind: "exit",
      exitId: tile.exitId,
      tileKey: tile.key
    };
  }

  if (tile.isReachable) {
    return {
      kind: "tile",
      point: tile.point,
      tileKey: tile.key
    };
  }

  return { kind: "none" };
}
