import { describe, expect, it } from "vitest";

import { validateGameContent } from "../index.js";

describe("game content", () => {
  it("loads and validates the placeholder authored content", () => {
    const content = validateGameContent();

    expect(content.regions).toHaveLength(1);
    expect(content.locations.length).toBeGreaterThanOrEqual(4);
    expect(content.interiorMaps.length).toBeGreaterThanOrEqual(3);
  });
});
