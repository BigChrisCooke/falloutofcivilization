import {
  getHexBoardSize,
  hexDistance,
  OVERWORLD_ISO_METRICS,
  projectHex,
  type GridPoint,
  type IsoMetrics,
  type ProjectedPoint
} from "../iso.js";

import type { MapSize, WorldPoint } from "./types.js";

export interface PointerPosition {
  x: number;
  y: number;
}

export function getHexLocalPolygon(metrics: IsoMetrics = OVERWORLD_ISO_METRICS): WorldPoint[] {
  const halfWidth = metrics.tileWidth / 2;
  const halfHeight = metrics.tileHeight / 2;

  return [
    { x: 0, y: -halfHeight },
    { x: halfWidth, y: -halfHeight * 0.5 },
    { x: halfWidth, y: halfHeight * 0.5 },
    { x: 0, y: halfHeight },
    { x: -halfWidth, y: halfHeight * 0.5 },
    { x: -halfWidth, y: -halfHeight * 0.5 }
  ];
}

export function flattenPolygon(points: WorldPoint[]): number[] {
  return points.flatMap((point) => [point.x, point.y]);
}

export function getHexWorldPolygon(point: GridPoint, metrics: IsoMetrics = OVERWORLD_ISO_METRICS): WorldPoint[] {
  const projected = projectHex(point, metrics);

  return getHexLocalPolygon(metrics).map((corner) => ({
    x: projected.x + corner.x,
    y: projected.y + corner.y
  }));
}

export function isPointInPolygon(point: WorldPoint, polygon: WorldPoint[]): boolean {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const prior = polygon[previous];

    if (!current || !prior) {
      continue;
    }

    const intersects =
      (current.y > point.y) !== (prior.y > point.y) &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function toWorldPoint(pointer: PointerPosition, worldPosition: WorldPoint): WorldPoint {
  return {
    x: pointer.x - worldPosition.x,
    y: pointer.y - worldPosition.y
  };
}

export function findTileAtWorldPoint<T extends { polygon: WorldPoint[]; zIndex: number }>(
  point: WorldPoint,
  tiles: T[]
): T | null {
  let matchedTile: T | null = null;

  for (const tile of tiles) {
    if (!isPointInPolygon(point, tile.polygon)) {
      continue;
    }

    if (!matchedTile || tile.zIndex > matchedTile.zIndex) {
      matchedTile = tile;
    }
  }

  return matchedTile;
}

export function getHexNeighbors(point: GridPoint, width: number, height: number): GridPoint[] {
  const deltas =
    point.y % 2 === 0
      ? [
          { x: -1, y: -1 },
          { x: 0, y: -1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: -1, y: 1 },
          { x: 0, y: 1 }
        ]
      : [
          { x: 0, y: -1 },
          { x: 1, y: -1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 }
        ];

  return deltas
    .map((delta) => ({ x: point.x + delta.x, y: point.y + delta.y }))
    .filter((candidate) => candidate.x >= 0 && candidate.y >= 0 && candidate.x < width && candidate.y < height);
}

export function areHexesAdjacent(left: GridPoint, right: GridPoint): boolean {
  return hexDistance(left, right) === 1;
}

export function getHexMapSize(width: number, height: number, metrics: IsoMetrics = OVERWORLD_ISO_METRICS): MapSize {
  return getHexBoardSize(width, height, metrics);
}

export function getCenteredWorldPosition(
  viewport: MapSize,
  anchor: ProjectedPoint,
  verticalRatio = 0.58
): WorldPoint {
  return {
    x: viewport.width * 0.5 - anchor.x,
    y: viewport.height * verticalRatio - anchor.y
  };
}
