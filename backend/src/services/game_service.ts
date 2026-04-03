import { computeAllSkillValues, getSkillPointCost, SKILL_DEFINITIONS, SKILL_IDS, computeSkillValue } from "../../../game/src/skills.js";
import { bestStepToward, buildExplorationRoute, buildPassableSet, findPath, hexDistance, hexNeighbors, toTileKey, type CombatAlly, type CombatNpc, type CompanionDefinition, type CompanionGoal, type HexPoint, type InteriorMapDefinition } from "../../../game/src/index.js";
import { withTransaction } from "../db/connection.js";
import { CompanionRepo } from "../repos/companion_repo.js";
import { CombatRepo } from "../repos/combat_repo.js";
import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";
import { MapLootRepo } from "../repos/map_loot_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import type { MapDiscoveryRow, PlayerCharacterRow, QuestStateRow, WorldStateRow } from "../shared/types.js";
import { CombatService } from "./combat_service.js";
import { getGameContent } from "./content_service.js";
import { DialogueService } from "./dialogue_service.js";
import {
  getOverworldMap,
  getRegion,
  getRegionLocations,
  getStartingLocation,
  normalizeExplorationState,
  revealExploration
} from "./exploration_state.js";
import {
  getInteriorExit,
  getInteriorLocation,
  getInteriorMap,
  getInteriorSpawnPoint,
  getInteriorTile,
  isPassableInteriorTile
} from "./interior_state.js";

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

export class GameService {
  private readonly saveRepo = new SaveRepo();
  private readonly gameStateRepo = new GameStateRepo();
  private readonly inventoryRepo = new InventoryRepo();
  private readonly companionRepo = new CompanionRepo();
  private readonly combatRepo = new CombatRepo();
  private readonly mapLootRepo = new MapLootRepo();
  private readonly dialogueService = new DialogueService();

  constructor(private readonly combatService: CombatService = new CombatService()) {}

  public async getState(saveId: string) {
    const content = getGameContent();
    const save = await this.saveRepo.findById(saveId);
    const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
    const worldState = await this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);
    const questState = await this.gameStateRepo.getQuestState(saveId);
    const factionStanding = await this.gameStateRepo.getFactionStanding(saveId);

    if (!save || !playerCharacter || !worldState || !mapDiscovery || !questState || !factionStanding) {
      throw new Error("Save state is incomplete.");
    }

    const region = content.regions.find((candidate) => candidate.id === worldState.current_region_id) ?? null;
    const regionLocations = region ? getRegionLocations(content, region.id) : [];
    const overworldMap = region ? getOverworldMap(content, region) : null;
    const isOnOverworld = worldState.current_screen === "overworld";
    const enteredLocationIds = safeJsonParse<string[]>(mapDiscovery.entered_locations_json, []);
    const normalizedState =
      region && overworldMap && isOnOverworld
        ? await this.ensureExplorationState(saveId, worldState, mapDiscovery)
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

    const inventoryRows = await this.inventoryRepo.getAll(saveId);
    const collectedItemIds = inventoryRows.map((row) => row.item_id);
    const collectedActionIds = safeJsonParse<string[]>(questState.collected_actions_json, []);
    const companionRows = await this.companionRepo.getAll(saveId);
    const combatStateRow = await this.combatRepo.get(saveId);
    const mapLootRows = worldState.current_map_id
      ? await this.mapLootRepo.getForMap(saveId, worldState.current_map_id)
      : [];
    const questStateView = this.buildQuestStateView(
      questState,
      collectedItemIds,
      enteredLocationIds,
      normalizedState.discoveredLocationIds
    );

