import type Database from "better-sqlite3";

import type {
  DialogueNode,
  DialogueOption,
  DialogueTree,
  InteriorMapDefinition,
  QuestDefinition
} from "../../../game/src/index.js";

import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import { getGameContent } from "./content_service.js";
import { getRegionLocations } from "./exploration_state.js";

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (json === null || json === undefined) {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

interface DialogueNpcState {
  nodeId: string;
  selected: string[];
}

type DialogueStateMap = Record<string, DialogueNpcState | string>;

function resolveNpcState(raw: DialogueNpcState | string | undefined, rootNodeId: string): DialogueNpcState {
  if (!raw) {
    return { nodeId: rootNodeId, selected: [] };
  }

  // Backward compat: old format stored just a string nodeId
  if (typeof raw === "string") {
    return { nodeId: raw, selected: [] };
  }

  // Empty nodeId means "reset to root" (e.g. after leaving an area)
  if (!raw.nodeId) {
    return { nodeId: rootNodeId, selected: raw.selected };
  }

  return raw;
}

export interface FilteredDialogueNode {
  id: string;
  text: string;
  options: FilteredDialogueOption[];
  isRoot: boolean;
}

export interface FilteredDialogueOption {
  id: string;
  label: string;
  specialGateLabel: string | null;
  hasResponse: boolean;
  hasNext: boolean;
  grantsQuest: string | null;
  returnToRoot: boolean;
  alreadySelected: boolean;
}

export interface QuestCompletionResult {
  questId: string;
  questName: string;
  karmaDelta: number;
  factionDeltas: Record<string, number>;
  itemsGranted: Array<{ itemId: string; label: string; quantity: number }>;
  capsGranted: number;
}

export interface DialogueSelectResult {
  response: string | null;
  nextNode: FilteredDialogueNode | null;
  questGranted: QuestDefinition | null;
  questCompleted: QuestCompletionResult | null;
  karmaDelta: number;
  factionDelta: { factionId: string; delta: number } | null;
  stateUpdated: boolean;
  alreadySelected: boolean;
}

const STAT_DISPLAY_NAMES: Record<string, string> = {
  str: "Strength",
  per: "Perception",
  end: "Endurance",
  cha: "Charisma",
  int: "Intelligence",
  agl: "Agility",
  lck: "Luck"
};

export class DialogueService {
  private readonly saveRepo: SaveRepo;
  private readonly gameStateRepo: GameStateRepo;
  private readonly inventoryRepo: InventoryRepo;

  public constructor(db: Database.Database) {
    this.saveRepo = new SaveRepo(db);
    this.gameStateRepo = new GameStateRepo(db);
    this.inventoryRepo = new InventoryRepo(db);
  }

  /** Reset all NPC dialogue positions back to root, keeping selected-option history. */
  public resetAllDialoguePositions(saveId: string): void {
    const stateMap = this.getDialogueStateMap(saveId);
    let changed = false;

    for (const npcId of Object.keys(stateMap)) {
      const raw = stateMap[npcId];
      if (typeof raw === "string") {
        // Legacy format — just delete the position; resolveNpcState will return root next time
        delete stateMap[npcId];
        changed = true;
      } else if (raw && raw.nodeId) {
        // Keep selected history, clear position so it falls back to root
        stateMap[npcId] = { nodeId: "", selected: raw.selected };
        changed = true;
      }
    }

    if (changed) {
      this.saveDialogueStateMap(saveId, stateMap);
    }
  }

  public getDialogueNode(saveId: string, npcId: string): FilteredDialogueNode | null {
    const { dialogue, special } = this.resolveDialogueContext(saveId, npcId);

    if (!dialogue) {
      return null;
    }

    const npcState = this.getNpcState(saveId, npcId, dialogue);
    const node = dialogue.nodes.find((n) => n.id === npcState.nodeId);

    if (!node) {
      return null;
    }

    return this.filterNode(node, dialogue, special, npcState.selected, saveId);
  }

  public selectOption(saveId: string, npcId: string, optionId: string): DialogueSelectResult {
    const { dialogue, special } = this.resolveDialogueContext(saveId, npcId);

    if (!dialogue) {
      throw new Error("This NPC has no dialogue.");
    }

    const npcState = this.getNpcState(saveId, npcId, dialogue);
    const node = dialogue.nodes.find((n) => n.id === npcState.nodeId);

    if (!node) {
      throw new Error("Dialogue state is invalid.");
    }

    const option = node.options.find((o) => o.id === optionId);

    if (!option) {
      throw new Error("That dialogue option is not available.");
    }

    if (!this.passesGate(option, special)) {
      throw new Error("You don't meet the requirements for that dialogue option.");
    }

    if (!this.passesInventoryGate(option, saveId)) {
      throw new Error("You don't have the required item for that dialogue option.");
    }

    if (!this.passesQuestGate(option, saveId)) {
      throw new Error("You don't have knowledge of that topic yet.");
    }

    const wasAlreadySelected = npcState.selected.includes(optionId);

    const result: DialogueSelectResult = {
      response: option.response ?? null,
      nextNode: null,
      questGranted: null,
      questCompleted: null,
      karmaDelta: 0,
      factionDelta: null,
      stateUpdated: false,
      alreadySelected: wasAlreadySelected
    };

    // Side effects only trigger the FIRST time an option is selected
    if (!wasAlreadySelected) {
      if (option.questGrant) {
        result.questGranted = this.grantQuest(saveId, option.questGrant);
      }

      if (option.questComplete) {
        result.questCompleted = this.completeQuest(saveId, option.questComplete);
        if (result.questCompleted) {
          result.stateUpdated = true;
        }
      }

      if (option.karmaDelta) {
        result.karmaDelta = option.karmaDelta;
        this.adjustKarma(saveId, option.karmaDelta);
        result.stateUpdated = true;
      }

      if (option.factionDelta) {
        result.factionDelta = option.factionDelta;
        this.adjustFaction(saveId, option.factionDelta.factionId, option.factionDelta.delta);
        result.stateUpdated = true;
      }

      if (option.consumeItem && option.inventoryGate) {
        this.inventoryRepo.removeItem(saveId, option.inventoryGate.itemId);
        result.stateUpdated = true;
      }

      if (option.grantItems) {
        for (const grant of option.grantItems) {
          this.inventoryRepo.addItem({
            save_id: saveId,
            item_id: grant.itemId,
            label: grant.label,
            owned_by: null,
            quantity: grant.quantity,
            description: null,
            collected_at: Date.now()
          });
        }
        result.stateUpdated = true;
      }

      // Mark option as selected
      this.markOptionSelected(saveId, npcId, dialogue, optionId);
    }

    // Refresh npcState after marking selected
    const updatedNpcState = this.getNpcState(saveId, npcId, dialogue);

    // Navigate to next node
    if (option.returnToRoot) {
      const effectiveRoot = this.getEffectiveRootNodeId(saveId, dialogue);
      this.setCurrentNodeId(saveId, npcId, dialogue, effectiveRoot);
      const rootNode = dialogue.nodes.find((n) => n.id === effectiveRoot);

      if (rootNode) {
        result.nextNode = this.filterNode(rootNode, dialogue, special, updatedNpcState.selected, saveId);
      }
    } else if (option.next) {
      this.setCurrentNodeId(saveId, npcId, dialogue, option.next);
      const nextNode = dialogue.nodes.find((n) => n.id === option.next);

      if (nextNode) {
        result.nextNode = this.filterNode(nextNode, dialogue, special, updatedNpcState.selected, saveId);
      }
    }

    return result;
  }

  public resetDialogue(saveId: string, npcId: string): FilteredDialogueNode | null {
    const { dialogue, special } = this.resolveDialogueContext(saveId, npcId);

    if (!dialogue) {
      return null;
    }

    const effectiveRoot = this.getEffectiveRootNodeId(saveId, dialogue);
    this.setCurrentNodeId(saveId, npcId, dialogue, effectiveRoot);
    const npcState = this.getNpcState(saveId, npcId, dialogue);
    const rootNode = dialogue.nodes.find((n) => n.id === effectiveRoot);

    if (!rootNode) {
      return null;
    }

    return this.filterNode(rootNode, dialogue, special, npcState.selected, saveId);
  }

  private resolveDialogueContext(saveId: string, npcId: string) {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);

    if (!worldState || !worldState.current_map_id) {
      throw new Error("Not currently in an interior.");
    }

    const interiorMap = content.interiorMaps.find((m) => m.id === worldState.current_map_id);

    if (!interiorMap) {
      throw new Error("Interior map not found.");
    }

    const npc = interiorMap.npcs.find((n) => n.id === npcId);

    if (!npc) {
      throw new Error("NPC not found in current interior.");
    }

    const playerCharacter = this.saveRepo.findPlayerCharacter(saveId);
    const special = playerCharacter?.special_json
      ? safeJsonParse<Record<string, number>>(playerCharacter.special_json, {})
      : {};

    return { dialogue: npc.dialogue ?? null, special, interiorMap, npc };
  }

  private getDialogueStateMap(saveId: string): DialogueStateMap {
    const questState = this.gameStateRepo.getQuestState(saveId);
    return safeJsonParse<DialogueStateMap>(questState?.dialogue_state_json, {});
  }

  private saveDialogueStateMap(saveId: string, stateMap: DialogueStateMap): void {
    const questState = this.gameStateRepo.getQuestState(saveId);

    if (!questState) {
      return;
    }

    this.gameStateRepo.updateQuestState({
      ...questState,
      dialogue_state_json: JSON.stringify(stateMap),
      updated_at: Date.now()
    });
  }

  private getEffectiveRootNodeId(saveId: string, dialogue: DialogueTree): string {
    if (dialogue.conditionalRoots && dialogue.conditionalRoots.length > 0) {
      const questState = this.gameStateRepo.getQuestState(saveId);
      const completed = safeJsonParse<string[]>(questState?.completed_quests_json, []);

      for (const condition of dialogue.conditionalRoots) {
        if (completed.includes(condition.questCompleted)) {
          return condition.nodeId;
        }
      }
    }

    return dialogue.rootNodeId;
  }

  private getNpcState(saveId: string, npcId: string, dialogue: DialogueTree): DialogueNpcState {
    const stateMap = this.getDialogueStateMap(saveId);
    const rootNodeId = this.getEffectiveRootNodeId(saveId, dialogue);
    return resolveNpcState(stateMap[npcId], rootNodeId);
  }

  private setCurrentNodeId(saveId: string, npcId: string, dialogue: DialogueTree, nodeId: string): void {
    const stateMap = this.getDialogueStateMap(saveId);
    const rootNodeId = this.getEffectiveRootNodeId(saveId, dialogue);
    const current = resolveNpcState(stateMap[npcId], rootNodeId);
    stateMap[npcId] = { ...current, nodeId };
    this.saveDialogueStateMap(saveId, stateMap);
  }

  private markOptionSelected(saveId: string, npcId: string, dialogue: DialogueTree, optionId: string): void {
    const stateMap = this.getDialogueStateMap(saveId);
    const rootNodeId = this.getEffectiveRootNodeId(saveId, dialogue);
    const current = resolveNpcState(stateMap[npcId], rootNodeId);

    if (!current.selected.includes(optionId)) {
      current.selected.push(optionId);
    }

    stateMap[npcId] = current;
    this.saveDialogueStateMap(saveId, stateMap);
  }

  private passesGate(option: DialogueOption, special: Record<string, number>): boolean {
    if (!option.specialGate) {
      return true;
    }

    const statValue = special[option.specialGate.stat] ?? 1;

    if (option.specialGate.min !== undefined && statValue < option.specialGate.min) {
      return false;
    }

    if (option.specialGate.max !== undefined && statValue > option.specialGate.max) {
      return false;
    }

    return true;
  }

  private passesInventoryGate(option: DialogueOption, saveId: string): boolean {
    if (!option.inventoryGate) {
      return true;
    }

    const item = this.inventoryRepo.findItem(saveId, option.inventoryGate.itemId);
    return !!item;
  }

  private formatGateLabel(option: DialogueOption, saveId: string): string | null {
    if (option.inventoryGate) {
      const item = this.inventoryRepo.findItem(saveId, option.inventoryGate.itemId);
      const itemLabel = item?.label ?? option.inventoryGate.itemId;
      return `Requires: ${itemLabel}`;
    }

    if (!option.specialGate) {
      return null;
    }

    const statName = STAT_DISPLAY_NAMES[option.specialGate.stat] ?? option.specialGate.stat;

    if (option.specialGate.min !== undefined) {
      return `${statName} ${option.specialGate.min}`;
    }

    if (option.specialGate.max !== undefined) {
      return `${statName} ${option.specialGate.max}`;
    }

    return null;
  }

  private passesQuestGate(option: DialogueOption, saveId: string): boolean {
    if (!option.questGate) {
      return true;
    }

    const questState = this.gameStateRepo.getQuestState(saveId);
    if (!questState) return false;

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);
    return activeQuests.includes(option.questGate.questId) || completedQuests.includes(option.questGate.questId);
  }

  private filterNode(
    node: DialogueNode,
    dialogue: DialogueTree,
    special: Record<string, number>,
    selectedOptionIds: string[],
    saveId?: string
  ): FilteredDialogueNode {
    const effectiveRoot = saveId ? this.getEffectiveRootNodeId(saveId, dialogue) : dialogue.rootNodeId;
    const isRoot = node.id === effectiveRoot;
    const filteredOptions = node.options
      .filter((option) =>
        this.passesGate(option, special) &&
        (saveId ? this.passesInventoryGate(option, saveId) : !option.inventoryGate) &&
        (saveId ? this.passesQuestGate(option, saveId) : !option.questGate)
      )
      .map((option) => ({
        id: option.id,
        label: option.label,
        specialGateLabel: saveId ? this.formatGateLabel(option, saveId) : this.formatGateLabel(option, ""),
        hasResponse: !!option.response,
        hasNext: !!option.next,
        grantsQuest: option.questGrant ?? null,
        returnToRoot: option.returnToRoot ?? false,
        alreadySelected: selectedOptionIds.includes(option.id)
      }));

    // Auto-inject "Let's talk about something else" on non-root nodes
    if (!isRoot && !filteredOptions.some((o) => o.returnToRoot)) {
      filteredOptions.push({
        id: "__return_to_root",
        label: "Let's talk about something else.",
        specialGateLabel: null,
        hasResponse: false,
        hasNext: true,
        grantsQuest: null,
        returnToRoot: true,
        alreadySelected: false
      });
    }

    return {
      id: node.id,
      text: node.text,
      options: filteredOptions,
      isRoot
    };
  }

  private grantQuest(saveId: string, questId: string): QuestDefinition | null {
    const content = getGameContent();
    const questDef = content.quests.find((q) => q.id === questId);

    if (!questDef) {
      return null;
    }

    const questState = this.gameStateRepo.getQuestState(saveId);

    if (!questState) {
      return null;
    }

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);

    if (activeQuests.includes(questId) || completedQuests.includes(questId)) {
      return null;
    }

    activeQuests.push(questId);

    this.gameStateRepo.updateQuestState({
      ...questState,
      active_quests_json: JSON.stringify(activeQuests),
      updated_at: Date.now()
    });

    // Auto-discover the quest marker location on the map
    if (questDef.mapMarker?.locationId) {
      this.revealQuestMarkerLocation(saveId, questDef.mapMarker.locationId);
    }

    return questDef;
  }

  private completeQuest(saveId: string, questId: string): QuestCompletionResult | null {
    const content = getGameContent();
    const questDef = content.quests.find((q) => q.id === questId);

    if (!questDef) {
      return null;
    }

    const questState = this.gameStateRepo.getQuestState(saveId);

    if (!questState) {
      return null;
    }

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);

    // Already completed
    if (completedQuests.includes(questId)) {
      return null;
    }

    // Move from active to completed
    const nextActive = activeQuests.filter((id) => id !== questId);
    completedQuests.push(questId);

    this.gameStateRepo.updateQuestState({
      ...questState,
      active_quests_json: JSON.stringify(nextActive),
      completed_quests_json: JSON.stringify(completedQuests),
      updated_at: Date.now()
    });

    const result: QuestCompletionResult = {
      questId,
      questName: questDef.name,
      karmaDelta: 0,
      factionDeltas: {},
      itemsGranted: [],
      capsGranted: 0
    };

    // Apply rewards
    if (questDef.rewards) {
      if (questDef.rewards.karma) {
        result.karmaDelta = questDef.rewards.karma;
        this.adjustKarma(saveId, questDef.rewards.karma);
      }

      if (questDef.rewards.factionDeltas) {
        for (const [factionId, delta] of Object.entries(questDef.rewards.factionDeltas)) {
          result.factionDeltas[factionId] = delta;
          this.adjustFaction(saveId, factionId, delta);
        }
      }

      if (questDef.rewards.items) {
        for (const item of questDef.rewards.items) {
          this.inventoryRepo.addItem({
            save_id: saveId,
            item_id: item.itemId,
            label: item.label,
            owned_by: null,
            quantity: item.quantity,
            description: (item as { description?: string }).description ?? null,
            collected_at: Date.now()
          });
          result.itemsGranted.push({ itemId: item.itemId, label: item.label, quantity: item.quantity });
        }
      }

      if (questDef.rewards.caps) {
        result.capsGranted = questDef.rewards.caps;
        // Add caps to inventory
        this.inventoryRepo.addItem({
          save_id: saveId,
          item_id: "caps",
          label: "Caps",
          owned_by: null,
          quantity: questDef.rewards.caps,
          description: "Bottle caps — the universally accepted currency of the wasteland.",
          collected_at: Date.now()
        });
      }
    }

    return result;
  }

  private revealQuestMarkerLocation(saveId: string, locationId: string): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = this.gameStateRepo.getMapDiscovery(saveId);

    if (!worldState || !mapDiscovery) return;

    const region = content.regions.find((r) => r.id === worldState.current_region_id);
    if (!region) return;

    const regionLocations = getRegionLocations(content, region.id);
    const location = regionLocations.find((l) => l.id === locationId);
    if (!location) return;

    const discoveredLocationIds = safeJsonParse<string[]>(mapDiscovery.discovered_locations_json, []);
    const discoveredTileKeys = safeJsonParse<string[]>(mapDiscovery.discovered_tiles_json, []);

    if (discoveredLocationIds.includes(locationId)) return;

    // Reveal the location and its tile
    discoveredLocationIds.push(locationId);
    const tileKey = `${location.position.x},${location.position.y}`;
    if (!discoveredTileKeys.includes(tileKey)) {
      discoveredTileKeys.push(tileKey);
    }

    this.gameStateRepo.updateMapDiscovery({
      ...mapDiscovery,
      discovered_locations_json: JSON.stringify(discoveredLocationIds),
      discovered_tiles_json: JSON.stringify(discoveredTileKeys),
      updated_at: Date.now()
    });
  }

  private adjustKarma(saveId: string, delta: number): void {
    const playerCharacter = this.saveRepo.findPlayerCharacter(saveId);

    if (!playerCharacter) {
      return;
    }

    this.saveRepo.updateKarma(saveId, playerCharacter.karma + delta);
  }

  private adjustFaction(saveId: string, factionId: string, delta: number): void {
    const factionStanding = this.gameStateRepo.getFactionStanding(saveId);

    if (!factionStanding) {
      return;
    }

    const standings = safeJsonParse<Record<string, number>>(factionStanding.standings_json, {});
    standings[factionId] = (standings[factionId] ?? 0) + delta;

    this.gameStateRepo.updateFactionStanding({
      ...factionStanding,
      standings_json: JSON.stringify(standings),
      updated_at: Date.now()
    });
  }
}
