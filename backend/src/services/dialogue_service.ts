import type {
  DialogueNode,
  DialogueOption,
  DialogueTree,
  QuestDefinition
} from "../../../game/src/index.js";

import { withTransaction } from "../db/connection.js";
import { CompanionRepo } from "../repos/companion_repo.js";
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

  if (typeof raw === "string") {
    return { nodeId: raw, selected: [] };
  }

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
  failsQuest: string | null;
  returnToRoot: boolean;
  alreadySelected: boolean;
  capsCost: number | null;
  canAfford: boolean;
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
  questFailed: { questId: string; questName: string } | null;
  karmaDelta: number;
  factionDelta: { factionId: string; delta: number } | null;
  companionRecruited: string | null;
  companionReaction: { companionId: string; loyaltyDelta: number; newLoyalty: number; reaction: string; departed: boolean } | null;
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
  private readonly saveRepo = new SaveRepo();
  private readonly gameStateRepo = new GameStateRepo();
  private readonly inventoryRepo = new InventoryRepo();
  private readonly companionRepo = new CompanionRepo();

  public async resetAllDialoguePositions(saveId: string): Promise<void> {
    const stateMap = await this.getDialogueStateMap(saveId);
    let changed = false;

    for (const npcId of Object.keys(stateMap)) {
      const raw = stateMap[npcId];
      if (typeof raw === "string") {
        delete stateMap[npcId];
        changed = true;
      } else if (raw && raw.nodeId) {
        stateMap[npcId] = { nodeId: "", selected: raw.selected };
        changed = true;
      }
    }

    if (changed) {
      await this.saveDialogueStateMap(saveId, stateMap);
    }
  }

  public async getDialogueNode(saveId: string, npcId: string): Promise<FilteredDialogueNode | null> {
    const { dialogue, special } = await this.resolveDialogueContext(saveId, npcId);

    if (!dialogue) {
      return null;
    }

    const npcState = await this.getNpcState(saveId, npcId, dialogue);
    const node = dialogue.nodes.find((candidate) => candidate.id === npcState.nodeId);

    if (!node) {
      return null;
    }

    return this.filterNode(node, dialogue, special, npcState.selected, saveId, npcId);
  }

  public async selectOption(saveId: string, npcId: string, optionId: string): Promise<DialogueSelectResult> {
    return withTransaction(async () => {
      const { dialogue, special } = await this.resolveDialogueContext(saveId, npcId);

      if (!dialogue) {
        throw new Error("This NPC has no dialogue.");
      }

      const npcState = await this.getNpcState(saveId, npcId, dialogue);
      const node = dialogue.nodes.find((candidate) => candidate.id === npcState.nodeId);

      if (!node) {
        throw new Error("Dialogue state is invalid.");
      }

      const option = node.options.find((candidate) => candidate.id === optionId);

      if (!option) {
        throw new Error("That dialogue option is not available.");
      }

      if (!this.passesGate(option, special)) {
        throw new Error("You don't meet the requirements for that dialogue option.");
      }

      if (!(await this.passesInventoryGate(option, saveId))) {
        throw new Error("You don't have the required item for that dialogue option.");
      }

      if (!(await this.passesQuestGate(option, saveId))) {
        throw new Error("You don't have knowledge of that topic yet.");
      }

      const wasAlreadySelected = npcState.selected.includes(optionId);
      const isPurchase = !!option.capsCost;

      if (isPurchase) {
        const capsItem = await this.inventoryRepo.findItem(saveId, "caps");
        const currentCaps = capsItem?.quantity ?? 0;
        if (currentCaps < option.capsCost!) {
          throw new Error(`Not enough caps. You need ${option.capsCost} but only have ${currentCaps}.`);
        }
      }

      const result: DialogueSelectResult = {
        response: option.response ?? null,
        nextNode: null,
        questGranted: null,
        questCompleted: null,
        questFailed: null,
        karmaDelta: 0,
        factionDelta: null,
        companionRecruited: null,
        companionReaction: null,
        stateUpdated: false,
        alreadySelected: wasAlreadySelected
      };

      if (isPurchase) {
        const capsItem = await this.inventoryRepo.findItem(saveId, "caps");
        if (!capsItem) {
          throw new Error("Not enough caps.");
        }

        await this.inventoryRepo.updateQuantity(saveId, "caps", capsItem.quantity - option.capsCost!);
        result.stateUpdated = true;

        if (option.grantItems) {
          for (const grant of option.grantItems) {
            await this.inventoryRepo.addItem({
              save_id: saveId,
              item_id: grant.itemId,
              label: grant.label,
              owned_by: null,
              quantity: grant.quantity,
              description: null,
              collected_at: Date.now()
            });
          }
        }
      }

      if (!wasAlreadySelected) {
        if (option.questGrant) {
          result.questGranted = await this.grantQuest(saveId, option.questGrant);
        }

        if (option.questComplete) {
          result.questCompleted = await this.completeQuest(saveId, option.questComplete);
          if (result.questCompleted) {
            result.stateUpdated = true;
          }
        }

        if (option.questFail) {
          result.questFailed = await this.failQuest(saveId, option.questFail);
          if (result.questFailed) {
            result.stateUpdated = true;
          }
        }

        if (option.karmaDelta) {
          result.karmaDelta = option.karmaDelta;
          await this.adjustKarma(saveId, option.karmaDelta);
          result.stateUpdated = true;

          if (option.karmaDelta >= 2) {
            result.companionReaction = await this.applyCompanionLoyaltyDelta(saveId, 1, "positive");
          }
        }

        if (option.factionDelta) {
          result.factionDelta = option.factionDelta;
          await this.adjustFaction(saveId, option.factionDelta.factionId, option.factionDelta.delta);
          result.stateUpdated = true;
        }

        if (option.consumeItem) {
          if (option.inventoryGate) {
            await this.inventoryRepo.removeItem(saveId, option.inventoryGate.itemId);
            result.stateUpdated = true;
          } else if (option.inventoryTagGate) {
            const taggedItem = await this.inventoryRepo.findItemByTag(saveId, option.inventoryTagGate.tag);
            if (taggedItem) {
              await this.inventoryRepo.removeItem(saveId, taggedItem.item_id);
              result.stateUpdated = true;
            }
          }
        }

        if (!isPurchase && option.grantItems) {
          for (const grant of option.grantItems) {
            await this.inventoryRepo.addItem({
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

        if (option.companionRecruit) {
          const content = getGameContent();
          const companionDef = content.companions.find((candidate) => candidate.id === option.companionRecruit);
          if (companionDef) {
            const existing = await this.companionRepo.find(saveId, option.companionRecruit);
            if (!existing) {
              await this.companionRepo.recruit(saveId, option.companionRecruit);
              result.companionRecruited = option.companionRecruit;
              result.stateUpdated = true;
            }
          }
        }

        await this.markOptionSelected(saveId, npcId, dialogue, optionId);
      }

      const updatedNpcState = await this.getNpcState(saveId, npcId, dialogue);

      if (option.returnToRoot) {
        const effectiveRoot = await this.getEffectiveRootNodeId(saveId, npcId, dialogue);
        await this.setCurrentNodeId(saveId, npcId, dialogue, effectiveRoot);
        const rootNode = dialogue.nodes.find((candidate) => candidate.id === effectiveRoot);

        if (rootNode) {
          result.nextNode = await this.filterNode(rootNode, dialogue, special, updatedNpcState.selected, saveId, npcId);
        }
      } else if (option.next) {
        await this.setCurrentNodeId(saveId, npcId, dialogue, option.next);
        const nextNode = dialogue.nodes.find((candidate) => candidate.id === option.next);

        if (nextNode) {
          result.nextNode = await this.filterNode(nextNode, dialogue, special, updatedNpcState.selected, saveId, npcId);
        }
      }

      return result;
    });
  }

  public async resetDialogue(saveId: string, npcId: string): Promise<FilteredDialogueNode | null> {
    const { dialogue, special } = await this.resolveDialogueContext(saveId, npcId);

    if (!dialogue) {
      return null;
    }

    const effectiveRoot = await this.getEffectiveRootNodeId(saveId, npcId, dialogue);
    await this.setCurrentNodeId(saveId, npcId, dialogue, effectiveRoot);
    const npcState = await this.getNpcState(saveId, npcId, dialogue);
    const rootNode = dialogue.nodes.find((candidate) => candidate.id === effectiveRoot);

    if (!rootNode) {
      return null;
    }

    return this.filterNode(rootNode, dialogue, special, npcState.selected, saveId, npcId);
  }

  private async resolveDialogueContext(saveId: string, npcId: string) {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);

    if (!worldState || !worldState.current_map_id) {
      throw new Error("Not currently in an interior.");
    }

    const interiorMap = content.interiorMaps.find((candidate) => candidate.id === worldState.current_map_id);

    if (!interiorMap) {
      throw new Error("Interior map not found.");
    }

    const npc = interiorMap.npcs.find((candidate) => candidate.id === npcId);

    if (!npc) {
      throw new Error("NPC not found in current interior.");
    }

    const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
    const special = playerCharacter?.special_json
      ? safeJsonParse<Record<string, number>>(playerCharacter.special_json, {})
      : {};

    return { dialogue: npc.dialogue ?? null, special, interiorMap, npc };
  }

  private async getDialogueStateMap(saveId: string): Promise<DialogueStateMap> {
    const questState = await this.gameStateRepo.getQuestState(saveId);
    return safeJsonParse<DialogueStateMap>(questState?.dialogue_state_json, {});
  }

  private async saveDialogueStateMap(saveId: string, stateMap: DialogueStateMap): Promise<void> {
    const questState = await this.gameStateRepo.getQuestState(saveId);

    if (!questState) {
      return;
    }

    await this.gameStateRepo.updateQuestState({
      ...questState,
      dialogue_state_json: JSON.stringify(stateMap),
      updated_at: Date.now()
    });
  }

  private async getEffectiveRootNodeId(saveId: string, npcId: string, dialogue: DialogueTree): Promise<string> {
    if (dialogue.conditionalRoots && dialogue.conditionalRoots.length > 0) {
      const questState = await this.gameStateRepo.getQuestState(saveId);
      const completed = safeJsonParse<string[]>(questState?.completed_quests_json, []);
      const failed = safeJsonParse<string[]>(questState?.failed_quests_json, []);
      const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
      const karma = playerCharacter?.karma ?? 0;
      const factionStanding = await this.gameStateRepo.getFactionStanding(saveId);
      const standings = safeJsonParse<Record<string, number>>(factionStanding?.standings_json, {});
      const dialogueStateMap = await this.getDialogueStateMap(saveId);
      const npcDialogueState = dialogueStateMap[npcId];
      const hasSpokenBefore = npcDialogueState !== undefined
        && typeof npcDialogueState !== "string"
        && npcDialogueState.selected.length > 0;

      for (const condition of dialogue.conditionalRoots) {
        if (condition.questCompleted && completed.includes(condition.questCompleted)) {
          return condition.nodeId;
        }
        if (condition.questFailed && failed.includes(condition.questFailed)) {
          return condition.nodeId;
        }
        if (condition.karmaMin !== undefined && karma >= condition.karmaMin) {
          return condition.nodeId;
        }
        if (condition.factionMin && (standings[condition.factionMin.factionId] ?? 0) >= condition.factionMin.min) {
          return condition.nodeId;
        }
        if (condition.hasTalked && hasSpokenBefore) {
          return condition.nodeId;
        }
      }
    }

    return dialogue.rootNodeId;
  }

  private async getNpcState(saveId: string, npcId: string, dialogue: DialogueTree): Promise<DialogueNpcState> {
    const stateMap = await this.getDialogueStateMap(saveId);
    const rootNodeId = await this.getEffectiveRootNodeId(saveId, npcId, dialogue);
    return resolveNpcState(stateMap[npcId], rootNodeId);
  }

  private async setCurrentNodeId(saveId: string, npcId: string, dialogue: DialogueTree, nodeId: string): Promise<void> {
    const stateMap = await this.getDialogueStateMap(saveId);
    const rootNodeId = await this.getEffectiveRootNodeId(saveId, npcId, dialogue);
    const current = resolveNpcState(stateMap[npcId], rootNodeId);
    stateMap[npcId] = { ...current, nodeId };
    await this.saveDialogueStateMap(saveId, stateMap);
  }

  private async markOptionSelected(saveId: string, npcId: string, dialogue: DialogueTree, optionId: string): Promise<void> {
    const stateMap = await this.getDialogueStateMap(saveId);
    const rootNodeId = await this.getEffectiveRootNodeId(saveId, npcId, dialogue);
    const current = resolveNpcState(stateMap[npcId], rootNodeId);

    if (!current.selected.includes(optionId)) {
      current.selected.push(optionId);
    }

    stateMap[npcId] = current;
    await this.saveDialogueStateMap(saveId, stateMap);
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

  private async passesInventoryGate(option: DialogueOption, saveId: string): Promise<boolean> {
    if (option.inventoryGate) {
      const item = await this.inventoryRepo.findItem(saveId, option.inventoryGate.itemId);
      return !!item;
    }

    if (option.inventoryTagGate) {
      const item = await this.inventoryRepo.findItemByTag(saveId, option.inventoryTagGate.tag);
      return !!item;
    }

    return true;
  }

  private async formatGateLabel(option: DialogueOption, saveId?: string): Promise<string | null> {
    if (option.inventoryGate) {
      if (!saveId) {
        return `Requires: ${option.inventoryGate.itemId}`;
      }

      const item = await this.inventoryRepo.findItem(saveId, option.inventoryGate.itemId);
      const itemLabel = item?.label ?? option.inventoryGate.itemId;
      return `Requires: ${itemLabel}`;
    }

    if (option.inventoryTagGate) {
      const item = saveId ? await this.inventoryRepo.findItemByTag(saveId, option.inventoryTagGate.tag) : null;
      return item ? `Uses: ${item.label}` : null;
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

  private async passesQuestGate(option: DialogueOption, saveId: string): Promise<boolean> {
    if (!option.questGate) {
      return true;
    }

    const questState = await this.gameStateRepo.getQuestState(saveId);
    if (!questState) return false;

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);
    return activeQuests.includes(option.questGate.questId) || completedQuests.includes(option.questGate.questId);
  }

  private async passesQuestGrantFilter(option: DialogueOption, saveId: string): Promise<boolean> {
    if (!option.questGrant) {
      return true;
    }

    const questState = await this.gameStateRepo.getQuestState(saveId);
    if (!questState) return true;

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);
    const failedQuests = safeJsonParse<string[]>(questState.failed_quests_json, []);
    return !activeQuests.includes(option.questGrant) && !completedQuests.includes(option.questGrant) && !failedQuests.includes(option.questGrant);
  }

  private async filterNode(
    node: DialogueNode,
    dialogue: DialogueTree,
    special: Record<string, number>,
    selectedOptionIds: string[],
    saveId?: string,
    npcId?: string
  ): Promise<FilteredDialogueNode> {
    const effectiveRoot = saveId && npcId ? await this.getEffectiveRootNodeId(saveId, npcId, dialogue) : dialogue.rootNodeId;
    const isRoot = node.id === effectiveRoot;
    const filteredOptions: FilteredDialogueOption[] = [];

    for (const option of node.options) {
      if (!this.passesGate(option, special)) {
        continue;
      }

      if (saveId && !(await this.passesInventoryGate(option, saveId))) {
        continue;
      }

      if (!saveId && (option.inventoryGate || option.inventoryTagGate)) {
        continue;
      }

      if (saveId && !(await this.passesQuestGate(option, saveId))) {
        continue;
      }

      if (!saveId && option.questGate) {
        continue;
      }

      if (saveId && !(await this.passesQuestGrantFilter(option, saveId))) {
        continue;
      }

      const capsCost = option.capsCost ?? null;
      let canAfford = true;
      if (capsCost !== null && saveId) {
        const capsItem = await this.inventoryRepo.findItem(saveId, "caps");
        canAfford = (capsItem?.quantity ?? 0) >= capsCost;
      }

      filteredOptions.push({
        id: option.id,
        label: option.label,
        specialGateLabel: await this.formatGateLabel(option, saveId),
        hasResponse: !!option.response,
        hasNext: !!option.next,
        grantsQuest: option.questGrant ?? null,
        failsQuest: option.questFail ?? null,
        returnToRoot: option.returnToRoot ?? false,
        alreadySelected: selectedOptionIds.includes(option.id),
        capsCost,
        canAfford
      });
    }

    if (!isRoot && !filteredOptions.some((option) => option.returnToRoot)) {
      filteredOptions.push({
        id: "__return_to_root",
        label: "Let's talk about something else.",
        specialGateLabel: null,
        hasResponse: false,
        hasNext: true,
        grantsQuest: null,
        failsQuest: null,
        returnToRoot: true,
        alreadySelected: false,
        capsCost: null,
        canAfford: true
      });
    }

    return {
      id: node.id,
      text: node.text,
      options: filteredOptions,
      isRoot
    };
  }

  private async grantQuest(saveId: string, questId: string): Promise<QuestDefinition | null> {
    const content = getGameContent();
    const questDef = content.quests.find((candidate) => candidate.id === questId);

    if (!questDef) {
      return null;
    }

    const questState = await this.gameStateRepo.getQuestState(saveId);

    if (!questState) {
      return null;
    }

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);
    const failedQuests = safeJsonParse<string[]>(questState.failed_quests_json, []);

    if (activeQuests.includes(questId) || completedQuests.includes(questId) || failedQuests.includes(questId)) {
      return null;
    }

    activeQuests.push(questId);

    await this.gameStateRepo.updateQuestState({
      ...questState,
      active_quests_json: JSON.stringify(activeQuests),
      updated_at: Date.now()
    });

    if (questDef.mapMarker?.locationId) {
      await this.revealQuestMarkerLocation(saveId, questDef.mapMarker.locationId);
    }

    return questDef;
  }

  private async completeQuest(saveId: string, questId: string): Promise<QuestCompletionResult | null> {
    const content = getGameContent();
    const questDef = content.quests.find((candidate) => candidate.id === questId);

    if (!questDef) {
      return null;
    }

    const questState = await this.gameStateRepo.getQuestState(saveId);

    if (!questState) {
      return null;
    }

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);

    if (completedQuests.includes(questId)) {
      return null;
    }

    const nextActive = activeQuests.filter((id) => id !== questId);
    completedQuests.push(questId);

    await this.gameStateRepo.updateQuestState({
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

    if (questDef.rewards) {
      if (questDef.rewards.karma) {
        result.karmaDelta = questDef.rewards.karma;
        await this.adjustKarma(saveId, questDef.rewards.karma);
      }

      if (questDef.rewards.factionDeltas) {
        for (const [factionId, delta] of Object.entries(questDef.rewards.factionDeltas)) {
          result.factionDeltas[factionId] = delta;
          await this.adjustFaction(saveId, factionId, delta);
        }
      }

      if (questDef.rewards.items) {
        for (const item of questDef.rewards.items) {
          await this.inventoryRepo.addItem({
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
        await this.inventoryRepo.addItem({
          save_id: saveId,
          item_id: "caps",
          label: "Caps",
          owned_by: null,
          quantity: questDef.rewards.caps,
          description: "Bottle caps - the universally accepted currency of the wasteland.",
          collected_at: Date.now()
        });
      }
    }

    await this.saveRepo.awardXp(saveId, 75);

    return result;
  }

  private async failQuest(saveId: string, questId: string): Promise<{ questId: string; questName: string } | null> {
    const content = getGameContent();
    const questDef = content.quests.find((q) => q.id === questId);

    if (!questDef) {
      return null;
    }

    const questState = await this.gameStateRepo.getQuestState(saveId);
    if (!questState) {
      return null;
    }

    const activeQuests = safeJsonParse<string[]>(questState.active_quests_json, []);
    const completedQuests = safeJsonParse<string[]>(questState.completed_quests_json, []);
    const failedQuests = safeJsonParse<string[]>(questState.failed_quests_json, []);

    if (completedQuests.includes(questId) || failedQuests.includes(questId)) {
      return null;
    }

    const nextActive = activeQuests.filter((id) => id !== questId);
    failedQuests.push(questId);

    await this.gameStateRepo.updateQuestState({
      ...questState,
      active_quests_json: JSON.stringify(nextActive),
      failed_quests_json: JSON.stringify(failedQuests),
      updated_at: Date.now()
    });

    return { questId, questName: questDef.name };
  }

  private async revealQuestMarkerLocation(saveId: string, locationId: string): Promise<void> {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = await this.gameStateRepo.getMapDiscovery(saveId);

    if (!worldState || !mapDiscovery) return;

    const region = content.regions.find((candidate) => candidate.id === worldState.current_region_id);
    if (!region) return;

    const regionLocations = getRegionLocations(content, region.id);
    const location = regionLocations.find((candidate) => candidate.id === locationId);
    if (!location) return;

    const discoveredLocationIds = safeJsonParse<string[]>(mapDiscovery.discovered_locations_json, []);
    const discoveredTileKeys = safeJsonParse<string[]>(mapDiscovery.discovered_tiles_json, []);

    if (discoveredLocationIds.includes(locationId)) return;

    discoveredLocationIds.push(locationId);
    const tileKey = `${location.position.x},${location.position.y}`;
    if (!discoveredTileKeys.includes(tileKey)) {
      discoveredTileKeys.push(tileKey);
    }

    await this.gameStateRepo.updateMapDiscovery({
      ...mapDiscovery,
      discovered_locations_json: JSON.stringify(discoveredLocationIds),
      discovered_tiles_json: JSON.stringify(discoveredTileKeys),
      updated_at: Date.now()
    });
  }

  private async adjustKarma(saveId: string, delta: number): Promise<void> {
    const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);

    if (!playerCharacter) {
      return;
    }

    await this.saveRepo.updateKarma(saveId, playerCharacter.karma + delta);
  }

  private async adjustFaction(saveId: string, factionId: string, delta: number): Promise<void> {
    const factionStanding = await this.gameStateRepo.getFactionStanding(saveId);

    if (!factionStanding) {
      return;
    }

    const standings = safeJsonParse<Record<string, number>>(factionStanding.standings_json, {});
    standings[factionId] = (standings[factionId] ?? 0) + delta;

    await this.gameStateRepo.updateFactionStanding({
      ...factionStanding,
      standings_json: JSON.stringify(standings),
      updated_at: Date.now()
    });
  }

  private async applyCompanionLoyaltyDelta(
    saveId: string,
    delta: number,
    reactionType: "positive" | "negative"
  ): Promise<{ companionId: string; loyaltyDelta: number; newLoyalty: number; reaction: string; departed: boolean } | null> {
    const companions = await this.companionRepo.getAll(saveId);
    const companion = companions[0];
    if (!companion) return null;

    const content = getGameContent();
    const companionDef = content.companions.find((candidate) => candidate.id === companion.companion_id);
    if (!companionDef) return null;

    const newLoyalty = Math.max(0, Math.min(100, companion.loyalty + delta));
    await this.companionRepo.updateLoyalty(saveId, companion.companion_id, newLoyalty);

    let reaction: string;
    let departed = false;

    if (newLoyalty === 0) {
      reaction = companionDef.reactions.farewell;
      await this.companionRepo.remove(saveId, companion.companion_id);
      departed = true;
    } else if (newLoyalty < 20) {
      reaction = companionDef.reactions.warning;
    } else {
      const lines = reactionType === "positive"
        ? companionDef.reactions.positive
        : companionDef.reactions.negative;
      reaction = lines[Math.floor(Math.random() * lines.length)]?.text ?? "...";
    }

    return { companionId: companion.companion_id, loyaltyDelta: delta, newLoyalty, reaction, departed };
  }
}
