import { computeAllSkillValues, getSkillPointCost, SKILL_DEFINITIONS, SKILL_IDS } from "../../../game/src/skills.js";
import { withTransaction } from "../db/connection.js";
import { CompanionRepo } from "../repos/companion_repo.js";
import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import type { MapDiscoveryRow, WorldStateRow } from "../shared/types.js";
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
  private readonly dialogueService = new DialogueService();

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

    return {
      save,
      playerCharacter: {
        name: playerCharacter.name,
        level: playerCharacter.level,
        xp: playerCharacter.xp ?? 0,
        archetype: playerCharacter.archetype,
        special: playerCharacter.special_json
          ? safeJsonParse<Record<string, number> | null>(playerCharacter.special_json, null)
          : null,
        karma: playerCharacter.karma ?? 0,
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
        failed: safeJsonParse<string[]>(questState.failed_quests_json, []),
        definitions: content.quests
          .filter((q) => {
            const activeIds = safeJsonParse<string[]>(questState.active_quests_json, []);
            const completedIds = safeJsonParse<string[]>(questState.completed_quests_json, []);
            const failedIds = safeJsonParse<string[]>(questState.failed_quests_json, []);
            return activeIds.includes(q.id) || completedIds.includes(q.id) || failedIds.includes(q.id);
          })
          .map((q) => {
            const isQuestCompleted = safeJsonParse<string[]>(questState.completed_quests_json, []).includes(q.id);
            const rawObjectives = q.objectives.map((o) => {
              let completed = false;
              if (isQuestCompleted) {
                completed = true;
              } else if (o.type === "fetch") {
                completed = collectedItemIds.includes(o.target);
              } else if (o.type === "visit") {
                completed = enteredLocationIds.includes(o.target);
              } else if (o.type === "kill") {
                completed = normalizedState.discoveredLocationIds.includes(o.target);
              }
              return {
                id: o.id,
                description: o.description,
                type: o.type,
                target: o.target,
                locationId: o.locationId,
                completed,
                hidden: o.hidden ?? false
              };
            });
            // Hidden objectives reveal progressively: show when completed,
            // or when the preceding objective is completed (next-up reveal)
            const objectives = rawObjectives.filter((o, index) => {
              if (!o.hidden) return true;
              if (o.completed) return true;
              if (index > 0 && rawObjectives[index - 1]!.completed) return true;
              return false;
            }).map(({ hidden: _h, ...rest }) => rest);
            const nextObjective = objectives.find((o) => !o.completed);
            const activeMapMarker = nextObjective?.locationId
              ? { locationId: nextObjective.locationId, label: nextObjective.description }
              : q.mapMarker ?? null;
            return {
              id: q.id,
              name: q.name,
              description: q.description,
              objectives,
              mapMarker: q.mapMarker ?? null,
              activeMapMarker
            };
          })
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
          tokenColor: companionDef?.tokenColor ?? null,
          loyalty: row.loyalty,
          storyStage: row.story_stage,
          storyStageTitle: currentStage?.title ?? null,
          hasNewStory: row.story_stage > row.story_stage_viewed,
          recruitedAt: row.recruited_at
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
        description: w.description
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
    const companion = companions[0];
    if (!companion) return null;

    const companionDef = content.companions.find((c) => c.id === companion.companion_id);
    if (!companionDef) return null;

    const nextStageIndex = companion.story_stage + 1;
    const nextStage = companionDef.storyStages[nextStageIndex];
    if (!nextStage) return null;

    const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);
    const discoveredLocationIds = mapDiscovery
      ? safeJsonParse<string[]>(mapDiscovery.discovered_locations_json, [])
      : [];
    const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
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

    await this.companionRepo.updateStoryStage(saveId, companion.companion_id, nextStageIndex);

    return {
      companionId: companion.companion_id,
      newStage: nextStageIndex,
      stageTitle: nextStage.title,
      dialogueTreeId: nextStage.dialogueTreeId
    };
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
  }

  public async enterLocation(saveId: string, locationId: string): Promise<void> {
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

      await this.checkCompanionStoryProgression(saveId);
    });
  }

  public async travel(saveId: string, x: number, y: number): Promise<void> {
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

      const previousLocationCount = normalizedExploration.discoveredLocationIds.length;
      const revealedState = revealExploration(
        overworldMap,
        regionLocations,
        targetPosition,
        normalizedExploration.discoveredLocationIds,
        normalizedExploration.discoveredTileKeys
      );
      const now = Date.now();

      await this.gameStateRepo.updateExplorationState(
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
          entered_locations_json: mapDiscovery.entered_locations_json,
          updated_at: now
        }
      );

      const newLocationCount = revealedState.discoveredLocationIds.length - previousLocationCount;
      if (newLocationCount > 0) {
        await this.saveRepo.awardXp(saveId, newLocationCount * 20);
      }
    });
  }

  public async moveInterior(saveId: string, x: number, y: number): Promise<void> {
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

    if (currentPosition.x === targetPosition.x && currentPosition.y === targetPosition.y) {
      return;
    }

    if (!canMoveInterior(currentPosition, targetPosition, interiorMap)) {
      throw new Error("Interior movement is limited to adjacent passable hexes.");
    }

    await this.gameStateRepo.updateWorldState({
      ...worldState,
      player_x: targetPosition.x,
      player_y: targetPosition.y,
      updated_at: Date.now()
    });
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

    await this.companionRepo.recruit(saveId, companionId);
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
}