    return {
      save,
      playerCharacter: this.buildPlayerCharacterView(playerCharacter, questState),
      worldState: normalizedState.worldState,
      region,
      overworldMap,
      currentLocation,
      currentInteriorMap,
      mapDiscovery: {
        discoveredLocationIds: normalizedState.discoveredLocationIds,
        discoveredTileKeys: normalizedState.discoveredTileKeys
      },
      questState: questStateView,
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
        const posValid = row.companion_map_id === worldState.current_map_id;
        return {
          companionId: row.companion_id,
          name: companionDef?.name ?? row.companion_id,
          tokenColor: companionDef?.tokenColor ?? null,
          loyalty: row.loyalty,
          storyStage: row.story_stage,
          storyStageTitle: currentStage?.title ?? null,
          hasNewStory: row.story_stage > row.story_stage_viewed,
          recruitedAt: row.recruited_at,
          x: posValid ? row.companion_x : null,
          y: posValid ? row.companion_y : null
        };
      }),
      locations: regionLocations.map((location) => ({
        ...location,
        discovered: normalizedState.discoveredLocationIds.includes(location.id),
        atPlayerPosition:
          normalizedState.worldState.player_x === location.position.x &&
          normalizedState.worldState.player_y === location.position.y
      })),
      weaponCatalog: content.weapons.map((w) => ({
        id: w.id,
        name: w.name,
        category: w.category,
        damage: w.damage,
        damageType: w.damageType,
        weight: w.weight,
        value: w.value,
        rarity: w.rarity,
        description: w.description,
        range: w.range,
        ammoType: w.ammoType ?? null
      })),
      combatState: combatStateRow
        ? {
            active: true,
            mapId: combatStateRow.map_id,
            turnNumber: combatStateRow.turn_number,
            activeTurn: combatStateRow.active_turn,
            npcs: safeJsonParse<CombatNpc[]>(combatStateRow.npcs_json, []),
            allies: safeJsonParse<CombatAlly[]>(combatStateRow.allies_json, [])
          }
        : null,
      mapLoot: mapLootRows.map((row) => ({
        id: row.id,
        itemId: row.item_id,
        label: row.label,
        x: row.x,
        y: row.y
      }))
    };
  }

  public async recordCollectedAction(saveId: string, actionId: string): Promise<void> {
    const questState = await this.gameStateRepo.getQuestState(saveId);
    if (!questState) return;

    const collected = safeJsonParse<string[]>(questState.collected_actions_json, []);
    if (!collected.includes(actionId)) {
      collected.push(actionId);
      await this.gameStateRepo.updateQuestState({
        ...questState,
        collected_actions_json: JSON.stringify(collected),
        updated_at: Date.now()
      });
    }
  }

  public async checkCompanionStoryProgression(
    saveId: string
  ): Promise<{ companionId: string; newStage: number; stageTitle: string; dialogueTreeId: string } | null> {
    const content = getGameContent();
    const companions = await this.companionRepo.getAll(saveId);

    const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);
    const discoveredLocationIds = mapDiscovery
      ? safeJsonParse<string[]>(mapDiscovery.discovered_locations_json, [])
      : [];
    const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
    const karma = playerCharacter?.karma ?? 0;

    for (const companion of companions) {
      const companionDef = content.companions.find((c) => c.id === companion.companion_id);
      if (!companionDef) continue;

      const nextStageIndex = companion.story_stage + 1;
      const nextStage = companionDef.storyStages[nextStageIndex];
      if (!nextStage) continue;

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

      if (!triggered) continue;

      await this.companionRepo.updateStoryStage(saveId, companion.companion_id, nextStageIndex);

      return {
        companionId: companion.companion_id,
        newStage: nextStageIndex,
        stageTitle: nextStage.title,
        dialogueTreeId: nextStage.dialogueTreeId
      };
    }

    return null;
  }

  public async respondToConclusion(
    saveId: string,
    companionId: string,
    accepted: boolean
  ): Promise<{ loyaltyDelta: number; newLoyalty: number; questStarted: string | null }> {
    const companion = await this.companionRepo.find(saveId, companionId);
    if (!companion) {
      throw new Error("Companion not found.");
    }
    if (!companion.conclusion_triggered) {
      throw new Error("Conclusion has not been triggered for this companion.");
    }
    if (companion.conclusion_accepted !== null) {
      throw new Error("Conclusion response has already been recorded.");
    }

    await this.companionRepo.setConclusionAccepted(saveId, companionId, accepted);

    const content = getGameContent();
    const companionDef = content.companions.find((c) => c.id === companionId);

    let loyaltyDelta: number;
    let questStarted: string | null = null;

    if (accepted) {
      loyaltyDelta = 15;
      questStarted = companionDef?.conclusionQuestId ?? null;
      // Start the conclusion quest
      if (questStarted) {
        const questState = await this.gameStateRepo.getQuestState(saveId);
        if (questState) {
          const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
          if (!activeQuests.includes(questStarted)) {
            activeQuests.push(questStarted);
            await this.gameStateRepo.updateQuestState({
              ...questState,
              active_quests_json: JSON.stringify(activeQuests),
              updated_at: Date.now()
            });
          }
        }
      }
    } else {
      loyaltyDelta = -5;
    }

    const newLoyalty = Math.max(0, Math.min(100, companion.loyalty + loyaltyDelta));
    await this.companionRepo.updateLoyalty(saveId, companionId, newLoyalty);

    return { loyaltyDelta, newLoyalty, questStarted };
  }

  public async getCompanionStoryDialogue(
    saveId: string,
    companionId: string
  ): Promise<{
    dialogue: {
      rootNodeId: string;
      nodes: Array<{ id: string; text: string; options: Array<{ id: string; label: string; response?: string; next?: string }> }>;
    };
    stageTitle: string;
  } | null> {
    const content = getGameContent();
    const companion = await this.companionRepo.find(saveId, companionId);
    if (!companion || companion.departed) return null;

    const companionDef = content.companions.find((c) => c.id === companionId);
    if (!companionDef) return null;

    const currentStage = companionDef.storyStages[companion.story_stage];
    if (!currentStage) return null;

    const dialogueTree = companionDef.storyDialogues[currentStage.dialogueTreeId];
    if (!dialogueTree) return null;

    let effectiveRootNodeId = dialogueTree.rootNodeId;
    if (dialogueTree.conditionalRoots && dialogueTree.conditionalRoots.length > 0) {
      const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
      const karma = playerCharacter?.karma ?? 0;
      const questState = await this.gameStateRepo.getQuestState(saveId);
      const completed = safeJsonParse<string[]>(questState?.completed_quests_json, []);
      const failed = safeJsonParse<string[]>(questState?.failed_quests_json, []);
      const factionStanding = await this.gameStateRepo.getFactionStanding(saveId);
      const standings = safeJsonParse<Record<string, number>>(factionStanding?.standings_json, {});

      for (const condition of dialogueTree.conditionalRoots) {
        if (condition.questCompleted && completed.includes(condition.questCompleted)) {
          effectiveRootNodeId = condition.nodeId;
          break;
        }
        if (condition.questFailed && failed.includes(condition.questFailed)) {
          effectiveRootNodeId = condition.nodeId;
          break;
        }
        if (condition.karmaMin !== undefined && karma >= condition.karmaMin) {
          effectiveRootNodeId = condition.nodeId;
          break;
        }
        if (condition.factionMin && (standings[condition.factionMin.factionId] ?? 0) >= condition.factionMin.min) {
          effectiveRootNodeId = condition.nodeId;
          break;
        }
      }
    }

    if (companion.story_stage_viewed < companion.story_stage) {
      await this.companionRepo.markStoryStageViewed(saveId, companionId, companion.story_stage);
    }

    return {
      dialogue: { ...dialogueTree, rootNodeId: effectiveRootNodeId },
      stageTitle: currentStage.title
    };
  }

  public async updateScreen(saveId: string, screen: "overworld" | "vault"): Promise<void> {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);
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

    await this.gameStateRepo.updateWorldState({
      ...worldState,
      current_screen: screen,
      current_location_id: screen === "overworld" ? null : vaultLocation?.id ?? null,
      current_map_id: screen === "overworld" ? region.mapId : vaultLocation?.interiorMapId ?? null,
      current_panel: screen === "vault" ? "vault" : null,
      player_x: nextPlayerPosition.x,
      player_y: nextPlayerPosition.y,
      updated_at: Date.now()
    });

    // Place all companions near vault spawn point when entering vault
    if (screen === "vault" && vaultLocation?.interiorMapId && vaultSpawnPoint) {
      const vaultInterior = getInteriorMap(content, vaultLocation.interiorMapId);
      const companions = await this.companionRepo.getAll(saveId);
      const occupied = new Set<string>();
      for (const companion of companions) {
        const pos = this.findAdjacentPassableHexExcluding(vaultSpawnPoint, buildPassableSet(vaultInterior), occupied);
        if (pos) {
          occupied.add(toTileKey(pos));
          await this.companionRepo.setPosition(saveId, companion.companion_id, pos.x, pos.y, vaultLocation.interiorMapId);
        }
      }
    }
  }

  public async enterLocation(saveId: string, locationId: string): Promise<ConclusionInitiation | null> {
    let conclusionInitiation: ConclusionInitiation | null = null;

    await withTransaction(async () => {
      const content = getGameContent();
      const worldState = await this.gameStateRepo.getWorldState(saveId);
      const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);

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
      const now = Date.now();

      await this.gameStateRepo.updateWorldState({
        ...worldState,
        current_screen: "location",
        current_location_id: location.id,
        current_map_id: location.interiorMapId,
        current_panel: "location",
        player_x: spawnPoint.x,
        player_y: spawnPoint.y,
        updated_at: now
      });

      const enteredLocations = safeJsonParse<string[]>(mapDiscovery.entered_locations_json, []);
      if (!enteredLocations.includes(location.id)) {
        enteredLocations.push(location.id);
        await this.gameStateRepo.updateMapDiscovery({
          ...mapDiscovery,
          entered_locations_json: JSON.stringify(enteredLocations),
          updated_at: now
        });
      }

      // Place all companions near spawn point and activate goal if eligible
      const interiorMap = getInteriorMap(content, location.interiorMapId);
      const companions = await this.companionRepo.getAll(saveId);
      if (companions.length > 0) {
        const passableSet = buildPassableSet(interiorMap);
        const occupied = new Set<string>();
        for (const companion of companions) {
          const pos = this.findAdjacentPassableHexExcluding(spawnPoint, passableSet, occupied);
          if (pos) {
            occupied.add(toTileKey(pos));
            await this.companionRepo.setPosition(saveId, companion.companion_id, pos.x, pos.y, location.interiorMapId);
          }
        }

        const companion = companions[0]!;
        const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
        await this.activateEligibleGoal(saveId, companion, interiorMap, location.id, playerCharacter?.karma ?? 0, content);

        // Check for conclusion initiation: all evidence goals complete, not yet triggered (or previously declined)
        const companionDef = content.companions.find((c) => c.id === companion.companion_id);
        const conclusionGoalIds = companionDef?.conclusionGoals ?? [];
        if (conclusionGoalIds.length > 0 && (!companion.conclusion_triggered || companion.conclusion_accepted === 0)) {
          const allComplete = await this.areAllEvidenceGoalsComplete(
            saveId, companion.companion_id, conclusionGoalIds
          );
          if (allComplete) {
            await this.companionRepo.setConclusionTriggered(saveId, companion.companion_id);
            await this.companionRepo.resetConclusionAccepted(saveId, companion.companion_id);
            const dialogueTreeId = "conclusion_initiation";
            const tree = companionDef?.storyDialogues[dialogueTreeId];
            if (tree) {
              conclusionInitiation = {
                companionId: companion.companion_id,
                companionName: companionDef?.name ?? companion.companion_id,
                dialogueTreeId,
                dialogueTree: {
                  rootNodeId: tree.rootNodeId,
                  nodes: tree.nodes.map((n) => ({
                    id: n.id,
                    text: n.text,
                    options: n.options.map((o) => ({
                      id: o.id,
                      label: o.label,
                      response: o.response,
                      next: o.next
                    }))
                  }))
                }
              };
            }
          }
        }

        // Check for quest resolution dialogue: conclusion quest completed, not yet shown
        if (!conclusionInitiation && companion.conclusion_accepted === 1 && !companion.quest_resolution_shown) {
          const questState = await this.gameStateRepo.getQuestState(saveId);
          const completedQuests = safeJsonParse<string[]>(questState?.completed_quests_json, []);
          const conclusionQuestId = companionDef?.conclusionQuestId;
          if (conclusionQuestId && completedQuests.includes(conclusionQuestId) && companionDef) {
            const dialogueTreeId = "quest_resolution";
            const tree = companionDef.storyDialogues[dialogueTreeId];
            if (tree) {
              await this.companionRepo.markQuestResolutionShown(saveId, companion.companion_id);
              conclusionInitiation = {
                companionId: companion.companion_id,
                companionName: companionDef.name ?? companion.companion_id,
                dialogueTreeId,
                dialogueTree: {
                  rootNodeId: tree.rootNodeId,
                  nodes: tree.nodes.map((n) => ({
                    id: n.id,
                    text: n.text,
                    options: n.options.map((o) => ({
                      id: o.id,
                      label: o.label,
                      response: o.response,
                      next: o.next
                    }))
                  }))
                }
              };
            }
          }
        }
      }

      await this.checkCompanionStoryProgression(saveId);
    });

    await this.combatService.enterCombat(saveId);
    return conclusionInitiation;
  }

  public async travel(saveId: string, x: number, y: number) {
    const steps = await withTransaction(async () => {
      const content = getGameContent();
      const worldState = await this.gameStateRepo.getWorldState(saveId);
      const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);

      if (!worldState || !mapDiscovery) {
        throw new Error("World state not found.");
      }

      const region = getRegion(content, worldState.current_region_id);
      const regionLocations = getRegionLocations(content, region.id);
      const startingLocation = getStartingLocation(content, region, regionLocations);
      const overworldMap = getOverworldMap(content, region);
      if (worldState.current_screen !== "overworld") {
        throw new Error("Travel is only available on the overworld.");
      }

      const normalizedExploration = normalizeExplorationState(overworldMap, regionLocations, startingLocation, {
        playerX: worldState.player_x,
        playerY: worldState.player_y,
        discoveredLocationIdsJson: mapDiscovery.discovered_locations_json,
        discoveredTileKeysJson: mapDiscovery.discovered_tiles_json
      });
      const targetPosition = { x, y };
      const route = buildExplorationRoute(
        normalizedExploration.playerPosition,
        targetPosition,
        normalizedExploration.discoveredTileKeys,
        overworldMap.width,
        overworldMap.height,
        MAX_OVERWORLD_FOG_STEPS
      );

      if (!route) {
        throw new Error("That destination cannot be reached.");
      }

      let currentPosition = normalizedExploration.playerPosition;
      let discoveredLocationIds = normalizedExploration.discoveredLocationIds;
      let discoveredTileKeys = normalizedExploration.discoveredTileKeys;
      const replaySteps: OverworldReplayStep[] = [];

      for (const step of route.steps) {
        const previousDiscoveredTiles = new Set(discoveredTileKeys);
        const previousDiscoveredLocations = new Set(discoveredLocationIds);
        const revealedState = revealExploration(
          overworldMap,
          regionLocations,
          step,
          discoveredLocationIds,
          discoveredTileKeys
        );

        replaySteps.push({
          position: step,
          revealedTileKeys: revealedState.discoveredTileKeys.filter((tileKey) => !previousDiscoveredTiles.has(tileKey)),
          discoveredLocationIds: revealedState.discoveredLocationIds.filter((locationId) => !previousDiscoveredLocations.has(locationId))
        });

        currentPosition = step;
        discoveredLocationIds = revealedState.discoveredLocationIds;
        discoveredTileKeys = revealedState.discoveredTileKeys;
      }

      const now = Date.now();

      await this.gameStateRepo.updateExplorationState(
        {
          ...worldState,
          current_screen: "overworld",
          current_location_id: null,
          current_map_id: region.mapId,
          current_panel: null,
          player_x: currentPosition.x,
          player_y: currentPosition.y,
          updated_at: now
        },
        {
          save_id: saveId,
          discovered_locations_json: JSON.stringify(discoveredLocationIds),
          discovered_tiles_json: JSON.stringify(discoveredTileKeys),
          entered_locations_json: mapDiscovery.entered_locations_json,
          updated_at: now
        }
      );

      const newLocationCount = discoveredLocationIds.length - normalizedExploration.discoveredLocationIds.length;

      if (newLocationCount > 0) {
        await this.saveRepo.awardXp(saveId, newLocationCount * 20);
      }

      return replaySteps;
    });

    return {
      steps,
      finalPatch: await this.getTravelRouteFinalPatch(saveId)
    };
  }

  public async moveInterior(saveId: string, x: number, y: number) {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);

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

    const passableSet = buildPassableSet(interiorMap);

    const route = findPath(currentPosition, targetPosition, passableSet);

    if (!route) {
      throw new Error("Interior movement is limited to reachable passable tiles.");
    }

    const finalPosition = route[route.length - 1] ?? currentPosition;
    const nextWorldState = {
      ...worldState,
      player_x: finalPosition.x,
      player_y: finalPosition.y,
      updated_at: Date.now()
    };

    await this.gameStateRepo.updateWorldState(nextWorldState);

    // Companion loose-follow step
    const companionStep = await this.runCompanionFollowStep(
      saveId, currentPosition, finalPosition, passableSet, interiorMap, worldState.current_location_id
    );

    // Check if player can help companion with active goal
    const companionHelpAvailable = await this.checkCompanionHelpAvailable(
      saveId, finalPosition, interiorMap, worldState.current_location_id
    );

    return {
      steps: route.map((position) => ({ position })),
      companionStep,
      companionHelpAvailable,
      goalCompleted: companionStep?.goalCompleted ?? null,
      finalPatch: {
        worldState: nextWorldState
      }
    };
  }

  public async exitInterior(saveId: string, exitId: string): Promise<void> {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);

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

    const dx = Math.abs(currentPosition.x - exit.x);
    const dy = Math.abs(currentPosition.y - exit.y);
    if (dx > 1 || dy > 1) {
      throw new Error("Move closer to the exit before leaving the current area.");
    }

    const location = getInteriorLocation(content, worldState.current_location_id);

    // Clear companion interior position when leaving
    const companions = await this.companionRepo.getAll(saveId);
    for (const companion of companions) {
      await this.companionRepo.clearPosition(saveId, companion.companion_id);
    }

    await this.dialogueService.resetAllDialoguePositions(saveId);
    await this.restoreOverworldFromLocation(saveId, worldState, location);
  }

  private async ensureExplorationState(saveId: string, worldState: WorldStateRow, mapDiscovery: MapDiscoveryRow) {
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

    await this.gameStateRepo.updateExplorationState(nextWorldState, nextMapDiscovery);

    return {
      worldState: nextWorldState,
      mapDiscovery: nextMapDiscovery,
      discoveredLocationIds: normalizedExploration.discoveredLocationIds,
      discoveredTileKeys: normalizedExploration.discoveredTileKeys
    };
  }

  private buildPlayerCharacterView(playerCharacter: PlayerCharacterRow, questState: QuestStateRow) {
    return {
      name: playerCharacter.name,
      level: playerCharacter.level,
      xp: playerCharacter.xp ?? 0,
      archetype: playerCharacter.archetype,
      special: playerCharacter.special_json
        ? safeJsonParse<Record<string, number> | null>(playerCharacter.special_json, null)
        : null,
      karma: playerCharacter.karma ?? 0,
      hp: playerCharacter.hp ?? 0,
      maxHp: playerCharacter.max_hp ?? 0,
      equippedWeaponId: playerCharacter.equipped_weapon_id ?? null,
      skills: playerCharacter.special_json
        ? (() => {
            const special = safeJsonParse<Record<string, number>>(playerCharacter.special_json, {});
            const allocated = safeJsonParse<Record<string, number>>(playerCharacter.skills_json, {});
            const tagged = safeJsonParse<string[]>(playerCharacter.tagged_skills_json, []);
            const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);

            return {
              values: computeAllSkillValues(special, allocated),
              allocated,
              tagged,
              unspentPoints: playerCharacter.unspent_skill_points ?? 0,
              needsTagSelection: tagged.length === 0 && completedQuests.includes("see_doc_mitchell")
            };
          })()
        : null
    };
  }

  private buildQuestStateView(
    questState: QuestStateRow,
    collectedItemIds: string[],
    enteredLocationIds: string[],
    discoveredLocationIds: string[]
  ) {
    const content = getGameContent();
    const activeIds = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedIds = safeJsonParse<string[]>(questState.completed_quests_json, []);
    const failedIds = safeJsonParse<string[]>(questState.failed_quests_json, []);

    return {
      active: activeIds,
      completed: completedIds,
      failed: failedIds,
      definitions: content.quests
        .filter((quest) => activeIds.includes(quest.id) || completedIds.includes(quest.id) || failedIds.includes(quest.id))
        .map((quest) => {
          const isQuestCompleted = completedIds.includes(quest.id);
          const rawObjectives = quest.objectives.map((objective) => {
            let completed = false;
            if (isQuestCompleted) {
              completed = true;
            } else if (objective.type === "fetch") {
              completed = collectedItemIds.includes(objective.target);
            } else if (objective.type === "visit") {
              completed = enteredLocationIds.includes(objective.target);
            } else if (objective.type === "kill") {
              completed = discoveredLocationIds.includes(objective.target);
            }

            return {
              id: objective.id,
              description: objective.description,
              type: objective.type,
              target: objective.target,
              locationId: objective.locationId,
              completed,
              hidden: objective.hidden ?? false
            };
          });
          const objectives = rawObjectives
            .filter((objective, index) => {
              if (!objective.hidden) return true;
              if (objective.completed) return true;
              if (index > 0 && rawObjectives[index - 1]!.completed) return true;
              return false;
            })
            .map(({ hidden: _hidden, ...objective }) => objective);
          const nextObjective = objectives.find((objective) => !objective.completed);
          const activeMapMarker = nextObjective?.locationId
            ? { locationId: nextObjective.locationId, label: nextObjective.description }
            : quest.mapMarker ?? null;

          return {
            id: quest.id,
            name: quest.name,
            description: quest.description,
            objectives,
            mapMarker: quest.mapMarker ?? null,
            activeMapMarker
          };
        })
    };
  }

  private async getTravelRouteFinalPatch(saveId: string) {
    const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
    const worldState = await this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);
    const questState = await this.gameStateRepo.getQuestState(saveId);

    if (!playerCharacter || !worldState || !mapDiscovery || !questState) {
      throw new Error("Save state is incomplete.");
    }

    const normalizedState = await this.ensureExplorationState(saveId, worldState, mapDiscovery);
    const inventoryRows = await this.inventoryRepo.getAll(saveId);
    const collectedItemIds = inventoryRows.map((row) => row.item_id);
    const enteredLocationIds = safeJsonParse<string[]>(normalizedState.mapDiscovery.entered_locations_json, []);

    return {
      playerCharacter: this.buildPlayerCharacterView(playerCharacter, questState),
      worldState: normalizedState.worldState,
      mapDiscovery: {
        discoveredLocationIds: normalizedState.discoveredLocationIds,
        discoveredTileKeys: normalizedState.discoveredTileKeys
      },
      questState: this.buildQuestStateView(
        questState,
        collectedItemIds,
        enteredLocationIds,
        normalizedState.discoveredLocationIds
      ),
      currentLocation: null,
      currentInteriorMap: null
    };
  }

  public async recruitCompanion(saveId: string, companionId: string): Promise<void> {
    const content = getGameContent();
    const companion = content.companions.find((c) => c.id === companionId);
    if (!companion) {
      throw new Error("Unknown companion.");
    }

    const existing = await this.companionRepo.find(saveId, companionId);
    if (existing && !existing.departed) {
      throw new Error("Companion is already recruited.");
    }

    if (existing && existing.departed) {
      throw new Error("This companion has departed and cannot be re-recruited.");
    }

    const spawnPosition = await this.findCompanionSpawnPosition(saveId);
    await this.companionRepo.recruit(saveId, companionId, spawnPosition ?? undefined);
  }

  private async findCompanionSpawnPosition(saveId: string): Promise<{ x: number; y: number } | null> {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);
    if (!worldState?.current_map_id || worldState.player_x === null || worldState.player_y === null) {
      return null;
    }

    const interiorMap = content.interiorMaps.find((m) => m.id === worldState.current_map_id);
    if (!interiorMap) return null;

    const playerPos = { x: worldState.player_x, y: worldState.player_y };
    return this.findAdjacentPassableHex(playerPos, interiorMap);
  }

  public async savePlayerSpecial(saveId: string, special: Record<string, number>): Promise<{ questCompleted?: string }> {
    return withTransaction(async () => {
      const existing = await this.saveRepo.findPlayerCharacter(saveId);
      if (!existing) throw new Error("Player character not found.");
      if (existing.special_json !== null) throw new Error("Character has already been created.");

      await this.saveRepo.updateSpecial(saveId, JSON.stringify(special));

      const initialSkillPoints = 5 + 2 * (special.int ?? 5);
      await this.saveRepo.awardSkillPoints(saveId, initialSkillPoints);

      const questState = await this.gameStateRepo.getQuestState(saveId);
      let questCompleted: string | undefined;
      if (questState) {
        const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
        if (activeQuests.includes("see_doc_mitchell")) {
          const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);
          const nextActive = activeQuests.filter((id) => id !== "see_doc_mitchell");
          completedQuests.push("see_doc_mitchell");
          await this.gameStateRepo.updateQuestState({
            ...questState,
            active_quests_json: JSON.stringify(nextActive),
            completed_quests_json: JSON.stringify(completedQuests),
            updated_at: Date.now()
          });

          await this.saveRepo.awardXp(saveId, 75);
          const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
          if (playerCharacter) {
            await this.saveRepo.updateKarma(saveId, playerCharacter.karma + 5);
          }

          questCompleted = "Get Your Head Checked";
        }
      }

      return { questCompleted };
    });
  }
  private async restoreOverworldFromLocation(
    saveId: string,
    worldState: WorldStateRow,
    location: { regionId: string; position: { x: number; y: number } }
  ): Promise<void> {
    const content = getGameContent();
    const region = getRegion(content, location.regionId);

    await this.gameStateRepo.updateWorldState({
      ...worldState,
      current_screen: "overworld",
      current_location_id: null,
      current_map_id: region.mapId,
      current_panel: null,
      player_x: location.position.x,
      player_y: location.position.y,
      updated_at: Date.now()
    });

    const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);

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

    await this.gameStateRepo.updateMapDiscovery({
      ...mapDiscovery,
      discovered_locations_json: JSON.stringify(revealedState.discoveredLocationIds),
      discovered_tiles_json: JSON.stringify(revealedState.discoveredTileKeys),
      entered_locations_json: mapDiscovery.entered_locations_json,
      updated_at: Date.now()
    });
  }

  public async setTaggedSkills(saveId: string, skillIds: string[]): Promise<void> {
    await withTransaction(async () => {
      if (skillIds.length !== 3) {
        throw new Error("You must choose exactly 3 tagged skills.");
      }

      const uniqueIds = new Set(skillIds);
      if (uniqueIds.size !== 3) {
        throw new Error("Tagged skills must be unique.");
      }

      for (const id of skillIds) {
        if (!SKILL_IDS.includes(id)) {
          throw new Error(`Unknown skill: ${id}`);
        }
      }

      const pc = await this.saveRepo.findPlayerCharacter(saveId);
      if (!pc) throw new Error("Player character not found.");
      if (pc.tagged_skills_json !== null) {
        throw new Error("Tagged skills have already been chosen.");
      }

      await this.saveRepo.setTaggedSkills(saveId, JSON.stringify(skillIds));
    });
  }

  public async allocateSkillPoints(saveId: string, allocations: Record<string, number>): Promise<void> {
    await withTransaction(async () => {
      const pc = await this.saveRepo.findPlayerCharacter(saveId);
      if (!pc) throw new Error("Player character not found.");
      if (!pc.special_json) throw new Error("Character creation not complete.");

      const special = safeJsonParse<Record<string, number>>(pc.special_json, {});
      const currentAllocated = safeJsonParse<Record<string, number>>(pc.skills_json, {});
      const taggedSkills = safeJsonParse<string[]>(pc.tagged_skills_json, []);
      let remaining = pc.unspent_skill_points ?? 0;

      const newAllocated = { ...currentAllocated };

      for (const [skillId, points] of Object.entries(allocations)) {
        if (points <= 0) continue;
        if (!SKILL_IDS.includes(skillId)) {
          throw new Error(`Unknown skill: ${skillId}`);
        }

        const def = SKILL_DEFINITIONS.find((s) => s.id === skillId)!;
        const isTagged = taggedSkills.includes(skillId);
        const baseValue = def.initialValue(special);
        let currentTotal = baseValue + (newAllocated[skillId] ?? 0);

        for (let i = 0; i < points; i += 1) {
          const cost = getSkillPointCost(currentTotal);
          if (remaining < cost) {
            throw new Error(`Not enough skill points to raise ${def.name}.`);
          }
          remaining -= cost;
          const gain = isTagged ? 2 : 1;
          newAllocated[skillId] = (newAllocated[skillId] ?? 0) + gain;
          currentTotal += gain;
        }
      }

      await this.saveRepo.updateSkills(saveId, JSON.stringify(newAllocated), remaining);
    });
  }

  private async checkCompanionHelpAvailable(
    saveId: string,
    playerPos: HexPoint,
    interiorMap: InteriorMapDefinition,
    locationId: string | null
  ): Promise<{ companionId: string; goalId: string } | null> {
    const companions = await this.companionRepo.getAll(saveId);
    const content = getGameContent();

    for (const companion of companions) {
      if (!companion.active_goal_id) continue;
      if (companion.companion_x === null || companion.companion_y === null) continue;

      const companionDef = content.companions.find((c) => c.id === companion.companion_id);
      const goal = companionDef?.goals?.find((g) => g.id === companion.active_goal_id);
      if (!goal?.playerCanHelp) continue;

      const goalTile = this.findGoalTile(goal, interiorMap, locationId ?? "");
      if (!goalTile) continue;

      const companionPos = { x: companion.companion_x, y: companion.companion_y };
      if (toTileKey(companionPos) !== toTileKey(goalTile)) continue;

      const dist = hexDistance(playerPos, companionPos);
      if (dist > 1) continue;

      return { companionId: companion.companion_id, goalId: goal.id };
    }

    return null;
  }

  public async helpCompanionGoal(saveId: string, companionId: string): Promise<GoalCompletionResult | null> {
    const companion = await this.companionRepo.find(saveId, companionId);
    if (!companion || !companion.active_goal_id) {
      throw new Error("Companion does not have an active goal.");
    }

    const content = getGameContent();
    const companionDef = content.companions.find((c) => c.id === companion.companion_id);
    const goal = companionDef?.goals?.find((g) => g.id === companion.active_goal_id);
    if (!goal?.playerCanHelp) {
      throw new Error("This goal does not support player help.");
    }

    // Fire the goal completion with a loyalty bonus
    const result = await this.fireGoalCompletion(saveId, companion);

    // Grant loyalty bonus for helping
    if (result) {
      const newLoyalty = Math.min(100, companion.loyalty + 5);
      await this.companionRepo.updateLoyalty(saveId, companionId, newLoyalty);
    }

    return result;
  }

  /** Check if all evidence-chain goals are completed for a companion. */
  public async areAllEvidenceGoalsComplete(
    saveId: string,
    companionId: string,
    evidenceGoalIds: string[]
  ): Promise<boolean> {
    const completedGoals = await this.companionRepo.getCompletedGoals(saveId, companionId);
    return evidenceGoalIds.every((id) => completedGoals.includes(id));
  }

  private async activateEligibleGoal(
    saveId: string,
    companion: import("../shared/types.js").CompanionInstanceRow,
    interiorMap: InteriorMapDefinition,
    locationId: string,
    karma: number,
    content: ReturnType<typeof getGameContent>
  ): Promise<void> {
    // Skip if companion already has an active goal
    if (companion.active_goal_id) return;

    const companionDef = content.companions.find((c) => c.id === companion.companion_id);
    if (!companionDef?.goals?.length) return;

    const completedGoals = await this.companionRepo.getCompletedGoals(saveId, companion.companion_id);

    for (const goal of companionDef.goals) {
      // Check if already completed (for "once" frequency)
      if (goal.frequency === "once" && completedGoals.includes(goal.id)) continue;

      // Check trigger conditions
      const tc = goal.triggerCondition;
      if (tc.storyStage !== undefined && companion.story_stage < tc.storyStage) continue;
      if (tc.karma !== undefined && karma < tc.karma) continue;
      if (tc.locationId !== undefined && tc.locationId !== locationId) continue;

      // Check if the interior has a matching tile
      const goalTile = this.findGoalTile(goal, interiorMap, locationId);
      if (!goalTile) continue;

      // "sometimes" goals have ~40% chance of activating
      if (goal.frequency === "sometimes" && Math.random() > 0.4) continue;

      // Activate this goal
      await this.companionRepo.setActiveGoal(saveId, companion.companion_id, goal.id);
      return;
    }
  }

  private findGoalTile(
    goal: CompanionGoal,
    interiorMap: InteriorMapDefinition,
    locationId: string
  ): HexPoint | null {
    if (goal.target.type === "location_tile") {
      if (goal.target.locationId !== locationId) return null;
      const point = { x: goal.target.tileX, y: goal.target.tileY };
      if (interiorMap.layout[point.y]?.[point.x]) return point;
      return null;
    }

    if (goal.target.type === "npc") {
      const targetNpcId = goal.target.npcId;
      const npc = interiorMap.npcs.find((n) => n.id === targetNpcId);
      if (!npc || npc.x === undefined || npc.y === undefined) return null;
      return { x: npc.x, y: npc.y };
    }

    // tile_type target: find first matching tile in the layout
    for (let y = 0; y < interiorMap.layout.length; y++) {
      const row = interiorMap.layout[y] ?? [];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === goal.target.tileType) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private async runCompanionFollowStep(
    saveId: string,
    playerFrom: HexPoint,
    playerTo: HexPoint,
    passableSet: Set<string>,
    interiorMap: InteriorMapDefinition,
    locationId: string | null
  ): Promise<CompanionTurnResult | null> {
    const companions = await this.companionRepo.getAll(saveId);
    let firstResult: CompanionTurnResult | null = null;

    for (const companion of companions) {
      const stepResult = await this.runSingleCompanionFollow(saveId, companion, playerFrom, playerTo, passableSet, interiorMap, locationId);
      if (stepResult && !firstResult) {
        firstResult = stepResult;
      }
    }

    return firstResult;
  }

  private async runSingleCompanionFollow(
    saveId: string,
    companion: import("../shared/types.js").CompanionInstanceRow,
    playerFrom: HexPoint,
    playerTo: HexPoint,
    passableSet: Set<string>,
    interiorMap: InteriorMapDefinition,
    locationId: string | null
  ): Promise<CompanionTurnResult | null> {

    // Initialize companion position if not set
    let companionPos: HexPoint;
    if (companion.companion_x !== null && companion.companion_y !== null) {
      companionPos = { x: companion.companion_x, y: companion.companion_y };
    } else {
      const adjacent = this.findAdjacentPassableHexExcluding(playerFrom, passableSet, new Set([toTileKey(playerFrom)]));
      companionPos = adjacent ?? playerFrom;
    }

    const distToPlayer = hexDistance(companionPos, playerTo);
    const playerKey = toTileKey(playerTo);

    // Resolve goal tile for active goal (used for both pathfinding and completion check)
    let goalTile: HexPoint | null = null;
    if (companion.active_goal_id) {
      goalTile = this.resolveGoalTarget(companion, interiorMap, locationId);
    }

    // Compute follow target — goal-seeking overrides loose follow, but regroup always wins
    let followTarget: HexPoint;
    if (distToPlayer >= 4) {
      // Regroup: target adjacent to player (highest priority)
      const adjacent = this.findAdjacentPassableHexExcluding(playerTo, passableSet, new Set([playerKey]));
      followTarget = adjacent ?? playerTo;
    } else if (goalTile) {
      // Active goal: pathfind toward goal tile
      followTarget = goalTile;
    } else {
      // Loose follow: target 1-2 hexes behind player (opposite direction of travel)
      followTarget = this.computeLooseFollowTarget(playerFrom, playerTo, passableSet);
    }

    // Take one step toward the follow target
    const companionKey = toTileKey(companionPos);
    const followTargetKey = toTileKey(followTarget);
    let newPos = companionPos;

    if (companionKey !== followTargetKey) {
      // Block companion from stepping onto the player's tile
      const blockedSet = new Set([playerKey]);
      const path = findPath(companionPos, followTarget, passableSet, blockedSet);
      const nextStep = path?.[0];

      if (nextStep && passableSet.has(toTileKey(nextStep))) {
        newPos = nextStep;
      }
    }

    await this.companionRepo.setPosition(saveId, companion.companion_id, newPos.x, newPos.y, interiorMap.id);

    // Check if companion reached goal tile — fire completion
    let goalCompleted: GoalCompletionResult | null = null;
    if (goalTile && toTileKey(newPos) === toTileKey(goalTile)) {
      goalCompleted = await this.fireGoalCompletion(saveId, companion);
    }

    const moved = toTileKey(newPos) !== companionKey;
    if (!moved && !goalCompleted) return null;

    return {
      companionId: companion.companion_id,
      from: companionPos,
      to: newPos,
      goalCompleted
    };
  }

  private computeLooseFollowTarget(
    playerFrom: HexPoint,
    playerTo: HexPoint,
    passableSet: Set<string>
  ): HexPoint {
    // Direction of travel: from playerFrom to playerTo
    const dx = playerTo.x - playerFrom.x;
    const dy = playerTo.y - playerFrom.y;

    // "Behind" the player means opposite direction of travel
    // Try to find a passable tile 1-2 hexes behind
    const behindCandidates: HexPoint[] = [];

    // Candidate 1 hex behind (opposite direction)
    const behind1: HexPoint = { x: playerTo.x - dx, y: playerTo.y - dy };
    // Candidate 2 hexes behind
    const behind2: HexPoint = { x: playerTo.x - 2 * dx, y: playerTo.y - 2 * dy };

    if (passableSet.has(toTileKey(behind1)) && toTileKey(behind1) !== toTileKey(playerTo)) {
      behindCandidates.push(behind1);
    }
    if (passableSet.has(toTileKey(behind2)) && toTileKey(behind2) !== toTileKey(playerTo)) {
      behindCandidates.push(behind2);
    }

    if (behindCandidates.length > 0) {
      return behindCandidates[0]!;
    }

    // Fallback: any adjacent passable tile behind the player (higher y preferred)
    const playerKey = toTileKey(playerTo);
    const neighbors = hexNeighbors(playerTo)
      .filter((n) => passableSet.has(toTileKey(n)) && toTileKey(n) !== playerKey)
      .sort((a, b) => b.y - a.y || a.x - b.x);

    return neighbors[0] ?? playerFrom;
  }

  private async fireGoalCompletion(
    saveId: string,
    companion: import("../shared/types.js").CompanionInstanceRow
  ): Promise<GoalCompletionResult | null> {
    const content = getGameContent();
    const companionDef = content.companions.find((c) => c.id === companion.companion_id);
    const goal = companionDef?.goals?.find((g) => g.id === companion.active_goal_id);
    if (!goal) return null;

    // Apply karmaDelta
    if (goal.onComplete.karmaDelta) {
      const pc = await this.saveRepo.findPlayerCharacter(saveId);
      if (pc) {
        const newKarma = pc.karma + goal.onComplete.karmaDelta;
        await this.saveRepo.updateKarma(saveId, newKarma);
      }
    }

    // Apply loyaltyDelta
    let newLoyalty: number | null = null;
    if (goal.onComplete.loyaltyDelta) {
      const currentRow = await this.companionRepo.find(saveId, companion.companion_id);
      if (currentRow) {
        const updated = Math.max(0, Math.min(100, currentRow.loyalty + goal.onComplete.loyaltyDelta));
        await this.companionRepo.updateLoyalty(saveId, companion.companion_id, updated);
        newLoyalty = updated;
      }
    }

    // Mark goal complete and clear active goal
    await this.companionRepo.markGoalComplete(saveId, companion.companion_id, goal.id);

    // Resolve dialogue tree if specified
    let dialogueTree: GoalCompletionResult["dialogueTree"] = null;
    if (goal.onComplete.dialogueTreeId && companionDef) {
      const tree = companionDef.storyDialogues[goal.onComplete.dialogueTreeId];
      if (tree) {
        dialogueTree = {
          rootNodeId: tree.rootNodeId,
          nodes: tree.nodes.map((n) => ({
            id: n.id,
            text: n.text,
            options: n.options.map((o) => ({
              id: o.id,
              label: o.label,
              response: o.response,
              next: o.next
            }))
          }))
        };
      }
    }

    return {
      goalId: goal.id,
      dialogueTreeId: goal.onComplete.dialogueTreeId ?? null,
      dialogueTree,
      storyNote: goal.onComplete.storyNote ?? null,
      karmaDelta: goal.onComplete.karmaDelta ?? null,
      loyaltyDelta: goal.onComplete.loyaltyDelta ?? null,
      newLoyalty
    };
  }

  private resolveGoalTarget(
    companion: import("../shared/types.js").CompanionInstanceRow,
    interiorMap: InteriorMapDefinition,
    locationId: string | null
  ): HexPoint | null {
    const content = getGameContent();
    const companionDef = content.companions.find((c) => c.id === companion.companion_id);
    const goal = companionDef?.goals?.find((g) => g.id === companion.active_goal_id);
    if (!goal) return null;

    return this.findGoalTile(goal, interiorMap, locationId ?? "");
  }

  private findAdjacentPassableHexExcluding(
    center: HexPoint,
    passableSet: Set<string>,
    excludeKeys: Set<string>
  ): HexPoint | null {
    const neighbors = hexNeighbors(center)
      .filter((n) => {
        const key = toTileKey(n);
        return passableSet.has(key) && !excludeKeys.has(key);
      })
      .sort((a, b) => b.y - a.y || a.x - b.x);

    return neighbors[0] ?? null;
  }

  private findAdjacentPassableHex(
    playerPos: HexPoint,
    interiorMap: InteriorMapDefinition
  ): { x: number; y: number } | null {
    const passableSet = buildPassableSet(interiorMap);
    const playerKey = toTileKey(playerPos);
    const neighbors = hexNeighbors(playerPos);

    // Prefer hex behind the player (higher y = visually behind in iso)
    neighbors.sort((a, b) => b.y - a.y || a.x - b.x);

    for (const neighbor of neighbors) {
      const key = toTileKey(neighbor);
      if (passableSet.has(key) && key !== playerKey) {
        return neighbor;
      }
    }

    return null;
  }

}

const MAX_OVERWORLD_FOG_STEPS = 20;

interface OverworldReplayStep {
  position: HexPoint;
  revealedTileKeys: string[];
  discoveredLocationIds: string[];
}

interface InteriorReplayStep {
  position: HexPoint;
}

interface GoalCompletionResult {
  goalId: string;
  dialogueTreeId: string | null;
  dialogueTree: {
    rootNodeId: string;
    nodes: Array<{ id: string; text: string; options: Array<{ id: string; label: string; response?: string; next?: string }> }>;
  } | null;
  storyNote: string | null;
  karmaDelta: number | null;
  loyaltyDelta: number | null;
  newLoyalty: number | null;
}

interface CompanionTurnResult {
  companionId: string;
  from: HexPoint;
  to: HexPoint;
  goalCompleted: GoalCompletionResult | null;
}

export interface ConclusionInitiation {
  companionId: string;
  companionName: string;
  dialogueTreeId: string;
  dialogueTree: {
    rootNodeId: string;
    nodes: Array<{ id: string; text: string; options: Array<{ id: string; label: string; response?: string; next?: string }> }>;
  };
}
