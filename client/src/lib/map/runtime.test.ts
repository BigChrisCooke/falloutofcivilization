import { describe, expect, it } from "vitest";

import type { GameState } from "../api.js";
import { createInteriorLayerContainers, syncInteriorScene } from "./interior_layers.js";
import { buildInteriorSceneModel } from "./interior_scene_model.js";
import { createOverworldLayerContainers, syncOverworldScene } from "./overworld_layers.js";
import { buildOverworldSceneModel } from "./overworld_scene_model.js";

function createOverworldState(player = { x: 1, y: 1 }): GameState {
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
      player_x: player.x,
      player_y: player.y
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
      discoveredTileKeys: player.x === 2 ? ["0,0", "1,0", "2,0", "0,1", "1,1", "2,1", "1,2", "2,2"] : ["0,0", "1,0", "2,0", "0,1", "1,1", "2,1", "1,2"]
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
        atPlayerPosition: player.x === 1 && player.y === 1
      },
      {
        id: "dusty_tavern",
        name: "Dusty Tavern",
        type: "tavern",
        description: "Roadhouse stop.",
        position: { x: 2, y: 1 },
        interiorMapId: "dusty_tavern_interior",
        discovered: true,
        atPlayerPosition: player.x === 2 && player.y === 1
      }
    ]
  };
}

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
        position: { x: 2, y: 2 },
        interiorMapId: "vault_47_home",
        discovered: true,
        atPlayerPosition: true
      }
    ]
  };
}

describe("retained map renderer", () => {
  it("keeps overworld terrain and courier nodes stable across same-map travel updates", () => {
    const firstScene = buildOverworldSceneModel(createOverworldState());
    const secondScene = buildOverworldSceneModel(createOverworldState({ x: 2, y: 1 }));

    if (!firstScene || !secondScene) {
      throw new Error("Expected overworld scenes.");
    }

    const layers = createOverworldLayerContainers();
    const firstNodes = syncOverworldScene(layers, null, null, firstScene);
    const firstTerrain = firstNodes.terrainByKey.get("1,1");
    const firstCourier = firstNodes.courier;
    const secondNodes = syncOverworldScene(layers, firstNodes, firstScene, secondScene);

    expect(firstTerrain).toBeTruthy();
    expect(firstCourier).toBeTruthy();
    expect(secondNodes.terrainByKey.get("1,1")).toBe(firstTerrain);
    expect(secondNodes.courier).toBe(firstCourier);
  });

  it("keeps interior terrain and courier nodes stable across same-map movement", () => {
    const firstScene = buildInteriorSceneModel(createInteriorState());
    const secondScene = buildInteriorSceneModel(createInteriorState({ x: 2, y: 3 }));

    if (!firstScene || !secondScene) {
      throw new Error("Expected interior scenes.");
    }

    const layers = createInteriorLayerContainers();
    const firstNodes = syncInteriorScene(layers, null, null, firstScene);
    const firstTerrain = firstNodes.terrainByKey.get("2,2");
    const firstCourier = firstNodes.courier;
    const secondNodes = syncInteriorScene(layers, firstNodes, firstScene, secondScene);

    expect(firstTerrain).toBeTruthy();
    expect(firstCourier).toBeTruthy();
    expect(secondNodes.terrainByKey.get("2,2")).toBe(firstTerrain);
    expect(secondNodes.courier).toBe(firstCourier);
  });
});
