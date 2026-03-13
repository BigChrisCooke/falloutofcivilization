import { describe, expect, it } from "vitest";

import {
  getCourierAnchor,
  getHexBoardSize,
  getInteriorBoardSize,
  getInteriorCourierAnchor,
  INTERIOR_ISO_METRICS,
  getMarkerAnchor,
  getTileZIndex,
  hexDistance,
  OVERWORLD_ISO_METRICS,
  projectHex,
  toTileKey,
  type GridPoint
} from "./iso.js";

describe("iso helpers", () => {
  it("projects the same tile to the same screen point", () => {
    const point: GridPoint = { x: 4, y: 3 };

    expect(projectHex(point)).toEqual(projectHex(point));
  });

  it("sorts lower rows above higher rows", () => {
    expect(getTileZIndex({ x: 2, y: 6 })).toBeGreaterThan(getTileZIndex({ x: 9, y: 2 }));
  });

  it("keeps the courier anchor centered on the active tile", () => {
    const point: GridPoint = { x: 5, y: 4 };
    const projected = projectHex(point);
    const courier = getCourierAnchor(point);

    expect(courier.x).toBe(projected.x);
    expect(courier.y).toBeLessThan(projected.y);
  });

  it("projects odd-r neighbors onto a connected hex grid", () => {
    const current = projectHex({ x: 2, y: 2 });
    const east = projectHex({ x: 3, y: 2 });
    const southeast = projectHex({ x: 2, y: 3 });

    expect(east.x - current.x).toBe(OVERWORLD_ISO_METRICS.columnStep);
    expect(east.y).toBe(current.y);
    expect(southeast.x - current.x).toBe(OVERWORLD_ISO_METRICS.oddRowOffset);
    expect(southeast.y - current.y).toBe(OVERWORLD_ISO_METRICS.rowStep);
  });

  it("matches current adjacent hex travel rules", () => {
    const current: GridPoint = { x: 2, y: 2 };

    expect(hexDistance(current, { x: 3, y: 2 })).toBe(1);
    expect(hexDistance(current, { x: 2, y: 3 })).toBe(1);
    expect(hexDistance(current, { x: 4, y: 2 })).toBeGreaterThan(1);
  });

  it("serializes tile keys consistently", () => {
    expect(toTileKey({ x: 7, y: 6 })).toBe("7,6");
  });

  it("sizes the overworld board from surface extents instead of tile depth", () => {
    expect(getHexBoardSize(1, 1)).toEqual({
      width: OVERWORLD_ISO_METRICS.originX * 2 + OVERWORLD_ISO_METRICS.tileWidth,
      height: OVERWORLD_ISO_METRICS.originY * 2 + OVERWORLD_ISO_METRICS.tileHeight
    });

    expect(getHexBoardSize(4, 3)).toEqual({
      width:
        OVERWORLD_ISO_METRICS.originX * 2 +
        OVERWORLD_ISO_METRICS.columnStep * 3 +
        OVERWORLD_ISO_METRICS.oddRowOffset +
        OVERWORLD_ISO_METRICS.tileWidth,
      height:
        OVERWORLD_ISO_METRICS.originY * 2 + OVERWORLD_ISO_METRICS.rowStep * 2 + OVERWORLD_ISO_METRICS.tileHeight
    });
  });

  it("keeps courier and marker anchors on the flatter surface", () => {
    const point: GridPoint = { x: 4, y: 3 };
    const projected = projectHex(point);
    const courier = getCourierAnchor(point);
    const marker = getMarkerAnchor(point);

    expect(courier.x).toBe(projected.x);
    expect(marker.x).toBe(projected.x);
    expect(projected.y - courier.y).toBeCloseTo(OVERWORLD_ISO_METRICS.tileHeight * 0.22);
    expect(projected.y - marker.y).toBeCloseTo(OVERWORLD_ISO_METRICS.tileHeight * 0.34);
    expect(marker.y).toBeLessThan(courier.y);
  });

  it("uses the same connected hex layout for interiors", () => {
    const current = projectHex({ x: 2, y: 2 }, INTERIOR_ISO_METRICS);
    const southeast = projectHex({ x: 2, y: 3 }, INTERIOR_ISO_METRICS);
    const courier = getInteriorCourierAnchor({ x: 2, y: 2 });

    expect(southeast.x - current.x).toBe(INTERIOR_ISO_METRICS.oddRowOffset);
    expect(southeast.y - current.y).toBe(INTERIOR_ISO_METRICS.rowStep);
    expect(courier.x).toBe(current.x);
    expect(courier.y).toBeLessThan(current.y);
    expect(getInteriorBoardSize(5, 4)).toEqual(getHexBoardSize(5, 4, INTERIOR_ISO_METRICS));
  });
});
