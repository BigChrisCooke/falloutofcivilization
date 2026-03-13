import { findTileAtWorldPoint } from "./hex_geometry.js";
import type { InteriorInteractionTarget, InteriorMarkerNode, InteriorSceneModel, WorldPoint } from "./types.js";

function isWithinMarker(marker: InteriorMarkerNode, worldPoint: WorldPoint): boolean {
  const deltaX = worldPoint.x - marker.markerPosition.x;
  const deltaY = worldPoint.y - marker.markerPosition.y;

  return deltaX * deltaX + deltaY * deltaY <= marker.hitRadius * marker.hitRadius;
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

export function resolveInteriorHoverTile(scene: InteriorSceneModel, worldPoint: WorldPoint): string | null {
  const markerTarget = resolveExitMarkerTarget(scene, worldPoint);

  if (markerTarget.kind === "exit") {
    return markerTarget.tileKey;
  }

  const tile = findTileAtWorldPoint(worldPoint, scene.tiles);

  if (!tile) {
    return null;
  }

  return tile.isReachable || (tile.isCurrent && tile.exitId) ? tile.key : null;
}

export function resolveInteriorInteractionTarget(
  scene: InteriorSceneModel,
  worldPoint: WorldPoint
): InteriorInteractionTarget {
  const markerTarget = resolveExitMarkerTarget(scene, worldPoint);

  if (markerTarget.kind !== "none") {
    return markerTarget;
  }

  const tile = findTileAtWorldPoint(worldPoint, scene.tiles);

  if (!tile) {
    return { kind: "none" };
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
