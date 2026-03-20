import type Database from "better-sqlite3";

import { CompanionRepo } from "../repos/companion_repo.js";
import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (json === null || json === undefined) {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn("Failed to parse stored JSON, using fallback:", json.slice(0, 80));
    return fallback;
  }
}
import { SaveRepo } from "../repos/save_repo.js";
import { getGameContent } from "./content_service.js";
import { DialogueService } from "./dialogue_service.js";
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
  private readonly inventoryRepo: InventoryRepo;
  private readonly companionRepo: CompanionRepo;
  private readonly dialogueService: DialogueService;

  public constructor(db: Database.Database) {
    this.saveRepo = new SaveRepo(db);
    this.gameStateRepo = new GameStateRepo(db);
    this.inventoryRepo = new InventoryRepo(db);
    this.companionRepo = new CompanionRepo(db);
    this.dialogueService = new DialogueService(db);
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
    const isOnOverworld = worldState.current_screen === "overworld";
    const normalizedState =
      region && overworldMap && isOnOverworld
        ? this.ensureExplorationState(saveId, worldState, mapDiscovery)
        : {
            worldState,
            mapDiscovery,
            discoveredLocationIds: safeJsonParse<string[]>(mapDiscovery.discovered_locations_json, []),
            discoveredTileKeys: safeJsonParse<string[]>(mapDiscovery.discovered_tiles_json, [])
          };
    const currentLocation = worldState.current_location_id
      ? content.locations.find((candidate) => candidate.id === worldState.current_location_id) ?? null
      : null;
    const currentInteriorMap = worldState.current_map_id
      ? content.interiorMaps.find((candidate) => candidate.id === worldState.current_map_id) ?? null
      : null;

    const inventoryRows = this.inventoryRepo.getAll(saveId);
    const collectedItemIds = inventoryRows.map((row) => row.item_id);
    const collectedActionIds = safeJsonParse<string[]>(questState.collected_actions_json, []);
    const companionRows = this.companionRepo.getAll(saveId);

    return {
      save,
      playerCharacter: {
        name: playerCharacter.name,
        level: playerCharacter.level,
        archetype: playerCharacter.archetype,
        special: playerCharacter.special_json
          ? safeJsonParse<Record<string, number> | null>(playerCharacter.special_json, null)
          : null,
        karma: playerCharacter.karma ?? 0
      },
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
        active: safeJsonParse<string[]>(questState.active_quests_json, []),
        completed: safeJsonParse<string[]>(questState.completed_quests_json, []),
        definitions: content.quests
          .filter((q) => {
            const activeIds = safeJsonParse<string[]>(questState.active_quests_json, []);
            const completedIds = safeJsonParse<string[]>(questState.completed_quests_json, []);
            return activeIds.includes(q.id) || completedIds.includes(q.id);
          })
          .map((q) => ({
            id: q.id,
            name: q.name,
            description: q.description,
            objectives: q.objectives.map((o) => ({ id: o.id, description: o.description, type: o.type, target: o.target })),
            mapMarker: q.mapMarker ?? null
          }))
      },
      factionStanding: safeJsonParse<Record<string, number>>(factionStanding.standings_json, {}),
      inventory: inventoryRows.map((row) => ({
        id: row.item_id,
        label: row.label,
        ownedBy: row.owned_by,
        quantity: row.quantity,
        description: row.description ?? null
      })),
      collectedItemIds,
      collectedActionIds,
      companions: companionRows.map((row) => {
        const companionDef = content.companions.find((c) => c.id === row.companion_id);
        const currentStage = companionDef?.storyStages[row.story_stage];
        return {
          companionId: row.companion_id,
          name: companionDef?.name ?? row.companion_id,
          loyalty: row.loyalty,
          storyStage: row.story_stage,
          storyStageTitle: currentStage?.title ?? null,
          recruitedAt: row.recruited_at
        };
      }),
      locations: regionLocations.map((location) => ({
        ...location,
        discovered: normalizedState.discoveredLocationIds.includes(location.id),
        atPlayerPosition:
          normalizedState.worldState.player_x === location.position.x &&
          normalizedState.worldState.player_y === location.position.y
      }))
    };
  }

  public recordCollectedAction(saveId: string, actionId: string): void {
    const questState = this.gameStateRepo.getQuestState(saveId);
    if (!questState) return;

    const collected = safeJsonParse<string[]>(questState.collected_actions_json, []);
    if (!collected.includes(actionId)) {
      collected.push(actionId);
      this.gameStateRepo.updateQuestState({
        ...questState,
        collected_actions_json: JSON.stringify(collected),
        updated_at: Date.now()
      });
    }
  }

  public checkCompanionStoryProgression(saveId: string): { companionId: string; newStage: number; stageTitle: string; dialogueTreeId: string } | null {
    const content = getGameContent();
    const companions = this.companionRepo.getAll(saveId);
    const companion = companions[0];
    if (!companion) return null;

    const companionDef = content.companions.find((c) => c.id === companion.companion_id);
    if (!companionDef) return null;

    const nextStageIndex = companion.story_stage + 1;
    const nextStage = companionDef.storyStages[nextStageIndex];
    if (!nextStage) return null;

    const mapDiscovery = this.gameStateRepo.getMapDiscovery(saveId);
    const discoveredLocationIds = mapDiscovery
      ? safeJsonParse<string[]>(mapDiscovery.discovered_locations_json, [])
      : [];
    const playerCharacter = this.saveRepo.findPlayerCharacter(saveId);
    const karma = playerCharacter?.karma ?? 0;

    const trigger = nextStage.triggerCondition;
    let triggered = false;

    if (trigger.type === "immediate") {
      triggered = true;
    } else if (trigger.type === "locationsVisited" && trigger.count !== undefined) {
      triggered = discoveredLocationIds.length >= trigger.count;
    } else if (trigger.type === "karma") {
      if (trigger.min !== undefined && karma >= trigger.min) triggered = true;
      if (trigger.max !== undefined && karma <= trigger.max) triggered = true;
    }

    if (!triggered) return null;

    this.companionRepo.updateStoryStage(saveId, companion.companion_id, nextStageIndex);

    return {
      companionId: companion.companion_id,
      newStage: nextStageIndex,
      stageTitle: nextStage.title,
      dialogueTreeId: nextStage.dialogueTreeId
    };
  }

  public getCompanionStoryDialogue(saveId: string, companionId: string): { dialogue: { rootNodeId: string; nodes: Array<{ id: string; text: string; options: Array<{ id: string; label: string; response?: string; next?: string }> }> }; stageTitle: string } | null {
    const content = getGameContent();
    const companion = this.companionRepo.find(saveId, companionId);
    if (!companion || companion.departed) return null;

    const companionDef = content.companions.find((c) => c.id === companionId);
    if (!companionDef) return null;

    const currentStage = companionDef.storyStages[companion.story_stage];
    if (!currentStage) return null;

    const dialogueTree = companionDef.storyDialogues[currentStage.dialogueTreeId];
    if (!dialogueTree) return null;

    // Resolve effective root node via conditionalRoots (e.g. karma-based branching)
    let effectiveRootNodeId = dialogueTree.rootNodeId;
    if (dialogueTree.conditionalRoots && dialogueTree.conditionalRoots.length > 0) {
      const playerCharacter = this.saveRepo.findPlayerCharacter(saveId);
      const karma = playerCharacter?.karma ?? 0;
      const questState = this.gameStateRepo.getQuestState(saveId);
      const completed = safeJsonParse<string[]>(questState?.completed_quests_json, []);

      for (const condition of dialogueTree.conditionalRoots) {
        if (condition.questCompleted && completed.includes(condition.questCompleted)) {
          effectiveRootNodeId = condition.nodeId;
          break;
        }
        if (condition.karmaMin !== undefined && karma >= condition.karmaMin) {
          effectiveRootNodeId = condition.nodeId;
          break;
        }
      }
    }

    return {
      dialogue: { ...dialogueTree, rootNodeId: effectiveRootNodeId },
      stageTitle: currentStage.title
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

    // Check companion story progression when entering a location
    this.checkCompanionStoryProgression(saveId);
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

    // Reset NPC dialogue positions back to root when leaving an area
    this.dialogueService.resetAllDialoguePositions(saveId);

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

  public recruitCompanion(saveId: string, companionId: string): void {
    const content = getGameContent();
    const companion = content.companions.find((c) => c.id === companionId);
    if (!companion) {
      throw new Error("Unknown companion.");
    }

    const existing = this.companionRepo.find(saveId, companionId);
    if (existing && !existing.departed) {
      throw new Error("Companion is already recruited.");
    }
    if (existing && existing.departed) {
      throw new Error("This companion has departed and cannot be re-recruited.");
    }

    this.companionRepo.recruit(saveId, companionId);
  }

  public savePlayerSpecial(saveId: string, special: Record<string, number>): void {
    const existing = this.saveRepo.findPlayerCharacter(saveId);
    if (!existing) throw new Error("Player character not found.");
    if (existing.special_json !== null) throw new Error("Character has already been created.");
    this.saveRepo.updateSpecial(saveId, JSON.stringify(special));
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
      safeJsonParse<string[]>(mapDiscovery.discovered_locations_json, []),
      safeJsonParse<string[]>(mapDiscovery.discovered_tiles_json, [])
    );

    this.gameStateRepo.updateMapDiscovery({
      ...mapDiscovery,
      discovered_locations_json: JSON.stringify(revealedState.discoveredLocationIds),
      discovered_tiles_json: JSON.stringify(revealedState.discoveredTileKeys),
      updated_at: Date.now()
    });
  }
}
