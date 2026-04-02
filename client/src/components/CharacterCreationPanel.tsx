import { useState } from "react";

import type { GameState } from "../lib/api.js";
import { savePlayerSpecial } from "../lib/api.js";

interface Special {
  str: number;
  per: number;
  end: number;
  cha: number;
  int: number;
  agl: number;
  lck: number;
}

interface CharacterCreationPanelProps {
  onComplete: (state: GameState, questCompleted?: string) => void;
  onCancel: () => void;
  initialSpecial?: Special;
}

const BASE: Special = { str: 3, per: 3, end: 3, cha: 3, int: 3, agl: 3, lck: 3 };

const ATTR_LABELS: Record<keyof Special, string> = {
  str: "Strength",
  per: "Perception",
  end: "Endurance",
  cha: "Charisma",
  int: "Intelligence",
  agl: "Agility",
  lck: "Luck"
};

const ATTR_DESCS: Record<keyof Special, string> = {
  str: "Melee damage, carry weight",
  per: "Ranged accuracy, awareness",
  end: "Hit points, poison resist",
  cha: "Barter, speech options",
  int: "Skill points, tech options",
  agl: "Action points, sneaking",
  lck: "Critical hits, all skills"
};

function totalPoints(s: Special): number {
  return s.str + s.per + s.end + s.cha + s.int + s.agl + s.lck;
}

export function CharacterCreationPanel({ onComplete, onCancel, initialSpecial }: CharacterCreationPanelProps) {
  const [special, setSpecial] = useState<Special>(initialSpecial ? { ...initialSpecial } : { ...BASE });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function adjust(attr: keyof Special, delta: number) {
    setSpecial((prev) => {
      const next = { ...prev, [attr]: prev[attr] + delta };
      if (next[attr] < 1 || next[attr] > 10) return prev;
      if (delta > 0 && totalPoints(next) > 30) return prev;
      return next;
    });
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    try {
      const result = await savePlayerSpecial(special);
      onComplete(result.state, result.questCompleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const total = totalPoints(special);
  const attrs = Object.keys(special) as (keyof Special)[];

  return (
    <div className="char-creation-overlay">
      <p className="char-creation-title">Assign Your S.P.E.C.I.A.L.</p>
      <p className="char-creation-question">
        These define who you are. Your S.P.E.C.I.A.L. stats shape every conversation, every skill check, every moment in the wasteland.
      </p>
      <p className={`special-points-counter${total === 30 ? " is-full" : ""}`}>
        {total} / 30 points spent
      </p>
      <div className="special-grid">
        {attrs.map((attr) => (
          <div key={attr} className="special-row">
            <span className="special-attr-name">{ATTR_LABELS[attr]}</span>
            <button
              className="ghost-button special-adj-btn"
              type="button"
              onClick={() => adjust(attr, -1)}
              disabled={special[attr] <= 1}
            >
              −
            </button>
            <span className="special-value">{special[attr]}</span>
            <button
              className="ghost-button special-adj-btn"
              type="button"
              onClick={() => adjust(attr, 1)}
              disabled={special[attr] >= 10 || total >= 30}
            >
              +
            </button>
            <span className="special-desc">{ATTR_DESCS[attr]}</span>
          </div>
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          className="ghost-button"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Not now
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={total !== 30 || saving}
          onClick={() => void handleConfirm()}
        >
          {saving ? "Saving..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}
