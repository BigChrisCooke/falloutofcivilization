import { describe, expect, it } from "vitest";

import type {
  GameState,
  InteriorReplayStep,
  OverworldReplayStep,
  TravelRouteFinalPatch
} from "./api.js";
import { applyGameStatePatch, applyInteriorReplayStep, applyOverworldReplayStep } from "./game_state_patch.js";

function createGameState(): GameState {
  return {
    save: {
      id: "save_1",
      name: "Courier Run",
      region_id: "frontier"
    },
    playerCharacter: {
      name: "Courier",
      level: 1,
      xp: 0,
      archetype: "Scout",
      special: null,
      karma: 0,
      skills: null
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
        ["sand", "road", "sand"],
        ["sand", "road", "sand"],
        ["sand", "road", "sand"]
      ]
    },
    currentLocation: null,
    currentInteriorMap: null,
    mapDiscovery: {
      discoveredLocationIds: ["vault_47"],
      discoveredTileKeys: ["1,1"]
    },
    questState: {
      active: ["find_tavern"],
      completed: [],
      failed: [],
      definitions: [
        {
          id: "find_tavern",
          name: "Find the Tavern",
          description: "Reach the tavern.",
          objectives: [
            {
              id: "visit_tavern",
              description: "Visit the tavern.",
              type: "visit",
              target: "dusty_tavern",
              locationId: "dusty_tavern",
              completed: false
            }
          ],
          mapMarker: { locationId: "dusty_tavern", label: "Visit the tavern." },
          activeMapMarker: { locationId: "dusty_tavern", label: "Visit the tavern." }
        }
      ]
    },
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
        description: "Roadside stop.",
        position: { x: 2, y: 1 },
        interiorMapId: "dusty_tavern_interior",
        discovered: false,
        atPlayerPosition: false
      }
    ],
    weaponCatalog: [
      {
        id: "service_rifle",
        name: "Service Rifle",
        category: "rifle",
        damage: 18,
        damageType: "ballistic",
        weight: 6,
        value: 120,
        rarity: "common",
        description: "Reliable NCR issue."
      }
    ]
  };
}

describe("game state replay helpers", () => {
  it("applies overworld replay steps incrementally", () => {
    const previousState = createGameState();
    const replayStep: OverworldReplayStep = {
      position: { x: 2, y: 1 },
      revealedTileKeys: ["2,1"],
      discoveredLocationIds: ["dusty_tavern"]
    };

    const nextState = applyOverworldReplayStep(previousState, replayStep);

    expect(nextState.currentLocation).toBeNull();
    expect(nextState.currentInteriorMap).toBeNull();
    expect(nextState.worldState.player_x).toBe(2);
    expect(nextState.worldState.player_y).toBe(1);
    expect(nextState.mapDiscovery.discoveredTileKeys).toEqual(["1,1", "2,1"]);
    expect(nextState.mapDiscovery.discoveredLocationIds).toEqual(["vault_47", "dusty_tavern"]);
    expect(nextState.locations.find((location) => location.id === "vault_47")).toMatchObject({
      discovered: true,
      atPlayerPosition: false
    });
    expect(nextState.locations.find((location) => location.id === "dusty_tavern")).toMatchObject({
      discovered: true,
      atPlayerPosition: true
    });
  });

  it("applies final overworld patches while preserving cached static data", () => {
    const previousState = createGameState();
    const finalPatch: TravelRouteFinalPatch = {
      playerCharacter: {
        ...previousState.playerCharacter,
        level: 2,
        xp: 120,
        skills: null
      },
      worldState: {
        current_screen: "overworld",
        current_location_id: null,
        current_panel: null,
        player_x: 2,
        player_y: 1
      },
      mapDiscovery: {
        discoveredLocationIds: ["vault_47", "dusty_tavern"],
        discoveredTileKeys: ["1,1", "2,1"]
      },
      questState: {
        active: ["find_tavern"],
        completed: [],
        failed: [],
        definitions: [
          {
            id: "find_tavern",
            name: "Find the Tavern",
            description: "Reach the tavern.",
            objectives: [
              {
                id: "visit_tavern",
                description: "Visit the tavern.",
                type: "visit",
                target: "dusty_tavern",
                locationId: "dusty_tavern",
                completed: true
              }
            ],
            mapMarker: { locationId: "dusty_tavern", label: "Visit the tavern." },
            activeMapMarker: null
          }
        ]
      },
      currentLocation: null,
      currentInteriorMap: null
    };

    const nextState = applyGameStatePatch(previousState, finalPatch);

    expect(nextState.overworldMap).toBe(previousState.overworldMap);
    expect(nextState.region).toBe(previousState.region);
    expect(nextState.weaponCatalog).toBe(previousState.weaponCatalog);
    expect(nextState.playerCharacter.level).toBe(2);
    expect(nextState.questState).toEqual(finalPatch.questState);
    expect(nextState.locations.find((location) => location.id === "dusty_tavern")).toMatchObject({
      discovered: true,
      atPlayerPosition: true
    });
  });

  it("applies interior replay steps incrementally", () => {
    const previousState: GameState = {
      ...createGameState(),
      worldState: {
        current_screen: "location",
        current_location_id: "dusty_tavern",
        current_panel: "location",
        player_x: 8,
        player_y: 10
      },
      currentLocation: {
        id: "dusty_tavern",
        name: "Dusty Tavern",
        description: "Roadside stop."
      },
      currentInteriorMap: {
        id: "dusty_tavern_interior",
        name: "Dusty Tavern Interior",
        theme: "saloon",
        layout: [["floor"]],
        spawnPoints: [{ id: "spawn", x: 8, y: 10 }],
        exits: [{ id: "to_world", target: "frontier_valley", x: 8, y: 11 }],
        interactables: [],
        npcs: [],
        loot: [],
        questHooks: []
      }
    };
    const replayStep: InteriorReplayStep = {
      position: { x: 8, y: 9 }
    };

    const nextState = applyInteriorReplayStep(previousState, replayStep);

    expect(nextState.worldState.player_x).toBe(8);
    expect(nextState.worldState.player_y).toBe(9);
    expect(nextState.currentLocation).toBe(previousState.currentLocation);
    expect(nextState.currentInteriorMap).toBe(previousState.currentInteriorMap);
    expect(nextState.weaponCatalog).toBe(previousState.weaponCatalog);
  });
});
