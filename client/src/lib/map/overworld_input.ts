import { findTileAtWorldPoint } from "./hex_geometry.js";
import {
  clearPointerGesture,
  createPointerGesture,
  getDraggedWorldPosition,
  startPointerGesture,
  updatePointerGesture,
  type MapPointerGesture
} from "./pointer_gesture.js";
import type { MapInteractionTarget, OverworldLocationNode, OverworldSceneModel, WorldPoint } from "./types.js";

export {
  clearPointerGesture,
  createPointerGesture,
  getDraggedWorldPosition,
  startPointerGesture,
  updatePointerGesture,
  type MapPointerGesture
};

function isWithinLocationMarker(location: OverworldLocationNode, worldPoint: WorldPoint): boolean {
  const deltaX = worldPoint.x - location.markerPosition.x;
  const deltaY = worldPoint.y - location.markerPosition.y;

  return deltaX * deltaX + deltaY * deltaY <= location.hitRadius * location.hitRadius;
}

function resolveLocationTarget(scene: OverworldSceneModel, worldPoint: WorldPoint): MapInteractionTarget {
  for (const location of scene.locations) {
    if (!location.interiorMapId) {
      continue;
    }

    if (isWithinLocationMarker(location, worldPoint)) {
      return {
        kind: "location",
        locationId: location.id,
        tileKey: location.tileKey
      };
    }
  }

  return { kind: "none" };
}

export function resolveHoverTile(
  scene: OverworldSceneModel,
  worldPoint: WorldPoint
): { tileKey: string | null; markerId: string | null } {
  const locationTarget = resolveLocationTarget(scene, worldPoint);

  if (locationTarget.kind === "location") {
    return { tileKey: locationTarget.tileKey, markerId: null };
  }

  const tile = findTileAtWorldPoint(worldPoint, scene.tiles);

  if (!tile) {
    return { tileKey: null, markerId: null };
  }

  return { tileKey: tile.isReachable || tile.enterableLocationId ? tile.key : null, markerId: null };
}

export function resolveInteractionTarget(scene: OverworldSceneModel, worldPoint: WorldPoint): MapInteractionTarget {
  const locationTarget = resolveLocationTarget(scene, worldPoint);

  if (locationTarget.kind !== "none") {
    return locationTarget;
  }

  const tile = findTileAtWorldPoint(worldPoint, scene.tiles);

  if (!tile) {
    return { kind: "none" };
  }

  if (tile.enterableLocationId) {
    return {
      kind: "location",
      locationId: tile.enterableLocationId,
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

  // Allow clicking on undiscovered (fog) tiles to explore toward them
  if (!tile.discovered) {
    return {
      kind: "fog",
      point: tile.point,
      tileKey: tile.key
    };
  }

  return { kind: "none" };
}
