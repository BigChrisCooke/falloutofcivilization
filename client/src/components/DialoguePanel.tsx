import { useCallback, useEffect, useRef, useState } from "react";

import type { DialogueNode, DialogueSelectResult, GameState } from "../lib/api.js";
import { getDialogueNode, resetDialogue, selectDialogueOption } from "../lib/api.js";

interface DialoguePanelProps {
  npcId: string;
  npcName: string;
  factionId?: string;
  state: GameState;
  onClose: () => void;
  onStateRefresh: (state: GameState) => void;
  onBeginCharCreation?: () => void;
  onOptionSelected?: (optionId: string) => void;
  onCompanionReaction?: (reaction: { companionId: string; reaction: string; departed: boolean }) => void;
  onQuestCompleted?: (text: string) => void;
  onQuestGranted?: (questId: string) => void;
}

export function DialoguePanel({
  npcId,
  npcName,
  factionId,
  state,
  onClose,
  onStateRefresh,
  onBeginCharCreation,
  onOptionSelected,
  onCompanionReaction,
  onQuestCompleted,
  onQuestGranted
}: DialoguePanelProps) {
  const [node, setNode] = useState<DialogueNode | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [questNotification, setQuestNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [justSelectedId, setJustSelectedId] = useState<string | null>(null);
  const [questFlash, setQuestFlash] = useState(false);
  const cooldownRef = useRef(false);

  const loadNode = useCallback(async () => {
    try {
      const { node: fetchedNode } = await getDialogueNode(npcId);
      setNode(fetchedNode);
      setLastResponse(null);
    } catch {
      // NPC has no dialogue
    }
  }, [npcId]);

  useEffect(() => {
    loadNode();
  }, [loadNode]);

  async function handleOptionClick(optionId: string) {
    if (loading || cooldownRef.current) {
      return;
    }

    // Hide the clicked option immediately
    setJustSelectedId(optionId);

    // Handle the auto-injected return-to-root option
    if (optionId === "__return_to_root") {
      try {
        const { node: rootNode } = await resetDialogue(npcId);
        setNode(rootNode);

        setLastResponse(null);
        setQuestNotification(null);
        setJustSelectedId(null);
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 400);
      } catch {
        // Ignore
      }

      return;
    }

    setLoading(true);

    try {
      const { result, state: newState } = await selectDialogueOption(npcId, optionId);

      if (result.questGranted) {
        setQuestNotification(`Quest added: ${result.questGranted.name}`);
        setTimeout(() => setQuestNotification(null), 4000);
        onQuestGranted?.(result.questGranted.id);
      }

      if (result.questFailed) {
        setQuestNotification(`Quest failed: ${result.questFailed.questName}`);
        setQuestFlash(true);
        setTimeout(() => { setQuestNotification(null); setQuestFlash(false); }, 4000);
      }

      if (result.questCompleted) {
        const qc = result.questCompleted;
        const rewardParts: string[] = [];
        if (qc.karmaDelta) rewardParts.push(`+${qc.karmaDelta} Karma`);
        if (qc.capsGranted) rewardParts.push(`${qc.capsGranted} Caps`);
        for (const item of qc.itemsGranted) {
          rewardParts.push(`${item.label}${item.quantity > 1 ? ` x${item.quantity}` : ""}`);
        }
        for (const [faction, delta] of Object.entries(qc.factionDeltas)) {
          rewardParts.push(`+${delta} ${faction}`);
        }
        const rewardText = rewardParts.length > 0 ? ` — ${rewardParts.join(", ")}` : "";
        const toastText = `Quest complete: ${qc.questName}${rewardText}`;
        setQuestNotification(toastText);
        setQuestFlash(true);
        setTimeout(() => setQuestFlash(false), 600);
        onQuestCompleted?.(toastText);
      }

      if (result.companionReaction) {
        onCompanionReaction?.({
          companionId: result.companionReaction.companionId,
          reaction: result.companionReaction.reaction,
          departed: result.companionReaction.departed
        });
      }

      if (result.response) {
        setLastResponse(result.response);
      } else {
        setLastResponse(null);
      }

      if (result.nextNode) {
        setNode(result.nextNode);
        setJustSelectedId(null);
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 400);
      }

      onStateRefresh(newState);
      onOptionSelected?.(optionId);
    } catch {
      // Ignore failed selections
    } finally {
      setLoading(false);
    }
  }

  if (!node) {
    return null;
  }

  const isOldTimer = npcId === "old_timer";
  const needsCharCreation = state.playerCharacter.special === null;
  const factionValue = factionId ? state.factionStanding[factionId] ?? 0 : null;

  return (
    <div className="interaction-panel npc-panel">
      <div className="interaction-panel-header">
        <span className="eyebrow">{npcName}</span>
        {factionValue !== null && (
          <span className="faction-standing">Standing: {factionValue}</span>
        )}
        <button
          className="ghost-button interaction-close"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <p className="interaction-greeting">{node.text}</p>

      {lastResponse && (
        <p className="interaction-response">{lastResponse}</p>
      )}

      {questNotification && (
        <p
          className={`quest-notification clickable${questFlash ? " quest-complete-flash" : ""}`}
          onClick={() => setQuestNotification(null)}
        >
          {questNotification}
        </p>
      )}

      <div className="interaction-options">
        {node.options
          .filter((opt) => opt.id !== justSelectedId)
          .map((opt) => (
          <button
            key={opt.id}
            className={`ghost-button interaction-option${opt.specialGateLabel ? " has-gate" : ""}${opt.grantsQuest ? " grants-quest" : ""}${opt.failsQuest ? " fails-quest" : ""}${opt.alreadySelected ? " is-selected" : ""}`}
            type="button"
            disabled={loading}
            onClick={() => handleOptionClick(opt.id)}
          >
            {opt.specialGateLabel && (
              <span className="special-gate-tag">[{opt.specialGateLabel}]</span>
            )}
            {" "}
            {opt.label}
          </button>
        ))}
      </div>

      {isOldTimer && needsCharCreation && onBeginCharCreation && (
        <button
          className="primary-button"
          style={{ marginTop: "0.75rem" }}
          type="button"
          onClick={onBeginCharCreation}
        >
          Begin character creation →
        </button>
      )}
    </div>
  );
}
