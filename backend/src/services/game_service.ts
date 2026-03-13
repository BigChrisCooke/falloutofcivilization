import type Database from "better-sqlite3";

import { GameStateRepo } from "../repos/game_state_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import { getGameContent } from "./content_service.js";
import {
  canTravel,
  getOverworldMap,
  getRegion,
  getRegionLocations,
  getStartingLocation,
  normalizeExplorationState,
  revealExploration
} from "./exploration_state.js";
import {
  canMoveInterior,
  getInteriorExit,
  getInteriorLocation,
  getInteriorMap,
  getInteriorSpawnPoint
} from "./interior_state.js";
import type { MapDiscoveryRow, WorldStateRow } from "../shared/types.js";

export class GameService {
  private readonly saveRepo: SaveRepo;
  private readonly gameStateRepo: GameStateRepo;

  public constructor(db: Database.Database) {
    this.saveRepo = new SaveRepo(db);
    this.gameStateRepo = new GameStateRepo(db);
  }

  public getState(saveId: string) {
    const content = getGameContent();
    const save = this.saveRepo.findById(saveId);
    const playerCharacter = this.saveRepo.findPlayerCharacter(saveId);
    const worldState = this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = this.gameStateRepo.getMapDiscovery(saveId);
    const questState = this.gameStateRepo.getQuestState(saveId);
    const factionStanding = this.gameStateRepo.getFactionStanding(saveId);

    if (!save || !playerCharacter || !worldState || !mapDiscovery || !questState || !factionStanding) {
      throw new Error("Save state is incomplete.");
    }

    const region = content.regions.find((candidate) => candidate.id === worldState.current_region_id) ?? null;
    const regionLocations = region ? getRegionLocations(content, region.id) : [];
    const overworldMap = region ? getOverworldMap(content, region) : null;
    const normalizedState =
      region && overworldMap
        ? this.ensureExplorationState(saveId, worldState, mapDiscovery)
        : {
            worldState,
            mapDiscovery,
            discoveredLocationIds: JSON.parse(mapDiscovery.discovered_locations_json) as string[],
            discoveredTileKeys: JSON.parse(mapDiscovery.discovered_tiles_json ?? "[]") as string[]
          };
    const currentLocation = worldState.current_location_id
      ? content.locations.find((candidate) => candidate.id === worldState.current_location_id) ?? null
      : null;
    const currentInteriorMap = worldState.current_map_id
      ? content.interiorMaps.find((candidate) => candidate.id === worldState.current_map_id) ?? null
      : null;

    return {
      save,
      playerCharacter,
      worldState: normalizedState.worldState,
      region,
      overworldMap,
      currentLocation,
      currentInteriorMap,
      mapDiscovery: {
        discoveredLocationIds: normalizedState.discoveredLocationIds,
        discoveredTileKeys: normalizedState.discoveredTileKeys
      },
      questState: {
        active: JSON.parse(questState.active_quests_json) as string[],
        completed: JSON.parse(questState.completed_quests_json) as string[]
      },
      factionStanding: JSON.parse(factionStanding.standings_json) as Record<string, number>,
      locations: regionLocations.map((location) => ({
        ...location,
        discovered: normalizedState.discoveredLocationIds.includes(location.id),
        atPlayerPosition:
          normalizedState.worldState.player_x === location.position.x &&
          normalizedState.worldState.player_y === location.position.y
      }))
    };
  }

