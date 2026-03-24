import { describe, expect, it } from "vitest";

import type { GameState } from "../api.js";
import { getCenteredWorldPosition, getHexMapSize, findTileAtWorldPoint } from "./hex_geometry.js";
import { buildOverworldSceneModel } from "./overworld_scene_model.js";
import {
  getDraggedWorldPosition,
  resolveHoverTile,
  resolveInteractionTarget,
  startPointerGesture,
  updatePointerGesture
} from "./overworld_input.js";

function createGameState(): GameState {
  return {
    save: {
      id: "save_1",
      name: "Test Save",
      region_id: "frontier"
    },
    playerCharacter: {
      name: "Courier",
      level: 1,
      archetype: "Scout",
      special: null,
      karma: 0
    },
    worldState: {
      current_screen: "overworld",
      current_location_id: null,
      current_panel: null,
      player_x: 1,
      player_y: 1
    },
    region: {
      name: "Frontier Valley",
      summary: "A test region."
    },
    overworldMap: {
      id: "frontier_map",
      name: "Frontier Map",
      theme: "desert-dawn",
      width: 3,
      height: 3,
      fogRevealRadius: 2,
      layout: [
        ["sand", "scrub", "road"],
        ["sand", "vault", "road"],
        ["scrub", "rock", "mesa"]
      ]
    },
    currentLocation: {
      id: "vault_47",
      name: "Vault 47",
      description: "Starting vault."
    },
    currentInteriorMap: null,
    mapDiscovery: {
      discoveredLocationIds: ["vault_47", "dusty_tavern"],
      discoveredTileKeys: ["0,0", "1,0", "2,0", "0,1", "1,1", "2,1", "1,2"]
    },
    questState: { active: [], completed: [], definitions: [] },
    inventory: [],
    collectedItemIds: [],
    collectedActionIds: [],
    companions: [],
    factionStanding: {
      settlers: 1
    },
    locations: [
      {
        id: "vault_47",
        name: "Vault 47",
        type: "vault",
        description: "Starting vault.",
        position: { x: 1, y: 1 },
        interiorMapId: "vault_47_home",
        discovered: true,
        atPlayerPosition: true
      },
      {
        id: "dusty_tavern",
        name: "Dusty Tavern",
        type: "tavern",
        description: "Roadhouse stop.",
        position: { x: 2, y: 1 },
        interiorMapId: "dusty_tavern_interior",
        discovered: true,
        atPlayerPosition: false
      },
      {
        id: "solar_spire",
        name: "Solar Spire",
        type: "landmark",
        description: "Far ridge site.",
        position: { x: 2, y: 2 },
        interiorMapId: "solar_spire_core",
        discovered: false,
        atPlayerPosition: false
      }
    ]
  };
}

describe("overworld map modules", () => {
  it("builds a scene model with terrain, actors, props, and reserved future layers", () => {
    const scene = buildOverworldSceneModel(createGameState());

    expect(scene).not.toBeNull();
    expect(scene?.tiles).toHaveLength(9);
    expect(scene?.locations).toHaveLength(2);
    expect(scene?.currentTileKey).toBe("1,1");
    expect(scene?.routes).toEqual([]);
    expect(scene?.terrainFeatures).toEqual([]);
    expect(scene?.questMarkers).toEqual([]);
    expect(scene?.factionMarkers).toEqual([]);
  });

  it("resolves hexes from world points and preserves board sizing and centering math", () => {
    const state = createGameState();
    const scene = buildOverworldSceneModel(state);

    if (!scene || !state.overworldMap) {
      throw new Error("Expected an overworld scene.");
    }

    const adjacentTile = scene.tiles.find((tile) => tile.key === "2,1");

    expect(adjacentTile).toBeTruthy();

    if (!adjacentTile) {
      throw new Error("Adjacent tile missing from scene model.");
    }

    const resolvedTile = findTileAtWorldPoint(adjacentTile.projected, scene.tiles);

    expect(resolvedTile?.key).toBe(adjacentTile.key);
    expect(scene.boardSize).toEqual(getHexMapSize(state.overworldMap.width, state.overworldMap.height));

    const centered = getCenteredWorldPosition({ width: 1000, height: 700 }, scene.courier.anchor);

    expect(centered.x + scene.courier.anchor.x).toBe(500);
    expect(centered.y + scene.courier.anchor.y).toBeCloseTo(700 * 0.58);
  });

  it("distinguishes clicks from drags using the shared pointer gesture state", () => {
    const started = startPointerGesture({ x: 100, y: 100 }, { x: 10, y: 20 });
    const almostClick = updatePointerGesture(started, { x: 102, y: 103 });
    const dragged = updatePointerGesture(started, { x: 109, y: 100 });

    expect(almostClick.moved).toBe(false);
    expect(dragged.moved).toBe(true);
    expect(getDraggedWorldPosition(dragged, { x: 109, y: 100 })).toEqual({
      x: 19,
      y: 20
    });
  });

  it("targets reachable adjacent tiles for travel", () => {
    const scene = buildOverworldSceneModel(createGameState());

    if (!scene) {
      throw new Error("Expected an overworld scene.");
    }

    const adjacentTile = scene.tiles.find((tile) => tile.key === "2,1");

    if (!adjacentTile) {
      throw new Error("Adjacent tile missing from scene model.");
    }

    expect(resolveHoverTile(scene, adjacentTile.projected)).toEqual({ tileKey: "2,1", markerId: null });
    expect(resolveInteractionTarget(scene, adjacentTile.projected)).toEqual({
      kind: "tile",
      point: { x: 2, y: 1 },
      tileKey: "2,1"
    });
  });

  it("targets the current enterable location from both its tile and its marker", () => {
    const scene = buildOverworldSceneModel(createGameState());

    if (!scene) {
      throw new Error("Expected an overworld scene.");
    }

    const currentTile = scene.tiles.find((tile) => tile.key === "1,1");
    const currentLocation = scene.locations.find((location) => location.id === "vault_47");

    if (!currentTile || !currentLocation) {
      throw new Error("Current tile or location missing from scene model.");
    }

    expect(resolveInteractionTarget(scene, currentTile.projected)).toEqual({
      kind: "location",
      locationId: "vault_47",
      tileKey: "1,1"
    });
    expect(resolveHoverTile(scene, currentLocation.markerPosition)).toEqual({ tileKey: "1,1", markerId: null });
    expect(resolveInteractionTarget(scene, currentLocation.markerPosition)).toEqual({
      kind: "location",
      locationId: "vault_47",
      tileKey: "1,1"
    });
  });
});
