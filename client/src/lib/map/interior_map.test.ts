import { describe, expect, it } from "vitest";

import type { GameState } from "../api.js";
import { INTERIOR_ISO_METRICS } from "../iso.js";
import { getCenteredWorldPosition, getHexMapSize, findTileAtWorldPoint } from "./hex_geometry.js";
import { buildInteriorSceneModel } from "./interior_scene_model.js";
import { resolveInteriorHover, resolveInteriorInteractionTarget } from "./interior_input.js";
import { getDraggedWorldPosition, startPointerGesture, updatePointerGesture } from "./pointer_gesture.js";

function createInteriorState(player = { x: 2, y: 2 }): GameState {
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
      current_screen: "vault",
      current_location_id: "vault_47",
      current_panel: "vault",
      player_x: player.x,
      player_y: player.y
    },
    region: {
      name: "Frontier Valley",
      summary: "A test region."
    },
    overworldMap: null,
    currentLocation: {
      id: "vault_47",
      name: "Vault 47",
      description: "Starting vault."
    },
    currentInteriorMap: {
      id: "vault_47_home",
      name: "Vault 47 Home",
      theme: "vault",
      layout: [
        ["wall", "wall", "wall", "wall", "wall"],
        ["wall", "floor", "floor", "stash", "wall"],
        ["wall", "medbay", "floor", "terminal", "wall"],
        ["wall", "wall", "exit", "wall", "wall"]
      ],
      spawnPoints: [{ id: "spawn", x: 2, y: 2 }],
      exits: [{ id: "to_frontier_valley", target: "frontier_valley", x: 2, y: 3 }],
      interactables: [
        { id: "stash", type: "stash", label: "Home Stash" },
        { id: "terminal", type: "terminal", label: "Vault Terminal" }
      ],
      npcs: [{ id: "overseer_hale", name: "Overseer Hale", disposition: "neutral" }],
      loot: [{ id: "stimpak_cache", label: "Emergency Kit" }],
      questHooks: ["intro_return_home"]
    },
    mapDiscovery: {
      discoveredLocationIds: ["vault_47"],
      discoveredTileKeys: ["2,2"]
    },
    questState: { active: [], completed: [], definitions: [] },
    inventory: [],
    collectedItemIds: [],
    collectedActionIds: [],
    factionStanding: {
      settlers: 1
    },
    locations: [
      {
        id: "vault_47",
        name: "Vault 47",
        type: "vault",
        description: "Starting vault.",
        position: { x: 2, y: 2 },
        interiorMapId: "vault_47_home",
        discovered: true,
        atPlayerPosition: true
      }
    ]
  };
}

describe("interior map modules", () => {
  it("builds a flat interior scene model with connected hex tiles and markers", () => {
    const scene = buildInteriorSceneModel(createInteriorState());

    expect(scene).not.toBeNull();
    expect(scene?.tiles).toHaveLength(20);
    expect(scene?.markers).toHaveLength(5);
    expect(scene?.currentTileKey).toBe("2,2");
  });

  it("resolves interior hexes from world points and preserves board centering math", () => {
    const state = createInteriorState();
    const scene = buildInteriorSceneModel(state);

    if (!scene || !state.currentInteriorMap) {
      throw new Error("Expected an interior scene.");
    }

    const adjacentTile = scene.tiles.find((tile) => tile.key === "2,3");

    expect(adjacentTile).toBeTruthy();

    if (!adjacentTile) {
      throw new Error("Exit tile missing from scene model.");
    }

    expect(findTileAtWorldPoint(adjacentTile.projected, scene.tiles)?.key).toBe("2,3");
    expect(scene.boardSize).toEqual(getHexMapSize(5, 4, INTERIOR_ISO_METRICS));

    const centered = getCenteredWorldPosition({ width: 1000, height: 700 }, scene.courier.anchor);

    expect(centered.x + scene.courier.anchor.x).toBe(500);
    expect(centered.y + scene.courier.anchor.y).toBeCloseTo(700 * 0.58);
  });

  it("shares the drag threshold logic with the overworld input path", () => {
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

  it("targets adjacent interior tiles for movement and the current exit tile for leaving", () => {
    const scene = buildInteriorSceneModel(createInteriorState());
    const exitScene = buildInteriorSceneModel(createInteriorState({ x: 2, y: 3 }));

    if (!scene || !exitScene) {
      throw new Error("Expected an interior scene.");
    }

    const exitTile = scene.tiles.find((tile) => tile.key === "2,3");
    const adjacentTile = scene.tiles.find((tile) => tile.key === "3,2");
    const exitMarker = exitScene.markers.find((marker) => marker.id === "to_frontier_valley");

    if (!exitTile || !exitMarker || !adjacentTile) {
      throw new Error("Expected interior interaction targets.");
    }

    expect(resolveInteriorHover(scene, adjacentTile.projected)).toEqual({ tileKey: "3,2", markerId: null });
    expect(resolveInteriorInteractionTarget(scene, adjacentTile.projected)).toEqual({
      kind: "tile",
      point: { x: 3, y: 2 },
      tileKey: "3,2"
    });
    expect(resolveInteriorHover(scene, exitTile.projected)).toEqual({ tileKey: "2,3", markerId: null });
    expect(resolveInteriorInteractionTarget(scene, exitTile.projected)).toEqual({
      kind: "tile",
      point: { x: 2, y: 3 },
      tileKey: "2,3"
    });
    expect(resolveInteriorInteractionTarget(exitScene, exitMarker.markerPosition)).toEqual({
      kind: "exit",
      exitId: "to_frontier_valley",
      tileKey: "2,3"
    });
  });
});
