import { useEffect, useMemo, useState } from "react";

import type { GameState, GoalCompletionResult, ConclusionInitiation } from "../lib/api.js";
import { collectItem, collectMapLoot, getCompanionStoryDialogue, lootBody, resetDialogue, respondToConclusion, savePlayerSpecial, setTaggedSkills } from "../lib/api.js";
import { interiorRuntimeAdapter } from "../lib/map/interior_adapter.js";
import { buildInteriorSceneModel } from "../lib/map/interior_scene_model.js";
import { useRetainedMapRuntime } from "../lib/map/map_runtime.js";
import { CharacterCreationPanel } from "./CharacterCreationPanel.js";
import { DialoguePanel } from "./DialoguePanel.js";
import { PlayerPanel } from "./PlayerPanel.js";
import { SkillAllocationPanel } from "./SkillAllocationPanel.js";
import { TaggedSkillsPanel } from "./TaggedSkillsPanel.js";

const CLASS_PRESETS: Record<string, { special: { str: number; per: number; end: number; cha: number; int: number; agl: number; lck: number }; taggedSkills: string[] }> = {
  // Key stats in spec order: 1st=8, 2nd=7, 3rd=6. Remaining fill to 30.
  class_lucky_charmer: { special: { str: 3, per: 3, end: 3, cha: 7, int: 3, agl: 3, lck: 8 }, taggedSkills: ["speech", "barter", "gambling"] },
  class_brawler:       { special: { str: 8, per: 2, end: 7, cha: 2, int: 2, agl: 6, lck: 3 }, taggedSkills: ["unarmed", "throwing", "melee_weapons"] },
  class_technician:    { special: { str: 2, per: 6, end: 2, cha: 2, int: 8, agl: 7, lck: 3 }, taggedSkills: ["science", "repair", "energy_weapons"] },
  class_dr_feelgood:   { special: { str: 3, per: 3, end: 3, cha: 7, int: 8, agl: 3, lck: 3 }, taggedSkills: ["first_aid", "science", "speech"] },
  class_rogue:         { special: { str: 3, per: 7, end: 3, cha: 3, int: 3, agl: 8, lck: 3 }, taggedSkills: ["sneak", "lockpick", "traps"] },
  class_commando:      { special: { str: 6, per: 2, end: 7, cha: 2, int: 2, agl: 8, lck: 3 }, taggedSkills: ["guns", "outdoorsman", "melee_weapons"] }
};

interface InteriorMapPanelProps {
  state: GameState;
  variant: "vault" | "location";
  onStep: (x: number, y: number) => void;
  onMoveSettled: (x: number, y: number) => void;
  onExit: (exitId: string) => void;
  onStateRefresh: (state: GameState) => void;
  onQuestGranted?: (questId: string) => void;
  pendingGoalCompletion?: GoalCompletionResult | null;
  onGoalCompletionDismissed?: () => void;
  pendingConclusion?: ConclusionInitiation | null;
  onConclusionDismissed?: () => void;
}


