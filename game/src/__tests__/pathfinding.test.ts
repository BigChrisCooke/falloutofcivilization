import { describe, expect, it } from "vitest";

import {
  bestStepToward,
  buildExplorationRoute,
  findNearestAdjacentTile,
  findPath,
  hexNeighbors,
  toTileKey,
  type HexPoint
} from "../index.js";

function createPassableSet(points: HexPoint[]): Set<string> {
  return new Set(points.map((point) => toTileKey(point)));
}

describe("shared pathfinding helpers", () => {
  it("returns the correct neighbors for odd and even rows", () => {
    expect(hexNeighbors({ x: 2, y: 2 })).toEqual([
      { x: 3, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 3 }
    ]);

    expect(hexNeighbors({ x: 2, y: 3 })).toEqual([
      { x: 3, y: 3 },
      { x: 1, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 4 }
    ]);
  });

  it("finds a BFS path through passable tiles", () => {
    const passableSet = createPassableSet([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 }
    ]);

    const path = findPath({ x: 1, y: 1 }, { x: 3, y: 2 }, passableSet);

    expect(path).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 2 }
    ]);
  });

  it("finds the nearest adjacent tile while respecting blocked tiles", () => {
    const passableSet = createPassableSet([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 4, y: 2 },
      { x: 3, y: 2 }
    ]);
    const blockedSet = createPassableSet([{ x: 3, y: 2 }]);

    expect(findNearestAdjacentTile({ x: 1, y: 1 }, { x: 4, y: 2 }, passableSet, blockedSet)).toEqual({ x: 3, y: 1 });
  });

  it("picks the best in-bounds fog step toward the target", () => {
    const validTiles = createPassableSet([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 }
    ]);

    expect(bestStepToward({ x: 1, y: 1 }, { x: 3, y: 2 }, validTiles)).toEqual({ x: 2, y: 1 });
  });

  it("builds direct routes through discovered tiles", () => {
    const discoveredTileKeys = createPassableSet([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 }
    ]);

    expect(buildExplorationRoute({ x: 1, y: 1 }, { x: 4, y: 1 }, discoveredTileKeys, 6, 4)).toEqual({
      steps: [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 }
      ],
      reachedTarget: true
    });
  });

  it("builds partial fog routes when the safety limit stops travel early", () => {
    const discoveredTileKeys = createPassableSet([{ x: 1, y: 1 }]);

    expect(buildExplorationRoute({ x: 1, y: 1 }, { x: 5, y: 1 }, discoveredTileKeys, 8, 4, 2)).toEqual({
      steps: [
        { x: 2, y: 1 },
        { x: 3, y: 1 }
      ],
      reachedTarget: false
    });
  });
});
