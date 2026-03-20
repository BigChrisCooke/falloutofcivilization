export interface GridPoint {
  x: number;
  y: number;
}

export interface IsoMetrics {
  originX: number;
  originY: number;
  tileWidth: number;
  tileHeight: number;
  tileDepth: number;
  columnStep: number;
  rowStep: number;
  oddRowOffset: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

export const OVERWORLD_ISO_METRICS: IsoMetrics = {
  originX: 132,
  originY: 110,
  tileWidth: 88,
  tileHeight: 64,
  tileDepth: 0,
  columnStep: 88,
  rowStep: 48,
  oddRowOffset: 44
};

export const INTERIOR_ISO_METRICS: IsoMetrics = {
  originX: 132,
  originY: 104,
  tileWidth: 88,
  tileHeight: 60,
  tileDepth: 0,
  columnStep: 88,
  rowStep: 45,
  oddRowOffset: 44
};

export function toTileKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

function offsetToCube(point: GridPoint): { q: number; r: number; s: number } {
  const q = point.x - (point.y - (point.y & 1)) / 2;
  const r = point.y;
  const s = -q - r;

  return { q, r, s };
}

export function hexDistance(from: GridPoint, to: GridPoint): number {
  const left = offsetToCube(from);
  const right = offsetToCube(to);

  return Math.max(Math.abs(left.q - right.q), Math.abs(left.r - right.r), Math.abs(left.s - right.s));
}

export function projectHex(point: GridPoint, metrics: IsoMetrics = OVERWORLD_ISO_METRICS): ProjectedPoint {
  return {
    x: metrics.originX + point.x * metrics.columnStep + (point.y % 2 === 1 ? metrics.oddRowOffset : 0),
    y: metrics.originY + point.y * metrics.rowStep
  };
}

export function getTileZIndex(point: GridPoint): number {
  return point.y * 100 + point.x;
}

export function getCourierAnchor(point: GridPoint, metrics: IsoMetrics = OVERWORLD_ISO_METRICS): ProjectedPoint {
  const projected = projectHex(point, metrics);

  return {
    x: projected.x,
    y: projected.y - metrics.tileHeight * 0.22
  };
}

export function getInteriorCourierAnchor(
  point: GridPoint,
  metrics: IsoMetrics = INTERIOR_ISO_METRICS
): ProjectedPoint {
  const projected = projectHex(point, metrics);

  return {
    x: projected.x,
    y: projected.y - metrics.tileHeight * 0.24
  };
}

export function getMarkerAnchor(point: GridPoint, metrics: IsoMetrics = OVERWORLD_ISO_METRICS): ProjectedPoint {
  const projected = projectHex(point, metrics);

  return {
    x: projected.x,
    y: projected.y - metrics.tileHeight * 0.34
  };
}

export function getHexBoardSize(width: number, height: number, metrics: IsoMetrics = OVERWORLD_ISO_METRICS) {
  const occupiedColumns = Math.max(width - 1, 0);
  const occupiedRows = Math.max(height - 1, 0);
  const farRowOffset = height > 1 ? metrics.oddRowOffset : 0;

  return {
    width: metrics.originX * 2 + occupiedColumns * metrics.columnStep + farRowOffset + metrics.tileWidth,
    height: metrics.originY * 2 + occupiedRows * metrics.rowStep + metrics.tileHeight
  };
}

export function getInteriorBoardSize(width: number, height: number, metrics: IsoMetrics = INTERIOR_ISO_METRICS) {
  return getHexBoardSize(width, height, metrics);
}