export function InteriorMapPanel({ state, variant, onStep, onMoveSettled, onExit, onStateRefresh, onQuestGranted, pendingGoalCompletion, onGoalCompletionDismissed, pendingConclusion, onConclusionDismissed }: InteriorMapPanelProps) {
  const map = state.currentInteriorMap;

  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeNpcResponseId, setActiveNpcResponseId] = useState<string | null>(null);
  const [activeDeadNpc, setActiveDeadNpc] = useState<{ id: string; name: string; weapon: string | null; looted: boolean } | null>(null);
  const [deadNpcResponse, setDeadNpcResponse] = useState<string | null>(null);
  const [activeLiveCombatNpc, setActiveLiveCombatNpc] = useState<{ id: string; name: string; hp: number; maxHp: number; ac: number; weapon: string | null } | null>(null);
  const [activeLootId, setActiveLootId] = useState<string | null>(null);
  const [activeInteractableId, setActiveInteractableId] = useState<string | null>(null);
  const [interactableResponse, setInteractableResponse] = useState<string | null>(null);
  const [examinedInteractables, setExaminedInteractables] = useState<Set<string>>(new Set());
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [pendingClassSpecial, setPendingClassSpecial] = useState<{ str: number; per: number; end: number; cha: number; int: number; agl: number; lck: number } | null>(null);
  const [pendingTaggedSkills, setPendingTaggedSkills] = useState<string[] | null>(null);
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);
  const [questToast, setQuestToast] = useState<string | null>(null);
  const [showTaggedSkills, setShowTaggedSkills] = useState(false);
  const [showSkillAllocation, setShowSkillAllocation] = useState(false);
  const [companionDialogue, setCompanionDialogue] = useState<{
    companionName: string;
    stageTitle: string;
    nodes: Array<{ id: string; text: string; options: Array<{ id: string; label: string; response?: string; next?: string }> }>;
    currentNodeId: string;
  } | null>(null);
  const [companionReactionBubble, setCompanionReactionBubble] = useState<{ companionName: string; text: string; departed: boolean } | null>(null);
  const [conclusionDialogue, setConclusionDialogue] = useState<{
    companionId: string;
    companionName: string;
    nodes: Array<{ id: string; text: string; options: Array<{ id: string; label: string; response?: string; next?: string }> }>;
    currentNodeId: string;
  } | null>(null);

  function getBodyFlavorText(npcName: string, intStat: number, firstAidSkill: number): string {
    if (intStat <= 3) {
      return `${npcName} is real still. Just... lying there. Sleeping, maybe.`;
    }
    if (firstAidSkill >= 50) {
      return `*You crouch down. ${npcName} took at least two rounds — tight grouping, close range. Death was fast.*`;
    }
    if (intStat >= 7) {
      return `${npcName} is down. Clean shot, center-mass. They're not getting up.`;
    }
    return `${npcName} is dead. Plain and simple.`;
  }

  const collectedLoot = useMemo(() => new Set(state.collectedItemIds), [state.collectedItemIds]);
  const collectedActions = useMemo(() => new Set(state.collectedActionIds), [state.collectedActionIds]);

  // Auto-trigger conclusion initiation dialogue
  useEffect(() => {
    if (pendingConclusion?.dialogueTree) {
      setActiveNpcId(null);
      setActiveLootId(null);
      setActiveInteractableId(null);
      setShowPlayerPanel(false);
      setCompanionDialogue(null);
      setConclusionDialogue({
        companionId: pendingConclusion.companionId,
        companionName: pendingConclusion.companionName,
        nodes: pendingConclusion.dialogueTree.nodes,
        currentNodeId: pendingConclusion.dialogueTree.rootNodeId
      });
      onConclusionDismissed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingConclusion]);

  // Auto-trigger goal completion dialogue when a goal is completed
  useEffect(() => {
    if (pendingGoalCompletion?.dialogueTree) {
      const companion = state.companions.find((c) => c.companionId === pendingGoalCompletion.companionId) ?? state.companions[0];
      const tree = pendingGoalCompletion.dialogueTree;
      setActiveNpcId(null);
      setActiveLootId(null);
      setActiveInteractableId(null);
      setShowPlayerPanel(false);
      setCompanionDialogue({
        companionName: companion?.name ?? "Companion",
        stageTitle: "Investigation",
        nodes: tree.nodes,
        currentNodeId: tree.rootNodeId
      });
      onGoalCompletionDismissed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGoalCompletion]);

  // Auto-trigger Old Timer dialogue on first entry when SPECIAL not set
  useEffect(() => {
    if (
      map?.id === "dusty_tavern_interior" &&
      state.playerCharacter.special === null &&
      !showCharacterCreation
    ) {
      setActiveNpcId("old_timer");
      setActiveNpcResponseId(null);
      setActiveLootId(null);
      setActiveInteractableId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map?.id, state.playerCharacter.special]);

  async function handleCollectItem(itemId: string, label: string, ownedBy?: string, quantity?: number, description?: string, actionId?: string, tags?: string[]) {
    try {
      const { result, state: newState } = await collectItem(itemId, label, ownedBy, quantity, description, actionId, tags);
      onStateRefresh(newState);

      if (result.companionReaction) {
        const companion = newState.companions.find((c) => c.companionId === result.companionReaction!.companionId);
        setCompanionReactionBubble({
          companionName: companion?.name ?? result.companionReaction.companionId,
          text: result.companionReaction.reaction,
          departed: result.companionReaction.departed
        });
      }
    } catch {
      // Collection failed
    }
  }

  function openCharCreationWithPreset(classOptionId: string) {
    const preset = CLASS_PRESETS[classOptionId];
    if (!preset) return;
    setActiveNpcId(null);
    setPendingClassSpecial(preset.special);
    setPendingTaggedSkills(preset.taggedSkills);
    setShowCharacterCreation(true);
  }

  function handleCompanionClick(companionId: string) {
    const companion = state.companions.find((c) => c.companionId === companionId);
    if (!companion) return;

    setActiveNpcId(null);
    setActiveLootId(null);
    setActiveInteractableId(null);
    setShowPlayerPanel(false);

    getCompanionStoryDialogue(companionId)
      .then(({ storyDialogue }) => {
        if (storyDialogue?.dialogue) {
          setCompanionDialogue({
            companionName: companion.name,
            stageTitle: storyDialogue.stageTitle,
            nodes: storyDialogue.dialogue.nodes,
            currentNodeId: storyDialogue.dialogue.rootNodeId
          });
        }
      })
      .catch(() => { /* silently fail */ });
  }

  const scene = buildInteriorSceneModel(state, collectedLoot);

  const sceneHostRef = useRetainedMapRuntime(scene, interiorRuntimeAdapter, {
    onStep,
    onMoveSettled,
    onExit,
    onNpcClick: (npcId) => {
      const combatNpc = state.combatState?.npcs.find((n) => n.id === npcId);
      if (combatNpc?.dead) {
        setActiveDeadNpc({ id: npcId, name: combatNpc.name, weapon: combatNpc.weapon, looted: combatNpc.looted });
        setDeadNpcResponse(null);
        setActiveLiveCombatNpc(null);
        setActiveNpcId(null);
        setActiveNpcResponseId(null);
        setActiveLootId(null);
        setActiveInteractableId(null);
        setShowPlayerPanel(false);
        setCompanionDialogue(null);
        return;
      }
      if (combatNpc && !combatNpc.dead) {
        setActiveLiveCombatNpc({ id: combatNpc.id, name: combatNpc.name, hp: combatNpc.hp, maxHp: combatNpc.maxHp, ac: combatNpc.ac, weapon: combatNpc.weapon });
        setActiveDeadNpc(null);
        setActiveNpcId(null);
        setActiveNpcResponseId(null);
        setActiveLootId(null);
        setActiveInteractableId(null);
        setShowPlayerPanel(false);
        setCompanionDialogue(null);
        return;
      }
      setActiveLiveCombatNpc(null);
      setActiveNpcId(npcId);
      setActiveNpcResponseId(null);
      setActiveLootId(null);
      setActiveInteractableId(null);
      setShowPlayerPanel(false);
      setCompanionDialogue(null);
    },
    onLootClick: (lootId) => {
      const isMapLoot = state.mapLoot.some((l) => l.id === lootId);
      if (isMapLoot || !collectedLoot.has(lootId)) {
        setActiveLootId(lootId);
        setActiveNpcId(null);
        setActiveInteractableId(null);
        setShowPlayerPanel(false);
        setCompanionDialogue(null);
      }
    },
    onInteractableClick: (interactableId) => {
      setActiveInteractableId(interactableId);
      setInteractableResponse(null);
      setActiveNpcId(null);
      setActiveLootId(null);
      setShowPlayerPanel(false);
      setCompanionDialogue(null);
    },
    onCompanionClick: (companionId) => {
      handleCompanionClick(companionId);
    },
    onPlayerClick: () => {
      setShowPlayerPanel(true);
      setActiveNpcId(null);
      setActiveLootId(null);
      setActiveInteractableId(null);
      setCompanionDialogue(null);
    }
  });

  if (!map) {
    return null;
  }

  const activeNpc = activeNpcId ? map.npcs.find((n) => n.id === activeNpcId) : null;
  const activeMapLootItem = activeLootId ? state.mapLoot.find((l) => l.id === activeLootId) : null;
  const activeLootDef = activeLootId && !activeMapLootItem ? map.loot.find((l) => l.id === activeLootId) : null;
  const activeInteractable = activeInteractableId ? map.interactables.find((i) => i.id === activeInteractableId) : null;
  const isOldTimerActive = activeNpcId === "old_timer";
  const needsCharCreation = state.playerCharacter.special === null;

  return (
    <section className={`panel interior-panel ${variant === "vault" ? "is-vault" : "is-location"}`}>
      <div className="interior-copy">
        <div>
          <p className="eyebrow">{variant === "vault" ? "Vault Home" : state.currentLocation?.name ?? "Interior"}</p>
          <h2>{map.name}</h2>
        </div>
        <div className="hero-meta">
          <span>{map.theme}</span>
          <span>
            {state.worldState.player_x},{state.worldState.player_y}
          </span>
        </div>
      </div>

      <div className="scene-shell">
        <div ref={sceneHostRef} className={`scene-surface interior-surface ${variant === "vault" ? "is-vault" : "is-location"}`} />

        {/* Character Creation Overlay */}
        {showCharacterCreation && (
          <CharacterCreationPanel
            initialSpecial={pendingClassSpecial ?? undefined}
            onComplete={(newState, questCompleted) => {
              setShowCharacterCreation(false);
              onStateRefresh(newState);
              if (questCompleted) {
                setQuestToast(`Quest complete: ${questCompleted}`);
                setTimeout(() => setQuestToast(null), 4000);
                onQuestGranted?.(questCompleted);
              }
              // Class preset: auto-tag skills, no manual tag selection needed
              if (pendingTaggedSkills) {
                const skills = pendingTaggedSkills;
                setPendingTaggedSkills(null);
                setPendingClassSpecial(null);
                void setTaggedSkills(skills).then(({ state: finalState }) => {
                  onStateRefresh(finalState);
                }).catch(() => { /* silently fail */ });
              } else {
                // Custom path: always show tagged skills selector
                setPendingClassSpecial(null);
                setTimeout(() => setShowTaggedSkills(true), 500);
              }
            }}
            onCancel={() => {
              setShowCharacterCreation(false);
              setPendingClassSpecial(null);
              setPendingTaggedSkills(null);
              // Reset Doc Mitchell's dialogue so next click starts fresh
              void resetDialogue("old_timer").catch(() => { /* silently fail */ });
            }}
          />
        )}

        {/* NPC Dialogue Panel */}
        {activeNpc?.dialogue && !showCharacterCreation && (
          <DialoguePanel
            npcId={activeNpc.id}
            npcName={activeNpc.name}
            factionId={activeNpc.factionId}
            state={state}
            onClose={() => { setActiveNpcId(null); setActiveNpcResponseId(null); }}
            onStateRefresh={onStateRefresh}
            onBeginCharCreation={isOldTimerActive && needsCharCreation ? () => {
              setActiveNpcId(null);
              setShowCharacterCreation(true);
            } : undefined}
            onOptionSelected={isOldTimerActive ? (optionId) => {
              if (optionId.startsWith("class_")) {
                openCharCreationWithPreset(optionId);
              } else if (optionId === "open_creation") {
                setActiveNpcId(null);
                setPendingClassSpecial(null);
                setPendingTaggedSkills(null);
                setShowCharacterCreation(true);
              }
            } : undefined}
            onCompanionReaction={(reaction) => {
              const companion = state.companions.find((c) => c.companionId === reaction.companionId);
              setCompanionReactionBubble({
                companionName: companion?.name ?? reaction.companionId,
                text: reaction.reaction,
                departed: reaction.departed
              });
            }}
            onQuestCompleted={(text) => {
              setQuestToast(text);
              setTimeout(() => setQuestToast(null), 4000);
            }}
            onQuestGranted={onQuestGranted}
          />
        )}

        {/* Dead NPC Body Panel */}
        {activeDeadNpc && (() => {
          const intStat = state.playerCharacter.special?.int ?? 5;
          const firstAidSkill = state.playerCharacter.skills?.values.first_aid ?? 0;
          const weaponDef = activeDeadNpc.weapon ? state.weaponCatalog.find((w) => w.id === activeDeadNpc.weapon) : null;
          return (
            <div className="interaction-panel interactable-panel">
              <div className="interaction-panel-header">
                <span className="eyebrow">{activeDeadNpc.name}</span>
                <button
                  className="ghost-button interaction-close"
                  type="button"
                  onClick={() => { setActiveDeadNpc(null); setDeadNpcResponse(null); }}
                >
                  ×
                </button>
              </div>
              {deadNpcResponse ? (
                <p className="interactable-response">{deadNpcResponse}</p>
              ) : (
                <p className="interactable-response">{getBodyFlavorText(activeDeadNpc.name, intStat, firstAidSkill)}</p>
              )}
              <div className="interaction-options">
                {!activeDeadNpc.looted && (
                  <button
                    className="ghost-button interaction-option"
                    type="button"
                    onClick={() => {
                      void lootBody(activeDeadNpc.id).then(({ weaponLabel, itemLabels, state: newState }) => {
                        onStateRefresh(newState);
                        setActiveDeadNpc((prev) => prev ? { ...prev, looted: true } : prev);
                        const taken = [
                          ...(weaponLabel ? [`the ${weaponLabel} and a handful of rounds`] : []),
                          ...itemLabels
                        ];
                        setDeadNpcResponse(taken.length > 0
                          ? `You take ${taken.join(", ")} off the body.`
                          : "Nothing worth taking."
                        );
                      }).catch(() => {
                        setDeadNpcResponse("Couldn't loot the body.");
                      });
                    }}
                  >
                    Loot body{weaponDef ? ` — ${weaponDef.name}` : ""}
                  </button>
                )}
                {activeDeadNpc.looted && !deadNpcResponse && (
                  <button className="ghost-button interaction-option" type="button" disabled>
                    Already looted
                  </button>
                )}
                <button
                  className="ghost-button interaction-option"
                  type="button"
                  onClick={() => { setActiveDeadNpc(null); setDeadNpcResponse(null); }}
                >
                  Leave
                </button>
              </div>
            </div>
          );
        })()}

        {/* Living combat NPC info panel */}
        {activeLiveCombatNpc && (
          <div className="interaction-panel interactable-panel">
            <div className="interaction-panel-header">
              <span className="eyebrow">{activeLiveCombatNpc.name}</span>
              <button
                className="ghost-button interaction-close"
                type="button"
                onClick={() => setActiveLiveCombatNpc(null)}
              >
                ×
              </button>
            </div>
            <p className="interactable-response">
              {activeLiveCombatNpc.weapon
                ? (() => {
                  const w = state.weaponCatalog.find((w) => w.id === activeLiveCombatNpc.weapon);
                  return w ? `Armed with ${w.name}.` : "Armed.";
                })()
                : "Unarmed."}
              {" "}HP: {activeLiveCombatNpc.hp}/{activeLiveCombatNpc.maxHp}. AC: {activeLiveCombatNpc.ac}.
            </p>
            <div className="interaction-options">
              <button
                className="ghost-button interaction-option"
                type="button"
                onClick={() => setActiveLiveCombatNpc(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Dropped Map Loot Panel (thrown weapons etc.) */}
        {activeMapLootItem && (
          <div className="interaction-panel loot-panel">
            <div className="interaction-panel-header">
              <span className="eyebrow is-loot">{activeMapLootItem.label}</span>
              <button
                className="ghost-button interaction-close"
                type="button"
                onClick={() => setActiveLootId(null)}
              >
                ×
              </button>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    const { state: newState } = await collectMapLoot(activeMapLootItem.id);
                    onStateRefresh(newState);
                  } catch { /* ignore */ }
                })();
                setActiveLootId(null);
              }}
            >
              Pick up
            </button>
          </div>
        )}

        {/* Loot Panel */}
        {activeLootDef && (
          <div className="interaction-panel loot-panel">
            <div className="interaction-panel-header">
              <span className={`eyebrow ${activeLootDef.ownedBy ? "is-steal" : "is-loot"}`}>
                {activeLootDef.label}
              </span>
              <button
                className="ghost-button interaction-close"
                type="button"
                onClick={() => setActiveLootId(null)}
              >
                ×
              </button>
            </div>
            <button
              className={`primary-button${activeLootDef.ownedBy ? " steal-button" : ""}`}
              type="button"
              onClick={() => {
                void handleCollectItem(activeLootDef.id, activeLootDef.label, activeLootDef.ownedBy, undefined, activeLootDef.description, undefined, activeLootDef.tags);
                setActiveLootId(null);
              }}
            >
              {activeLootDef.ownedBy ? "Steal" : "Take"}
            </button>
          </div>
        )}

        {/* Interactable Panel */}
        {activeInteractable && (
          <div className="interaction-panel interactable-panel">
            <div className="interaction-panel-header">
              <span className="eyebrow">{activeInteractable.label}</span>
              <button
                className="ghost-button interaction-close"
                type="button"
                onClick={() => { setActiveInteractableId(null); setInteractableResponse(null); }}
              >
                ×
              </button>
            </div>
            {interactableResponse && (
              <p className="interactable-response">{interactableResponse}</p>
            )}
            <div className="interaction-options">
              {(activeInteractable.actions ?? []).map((action) => {
                const alreadyCollected =
                  (action.steal || action.grant) && collectedActions.has(action.id);
                const isItemAction = !!(action.steal || action.grant);
                const hasBeenExamined = examinedInteractables.has(activeInteractable.id);

                // Hide item actions until an examine-type action has been clicked
                if (isItemAction && !hasBeenExamined) return null;

                return (
                  <button
                    key={action.id}
                    className={`ghost-button interaction-option${action.steal ? " is-steal" : ""}${alreadyCollected ? " is-collected" : ""}`}
                    type="button"
                    disabled={!!alreadyCollected}
                    onClick={() => {
                      if (alreadyCollected) return;
                      if (action.steal) {
                        void handleCollectItem(action.steal.itemId, action.steal.label, action.steal.ownedBy, action.steal.quantity, action.steal.description, action.id, action.steal.tags);
                        setInteractableResponse(action.response ?? `Took ${action.steal.label}.`);
                      } else if (action.grant) {
                        void handleCollectItem(action.grant.itemId, action.grant.label, undefined, action.grant.quantity, action.grant.description, action.id, action.grant.tags);
                        setInteractableResponse(action.response ?? `Received ${action.grant.label}.`);
                      } else if (action.response) {
                        setInteractableResponse(action.response);
                        setExaminedInteractables((prev) => new Set(prev).add(activeInteractable.id));
                      }
                    }}
                  >
                    {action.label}{alreadyCollected ? " (taken)" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Companion Speech Bubble Indicator */}
        {(() => {
          const companionWithStory = !companionDialogue && !activeNpcId && !showCharacterCreation
            ? state.companions.find((c) => c.hasNewStory)
            : null;
          return companionWithStory ? (
            <div className="companion-speech-indicator" onClick={() => handleCompanionClick(companionWithStory.companionId)}>
              <span className="companion-speech-name">{companionWithStory.name}</span>
              <span className="companion-speech-dots">...</span>
            </div>
          ) : null;
        })()}

        {/* Companion Interactive Dialogue */}
        {companionDialogue && (() => {
          const currentNode = companionDialogue.nodes.find((n) => n.id === companionDialogue.currentNodeId);
          if (!currentNode) return null;
          return (
            <div className="interaction-panel companion-story-panel">
              <div className="interaction-panel-header">
                <span className="eyebrow">{companionDialogue.companionName} &middot; {companionDialogue.stageTitle}</span>
                <button
                  className="ghost-button interaction-close"
                  type="button"
                  onClick={() => setCompanionDialogue(null)}
                >
                  ×
                </button>
              </div>
              <p className="companion-story-text">{currentNode.text}</p>
              <div className="interaction-options">
                {currentNode.options.map((option) => (
                  <button
                    key={option.id}
                    className="ghost-button interaction-option"
                    type="button"
                    onClick={() => {
                      if (option.next) {
                        setCompanionDialogue({ ...companionDialogue, currentNodeId: option.next });
                      } else {
                        setCompanionDialogue(null);
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                {currentNode.options.length === 0 && (
                  <button
                    className="ghost-button interaction-option"
                    type="button"
                    onClick={() => setCompanionDialogue(null)}
                  >
                    End conversation
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Conclusion Initiation Dialogue */}
        {conclusionDialogue && (() => {
          const currentNode = conclusionDialogue.nodes.find((n) => n.id === conclusionDialogue.currentNodeId);
          if (!currentNode) return null;

          async function handleConclusionOption(option: { id: string; label: string; response?: string; next?: string }) {
            if (option.next) {
              setConclusionDialogue((prev) => prev ? { ...prev, currentNodeId: option.next! } : prev);
              return;
            }
            // Terminal node — determine accept/decline from option id
            const accepted = option.id === "accept" || option.id === "shake";
            try {
              const { state: newState } = await respondToConclusion(conclusionDialogue!.companionId, accepted);
              onStateRefresh(newState);
            } catch {
              // silently fail
            }
            setConclusionDialogue(null);
          }

          return (
            <div className="interaction-panel companion-story-panel">
              <div className="interaction-panel-header">
                <span className="eyebrow">{conclusionDialogue.companionName} &middot; The Reckoning</span>
              </div>
              <p className="companion-story-text">{currentNode.text}</p>
              <div className="interaction-options">
                {currentNode.options.map((option) => (
                  <button
                    key={option.id}
                    className="ghost-button interaction-option"
                    type="button"
                    onClick={() => void handleConclusionOption(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Companion Reaction Bubble */}
        {companionReactionBubble && (
          <div className="interaction-panel companion-story-panel">
            <div className="interaction-panel-header">
              <span className="eyebrow">{companionReactionBubble.companionName}{companionReactionBubble.departed ? " (departing)" : ""}</span>
              <button
                className="ghost-button interaction-close"
                type="button"
                onClick={() => setCompanionReactionBubble(null)}
              >
                ×
              </button>
            </div>
            <p className="companion-story-text">{companionReactionBubble.text}</p>
            <button
              className="ghost-button interaction-option"
              type="button"
              onClick={() => setCompanionReactionBubble(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Player Panel */}
        {showPlayerPanel && (
          <PlayerPanel
            state={state}
            onClose={() => setShowPlayerPanel(false)}
          />
        )}

        {/* Tagged Skills Selection */}
        {showTaggedSkills && (
          <TaggedSkillsPanel
            special={state.playerCharacter.special!}
            onComplete={(newState) => {
              setShowTaggedSkills(false);
              onStateRefresh(newState);
              // If skill points are available after tagging, prompt allocation
              if (newState.playerCharacter.skills && newState.playerCharacter.skills.unspentPoints > 0) {
                setTimeout(() => setShowSkillAllocation(true), 500);
              }
            }}
          />
        )}

        {/* Skill Allocation Panel */}
        {showSkillAllocation && state.playerCharacter.skills && (
          <SkillAllocationPanel
            state={state}
            onComplete={(newState) => {
              setShowSkillAllocation(false);
              onStateRefresh(newState);
            }}
            onClose={() => setShowSkillAllocation(false)}
          />
        )}

        {/* Skill Points Notification */}
        {!showSkillAllocation && !showTaggedSkills && !showCharacterCreation && state.playerCharacter.skills && state.playerCharacter.skills.unspentPoints > 0 && (
          <button
            className="skill-points-notify"
            type="button"
            onClick={() => setShowSkillAllocation(true)}
          >
            {state.playerCharacter.skills.unspentPoints} skill points available
          </button>
        )}

        {/* Quest Toast */}
        {questToast && (
          <div className="quest-toast">{questToast}</div>
        )}
      </div>

      <div className="detail-grid scene-detail-grid">
        <div>
          <h3>Known locations</h3>
          <div className="location-chip-list">
            {state.locations.filter((l) => l.discovered).map((loc) => (
              <span key={loc.id} className={`location-chip${loc.id === state.worldState.current_location_id ? " is-current" : ""}`}>
                {loc.name}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3>Current tile</h3>
          {(() => {
            const px = state.worldState.player_x;
            const py = state.worldState.player_y;
            const nearbyExits = map.exits.filter((exit) =>
              px !== null && py !== null &&
              Math.abs(exit.x - px) <= 1 && Math.abs(exit.y - py) <= 1
            );
            if (nearbyExits.length === 0) {
              return <p className="subtle">Move toward the exit to leave.</p>;
            }
            // Deduplicate exits that go to the same target (e.g. double doors).
            // Prefer the exit the player is standing on so the backend check passes.
            const byTarget = new Map<string, typeof nearbyExits[0]>();
            for (const exit of nearbyExits) {
              const existing = byTarget.get(exit.target);
              if (!existing || (exit.x === px && exit.y === py)) {
                byTarget.set(exit.target, exit);
              }
            }
            const uniqueExits = Array.from(byTarget.values());
            return (
              <div className="location-actions">
                {uniqueExits.map((exit) => (
                  <button key={exit.id} className="primary-button" type="button" onClick={() => onExit(exit.id)}>
                    Leave {map.name}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
