import { describe, expect, it, vi, afterEach } from "vitest";

import { interiorRuntimeAdapter } from "./interior_adapter.js";
import { overworldRuntimeAdapter } from "./overworld_adapter.js";
import type { InteriorSceneModel, OverworldSceneModel } from "./types.js";

afterEach(() => {
  vi.useRealTimers();
});

function createOverworldScene(): OverworldSceneModel {
  return {
    mapId: "frontier_map",
    mapName: "Frontier",
    mapTheme: "desert-dawn",
    boardSize: { width: 5, height: 5 },
    currentTileKey: "1,1",
    hoverTileKey: null,
    tiles: [],
    locations: [
      {
        id: "dusty_tavern",
        tileKey: "4,1",
        name: "Dusty Tavern",
        type: "tavern",
        point: { x: 4, y: 1 },
        markerPosition: { x: 0, y: 0 },
        hitRadius: 18,
        interiorMapId: "dusty_tavern_interior",
        discovered: true,
        isCurrent: false,
        isHighlighted: false,
        zIndex: 1
      }
    ],
    courier: {
      id: "courier",
      point: { x: 1, y: 1 },
      anchor: { x: 0, y: 0 },
      zIndex: 1
    },
    companion: null,
    routes: [],
    terrainFeatures: [],
    questMarkers: [],
    factionMarkers: [],
    borders: [],
    encounterMarkers: [],
    ambientOverlays: []
  };
}

function createInteriorScene(): InteriorSceneModel {
  return {
    mapId: "dusty_tavern_interior",
    mapName: "Dusty Tavern",
    mapTheme: "saloon",
    boardSize: { width: 10, height: 12 },
    currentTileKey: "8,10",
    hoverTileKey: null,
    hoveredMarkerId: null,
    tiles: [
      {
        key: "8,10",
        point: { x: 8, y: 10 },
        terrain: "floor",
        projected: { x: 0, y: 0 },
        polygon: [],
        isCurrent: true,
        isReachable: false,
        isPassable: true,
        exitId: null,
        zIndex: 1
      },
      {
        key: "8,9",
        point: { x: 8, y: 9 },
        terrain: "floor",
        projected: { x: 0, y: 0 },
        polygon: [],
        isCurrent: false,
        isReachable: true,
        isPassable: true,
        exitId: null,
        zIndex: 1
      },
      {
        key: "8,8",
        point: { x: 8, y: 8 },
        terrain: "floor",
        projected: { x: 0, y: 0 },
        polygon: [],
        isCurrent: false,
        isReachable: true,
        isPassable: true,
        exitId: null,
        zIndex: 1
      }
    ],
    markers: [],
    courier: {
      id: "courier",
      point: { x: 8, y: 10 },
      anchor: { x: 0, y: 0 },
      zIndex: 1
    },
    companion: null
  };
}

const minimalFinalPatch = {
  playerCharacter: {} as never,
  worldState: { player_x: 4, player_y: 1, current_screen: "overworld" as const, current_location_id: null, current_panel: null },
  mapDiscovery: { discoveredLocationIds: [], discoveredTileKeys: [] },
  questState: {},
  currentLocation: null,
  currentInteriorMap: null
};

describe("route request adapters", () => {
  it("issues one overworld travel request for a far tile", async () => {
    vi.useFakeTimers();
    const onTravelRequest = vi.fn().mockResolvedValue({ steps: [], finalPatch: minimalFinalPatch });
    const onTravelStep = vi.fn();
    const onTravelComplete = vi.fn();
    const onEnterLocation = vi.fn();

    overworldRuntimeAdapter.applyInteraction(
      {
        kind: "tile",
        point: { x: 4, y: 1 },
        tileKey: "4,1"
      },
      { onTravelRequest, onTravelStep, onTravelComplete, onEnterLocation },
      createOverworldScene()
    );

    await vi.runAllTimersAsync();

    expect(onTravelRequest).toHaveBeenCalledTimes(1);
    expect(onTravelRequest).toHaveBeenCalledWith(4, 1);
    expect(onEnterLocation).not.toHaveBeenCalled();
  });

  it("travels once before entering a distant location", async () => {
    vi.useFakeTimers();
    const onTravelRequest = vi.fn().mockResolvedValue({ steps: [], finalPatch: minimalFinalPatch });
    const onTravelStep = vi.fn();
    const onTravelComplete = vi.fn();
    const onEnterLocation = vi.fn();

    overworldRuntimeAdapter.applyInteraction(
      {
        kind: "location",
        locationId: "dusty_tavern",
        tileKey: "4,1"
      },
      { onTravelRequest, onTravelStep, onTravelComplete, onEnterLocation },
      createOverworldScene()
    );

    await vi.runAllTimersAsync();

    expect(onTravelRequest).toHaveBeenCalledTimes(1);
    expect(onTravelRequest).toHaveBeenCalledWith(4, 1);
    expect(onEnterLocation).toHaveBeenCalledTimes(1);
    expect(onEnterLocation).toHaveBeenCalledWith("dusty_tavern");
  });

  it("issues one interior move request for a far tile", async () => {
    vi.useFakeTimers();
    const onStep = vi.fn();
    const onMoveSettled = vi.fn();
    const handlers = {
      onStep,
      onMoveSettled,
      onExit: vi.fn(),
      onNpcClick: vi.fn(),
      onLootClick: vi.fn(),
      onInteractableClick: vi.fn(),
      onCompanionClick: vi.fn(),
      onPlayerClick: vi.fn()
    };

    interiorRuntimeAdapter.applyInteraction(
      {
        kind: "tile",
        point: { x: 8, y: 8 },
        tileKey: "8,8"
      },
      handlers,
      createInteriorScene()
    );

    await vi.runAllTimersAsync();

    expect(onMoveSettled).toHaveBeenCalledTimes(1);
    expect(onMoveSettled).toHaveBeenCalledWith(8, 8);
  });
});