  public updateScreen(saveId: string, screen: "overworld" | "vault"): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);
    if (!worldState) {
      throw new Error("World state not found.");
    }

    const region = content.regions.find((candidate) => candidate.id === worldState.current_region_id);
    if (!region) {
      throw new Error("Region content not found.");
    }

    const vaultLocation = content.locations.find(
      (candidate) => candidate.regionId === region.id && candidate.type === "vault" && candidate.interiorMapId
    );

    if (screen === "vault" && !vaultLocation?.interiorMapId) {
      throw new Error("No vault content is available for this region.");
    }

    const currentLocation = worldState.current_location_id
      ? content.locations.find((candidate) => candidate.id === worldState.current_location_id) ?? null
      : null;
    const vaultSpawnPoint = vaultLocation?.interiorMapId
      ? getInteriorSpawnPoint(getInteriorMap(content, vaultLocation.interiorMapId))
      : null;
    const overworldPosition =
      screen === "overworld" && currentLocation
        ? { x: currentLocation.position.x, y: currentLocation.position.y }
        : { x: worldState.player_x, y: worldState.player_y };
    if (screen === "vault" && !vaultSpawnPoint) {
      throw new Error("Vault spawn point is not available.");
    }

    const nextPlayerPosition: { x: number | null; y: number | null } =
      screen === "vault"
        ? { x: vaultSpawnPoint!.x, y: vaultSpawnPoint!.y }
        : {
            x: overworldPosition.x,
            y: overworldPosition.y
          };

    this.gameStateRepo.updateWorldState({
      ...worldState,
      current_screen: screen,
      current_location_id: screen === "overworld" ? null : vaultLocation?.id ?? null,
      current_map_id: screen === "overworld" ? region.mapId : vaultLocation?.interiorMapId ?? null,
      current_panel: screen === "vault" ? "vault" : null,
      player_x: nextPlayerPosition.x,
      player_y: nextPlayerPosition.y,
      updated_at: Date.now()
    });
  }

  public enterLocation(saveId: string, locationId: string): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = this.gameStateRepo.getMapDiscovery(saveId);

    if (!worldState || !mapDiscovery) {
      throw new Error("World state not found.");
    }

    const region = getRegion(content, worldState.current_region_id);
    const regionLocations = getRegionLocations(content, region.id);
    const startingLocation = getStartingLocation(content, region, regionLocations);
    const overworldMap = getOverworldMap(content, region);
    const normalizedExploration = normalizeExplorationState(overworldMap, regionLocations, startingLocation, {
      playerX: worldState.player_x,
      playerY: worldState.player_y,
      discoveredLocationIdsJson: mapDiscovery.discovered_locations_json,
      discoveredTileKeysJson: mapDiscovery.discovered_tiles_json
    });
    const location = regionLocations.find((candidate) => candidate.id === locationId);

    if (!location || !location.interiorMapId) {
      throw new Error("That location cannot be entered.");
    }

    if (!normalizedExploration.discoveredLocationIds.includes(location.id)) {
      throw new Error("That location has not been discovered yet.");
    }

    if (
      normalizedExploration.playerPosition.x !== location.position.x ||
      normalizedExploration.playerPosition.y !== location.position.y
    ) {
      throw new Error("Travel onto the location tile before entering it.");
    }

    const spawnPoint = getInteriorSpawnPoint(getInteriorMap(content, location.interiorMapId));

    this.gameStateRepo.updateWorldState({
      ...worldState,
      current_screen: "location",
      current_location_id: location.id,
      current_map_id: location.interiorMapId,
      current_panel: "location",
      player_x: spawnPoint.x,
      player_y: spawnPoint.y,
      updated_at: Date.now()
    });
  }

  public travel(saveId: string, x: number, y: number): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = this.gameStateRepo.getMapDiscovery(saveId);

    if (!worldState || !mapDiscovery) {
      throw new Error("World state not found.");
    }

    const region = getRegion(content, worldState.current_region_id);
    const regionLocations = getRegionLocations(content, region.id);
    const startingLocation = getStartingLocation(content, region, regionLocations);
    const overworldMap = getOverworldMap(content, region);
    const normalizedExploration = normalizeExplorationState(overworldMap, regionLocations, startingLocation, {
      playerX: worldState.player_x,
      playerY: worldState.player_y,
      discoveredLocationIdsJson: mapDiscovery.discovered_locations_json,
      discoveredTileKeysJson: mapDiscovery.discovered_tiles_json
    });
    const targetPosition = { x, y };

    if (
      normalizedExploration.playerPosition.x === targetPosition.x &&
      normalizedExploration.playerPosition.y === targetPosition.y
    ) {
      return;
    }

    if (!canTravel(normalizedExploration.playerPosition, targetPosition, overworldMap)) {
      throw new Error("Travel is limited to adjacent hexes inside the explored map bounds.");
    }

    const revealedState = revealExploration(
      overworldMap,
      regionLocations,
      targetPosition,
      normalizedExploration.discoveredLocationIds,
      normalizedExploration.discoveredTileKeys
    );
    const now = Date.now();

    this.gameStateRepo.updateExplorationState(
      {
        ...worldState,
        current_screen: "overworld",
        current_location_id: null,
        current_map_id: region.mapId,
        current_panel: null,
        player_x: targetPosition.x,
        player_y: targetPosition.y,
        updated_at: now
      },
      {
        save_id: saveId,
        discovered_locations_json: JSON.stringify(revealedState.discoveredLocationIds),
        discovered_tiles_json: JSON.stringify(revealedState.discoveredTileKeys),
        updated_at: now
      }
    );
  }

  public moveInterior(saveId: string, x: number, y: number): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);

    if (!worldState) {
      throw new Error("World state not found.");
    }

    if ((worldState.current_screen !== "vault" && worldState.current_screen !== "location") || !worldState.current_map_id) {
      throw new Error("Interior movement is only available inside a vault or location.");
    }

    const interiorMap = getInteriorMap(content, worldState.current_map_id);
    const currentPosition =
      worldState.player_x !== null && worldState.player_y !== null
        ? { x: worldState.player_x, y: worldState.player_y }
        : getInteriorSpawnPoint(interiorMap);
    const targetPosition = { x, y };

    if (currentPosition.x === targetPosition.x && currentPosition.y === targetPosition.y) {
      return;
    }

    if (!canMoveInterior(currentPosition, targetPosition, interiorMap)) {
      throw new Error("Interior movement is limited to adjacent passable hexes.");
    }

    this.gameStateRepo.updateWorldState({
      ...worldState,
      player_x: targetPosition.x,
      player_y: targetPosition.y,
      updated_at: Date.now()
    });
  }

  public exitInterior(saveId: string, exitId: string): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);

    if (!worldState) {
      throw new Error("World state not found.");
    }

    if ((worldState.current_screen !== "vault" && worldState.current_screen !== "location") || !worldState.current_map_id) {
      throw new Error("There is no interior to exit.");
    }

    if (!worldState.current_location_id) {
      throw new Error("Current interior is not linked to an overworld location.");
    }

    const interiorMap = getInteriorMap(content, worldState.current_map_id);
    const exit = getInteriorExit(interiorMap, exitId);
    const currentPosition =
      worldState.player_x !== null && worldState.player_y !== null
        ? { x: worldState.player_x, y: worldState.player_y }
        : getInteriorSpawnPoint(interiorMap);

    if (currentPosition.x !== exit.x || currentPosition.y !== exit.y) {
      throw new Error("Move onto the exit tile before leaving the current area.");
    }

    const location = getInteriorLocation(content, worldState.current_location_id);

    this.restoreOverworldFromLocation(saveId, worldState, location);
  }

  private ensureExplorationState(saveId: string, worldState: WorldStateRow, mapDiscovery: MapDiscoveryRow) {
    const content = getGameContent();
    const region = getRegion(content, worldState.current_region_id);
    const regionLocations = getRegionLocations(content, region.id);
    const startingLocation = getStartingLocation(content, region, regionLocations);
    const overworldMap = getOverworldMap(content, region);
    const normalizedExploration = normalizeExplorationState(overworldMap, regionLocations, startingLocation, {
      playerX: worldState.player_x,
      playerY: worldState.player_y,
      discoveredLocationIdsJson: mapDiscovery.discovered_locations_json,
      discoveredTileKeysJson: mapDiscovery.discovered_tiles_json
    });

    if (!normalizedExploration.changed) {
      return {
        worldState,
        mapDiscovery,
        discoveredLocationIds: normalizedExploration.discoveredLocationIds,
        discoveredTileKeys: normalizedExploration.discoveredTileKeys
      };
    }

    const now = Date.now();
    const nextWorldState = {
      ...worldState,
      player_x: normalizedExploration.playerPosition.x,
      player_y: normalizedExploration.playerPosition.y,
      updated_at: now
    };
    const nextMapDiscovery = {
      ...mapDiscovery,
      discovered_locations_json: JSON.stringify(normalizedExploration.discoveredLocationIds),
      discovered_tiles_json: JSON.stringify(normalizedExploration.discoveredTileKeys),
      updated_at: now
    };

    this.gameStateRepo.updateExplorationState(nextWorldState, nextMapDiscovery);

    return {
      worldState: nextWorldState,
      mapDiscovery: nextMapDiscovery,
      discoveredLocationIds: normalizedExploration.discoveredLocationIds,
      discoveredTileKeys: normalizedExploration.discoveredTileKeys
    };
  }

  private restoreOverworldFromLocation(saveId: string, worldState: WorldStateRow, location: { regionId: string; position: { x: number; y: number } }) {
    const content = getGameContent();
    const region = getRegion(content, location.regionId);

    this.gameStateRepo.updateWorldState({
      ...worldState,
      current_screen: "overworld",
      current_location_id: null,
      current_map_id: region.mapId,
      current_panel: null,
      player_x: location.position.x,
      player_y: location.position.y,
      updated_at: Date.now()
    });

    const mapDiscovery = this.gameStateRepo.getMapDiscovery(saveId);

    if (!mapDiscovery) {
      return;
    }

    const regionLocations = getRegionLocations(content, region.id);
    const overworldMap = getOverworldMap(content, region);
    const revealedState = revealExploration(
      overworldMap,
      regionLocations,
      location.position,
      JSON.parse(mapDiscovery.discovered_locations_json) as string[],
      JSON.parse(mapDiscovery.discovered_tiles_json ?? "[]") as string[]
    );

    this.gameStateRepo.updateMapDiscovery({
      ...mapDiscovery,
      discovered_locations_json: JSON.stringify(revealedState.discoveredLocationIds),
      discovered_tiles_json: JSON.stringify(revealedState.discoveredTileKeys),
      updated_at: Date.now()
    });
  }
}
