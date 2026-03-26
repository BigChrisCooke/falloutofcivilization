/**
 * Canonical tile classification for interior maps.
 * Both client and backend must use this as the single source of truth.
 *
 * Using a blocklist: any tile NOT in this set is passable by default.
 * This is safer for content authoring — new tile types are passable
 * unless explicitly blocked here.
 */
const BLOCKING_TILES = new Set(["wall", "rock", "metal", "bar"]);

export function isPassableTile(tile: string | null): boolean {
  return tile !== null && !BLOCKING_TILES.has(tile);
}
