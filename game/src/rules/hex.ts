export interface HexPoint {
  x: number;
  y: number;
}

function offsetToCube(point: HexPoint): { q: number; r: number; s: number } {
  const q = point.x - (point.y - (point.y & 1)) / 2;
  const r = point.y;
  const s = -q - r;

  return { q, r, s };
}

export function toTileKey(point: HexPoint): string {
  return `${point.x},${point.y}`;
}

export function hexDistance(from: HexPoint, to: HexPoint): number {
  const a = offsetToCube(from);
  const b = offsetToCube(to);

  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

export function getHexesInRadius(center: HexPoint, radius: number, width: number, height: number): HexPoint[] {
  const visible: HexPoint[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const point = { x, y };
      if (hexDistance(center, point) <= radius) {
        visible.push(point);
      }
    }
  }

  return visible;
}
