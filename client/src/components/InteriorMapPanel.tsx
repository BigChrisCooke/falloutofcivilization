import { useEffect, useMemo, useState } from "react";

import type { GameState } from "../lib/api.js";
import { collectItem, getCompanionStoryDialogue } from "../lib/api.js";
import { interiorRuntimeAdapter } from "../lib/map/interior_adapter.js";
import { buildInteriorSceneModel } from "../lib/map/interior_scene_model.js";
import { useRetainedMapRuntime } from "../lib/map/map_runtime.js";
import { CharacterCreationPanel } from "./CharacterCreationPanel.js";
import { DialoguePanel } from "./DialoguePanel.js";
import { PlayerPanel } from "./PlayerPanel.js";

interface InteriorMapPanelProps {
  state: GameState;
  variant: "vault" | "location";
  onMove: (x: number, y: number) => Promise<void>;
  onExit: (exitId: string) => void;
  onStateRefresh: (state: GameState) => void;
}


export function InteriorMapPanel({ state, variant, onMove, onExit, onStateRefresh }: InteriorMapPanelProps) {
  const map = state.currentInteriorMap;

  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeNpcResponseId, setActiveNpcResponseId] = useState<string | null>(null);
  const [activeLootId, setActiveLootId] = useState<string | null>(null);
  const [activeInteractableId, setActiveInteractableId] = useState<string | null>(null);
  const [interactableResponse, setInteractableResponse] = useState<string | null>(null);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);
  const [oldTimerChoices, setOldTimerChoices] = useState<string[]>([]);
  const [companionStoryBubble, setCompanionStoryBubble] = useState<{ companionName: string; stageTitle: string; text: string } | null>(null);
  const [storyBubbleDismissed, setStoryBubbleDismissed] = useState(false);
  const [companionReactionBubble, setCompanionReactionBubble] = useState<{ companionName: string; text: string; departed: boolean } | null>(null);

  const collectedLoot = useMemo(() => new Set(state.collectedItemIds), [state.collectedItemIds]);
  const collectedActions = useMemo(() => new Set(state.collectedActionIds), [state.collectedActionIds]);

  // Check for companion story dialogue on interior entry
  useEffect(() => {
    if (state.companions.length === 0 || storyBubbleDismissed) return;
    const companion = state.companions[0];
    if (!companion) return;

    getCompanionStoryDialogue(companion.companionId)
      .then(({ storyDialogue }) => {
        if (storyDialogue?.dialogue) {
          const rootNode = storyDialogue.dialogue.nodes.find(
            (n) => n.id === storyDialogue.dialogue.rootNodeId
          );
          if (rootNode) {
            setCompanionStoryBubble({
              companionName: companion.name,
              stageTitle: storyDialogue.stageTitle,
              text: rootNode.text
            });
          }
        }
      })
      .catch(() => { /* silently fail */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map?.id, state.companions.length]);

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

  async function handleCollectItem(itemId: string, label: string, ownedBy?: string, quantity?: number, description?: string, actionId?: string) {
    try {
      const { result, state: newState } = await collectItem(itemId, label, ownedBy, quantity, description, actionId);
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

  const scene = buildInteriorSceneModel(state, collectedLoot);

  const sceneHostRef = useRetainedMapRuntime(scene, interiorRuntimeAdapter, {
    onMove,
    onExit,
    onNpcClick: (npcId) => {
      setActiveNpcId(npcId);
      setActiveNpcResponseId(null);
      setActiveLootId(null);
      setActiveInteractableId(null);
      setShowPlayerPanel(false);
    },
    onLootClick: (lootId) => {
      if (!collectedLoot.has(lootId)) {
        setActiveLootId(lootId);
        setActiveNpcId(null);
        setActiveInteractableId(null);
        setShowPlayerPanel(false);
      }
    },
    onInteractableClick: (interactableId) => {
      setActiveInteractableId(interactableId);
      setInteractableResponse(null);
      setActiveNpcId(null);
      setActiveLootId(null);
      setShowPlayerPanel(false);
    },
    onPlayerClick: () => {
      setShowPlayerPanel(true);
      setActiveNpcId(null);
      setActiveLootId(null);
      setActiveInteractableId(null);
    }
  });

  if (!map) {
    return null;
  }

  const activeNpc = activeNpcId ? map.npcs.find((n) => n.id === activeNpcId) : null;
  const activeLootDef = activeLootId ? map.loot.find((l) => l.id === activeLootId) : null;
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
            initialChoices={oldTimerChoices}
            onComplete={(newState) => {
              setShowCharacterCreation(false);
              onStateRefresh(newState);
            }}
            onCancel={() => setShowCharacterCreation(false)}
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
              if (optionId.startsWith("q1_") || optionId.startsWith("q2_") || optionId.startsWith("q3_")) {
                setOldTimerChoices((prev) => [...prev.filter((c) => c.substring(0, 2) !== optionId.substring(0, 2)), optionId]);
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
          />
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
                void handleCollectItem(activeLootDef.id, activeLootDef.label, activeLootDef.ownedBy, undefined, activeLootDef.description);
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

                return (
                  <button
                    key={action.id}
                    className={`ghost-button interaction-option${action.steal ? " is-steal" : ""}${alreadyCollected ? " is-collected" : ""}`}
                    type="button"
                    disabled={!!alreadyCollected}
                    onClick={() => {
                      if (alreadyCollected) return;
                      if (action.steal) {
                        void handleCollectItem(action.steal.itemId, action.steal.label, action.steal.ownedBy, action.steal.quantity, action.steal.description, action.id);
                        setInteractableResponse(action.response ?? `Took ${action.steal.label}.`);
                      } else if (action.grant) {
                        void handleCollectItem(action.grant.itemId, action.grant.label, undefined, action.grant.quantity, action.grant.description, action.id);
                        setInteractableResponse(action.response ?? `Received ${action.grant.label}.`);
                      } else if (action.response) {
                        setInteractableResponse(action.response);
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

        {/* Companion Story Bubble */}
        {companionStoryBubble && !storyBubbleDismissed && !activeNpcId && !showCharacterCreation && (
          <div className="interaction-panel companion-story-panel">
            <div className="interaction-panel-header">
              <span className="eyebrow">{companionStoryBubble.companionName} &middot; {companionStoryBubble.stageTitle}</span>
              <button
                className="ghost-button interaction-close"
                type="button"
                onClick={() => setStoryBubbleDismissed(true)}
              >
                ×
              </button>
            </div>
            <p className="companion-story-text">{companionStoryBubble.text}</p>
            <button
              className="ghost-button interaction-option"
              type="button"
              onClick={() => setStoryBubbleDismissed(true)}
            >
              Dismiss
            </button>
          </div>
        )}

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
            // Deduplicate exits that go to the same target (e.g. double doors)
            const seenTargets = new Set<string>();
            const uniqueExits = nearbyExits.filter((exit) => {
              if (seenTargets.has(exit.target)) return false;
              seenTargets.add(exit.target);
              return true;
            });
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
