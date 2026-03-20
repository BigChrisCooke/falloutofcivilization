import { useState } from "react";

import type { GameState } from "../lib/api.js";
import { savePlayerSpecial } from "../lib/api.js";

interface CharacterCreationPanelProps {
  onComplete: (state: GameState) => void;
  onCancel: () => void;
  initialChoices?: string[];
}

type Phase = "questions" | "pointbuy" | "confirm";

interface Special {
  str: number;
  per: number;
  end: number;
  cha: number;
  int: number;
  agl: number;
  lck: number;
}

const QUESTIONS = [
  {
    id: "q1",
    text: "Before the accident — were you more muscle or brains?",
    choices: [
      { id: "muscle", label: "Muscle — I was a fighter.", bonus: { str: 2, end: 1 } },
      { id: "brains", label: "Brains — I was a thinker.", bonus: { int: 2, per: 1 } }
    ]
  },
  {
    id: "q2",
    text: "Quick on your feet, or tough as brahmin leather?",
    choices: [
      { id: "quick", label: "Quick — I dodge what I can't fight.", bonus: { agl: 2, per: 1 } },
      { id: "tough", label: "Tough — I take the hits.", bonus: { end: 2, str: 1 } }
    ]
  },
  {
    id: "q3",
    text: "Could talk the scales off a gecko, or go it alone?",
    choices: [
      { id: "charmer", label: "Charmer — I talk my way out.", bonus: { cha: 2, lck: 1 } },
      { id: "loner", label: "Loner — I keep my own counsel.", bonus: { int: 2, agl: 1 } }
    ]
  }
];

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

function applyBonus(special: Special, bonus: Partial<Special>): Special {
  const result = { ...special };
  for (const key of Object.keys(bonus) as (keyof Special)[]) {
    result[key] = (result[key] ?? 0) + (bonus[key] ?? 0);
  }
  return result;
}

function totalPoints(s: Special): number {
  return s.str + s.per + s.end + s.cha + s.int + s.agl + s.lck;
}

const OLD_TIMER_BONUS: Record<string, Partial<Special>> = {
  q1_muscle: { str: 2, end: 1 },
  q1_brains: { int: 2, per: 1 },
  q2_quick: { agl: 2, per: 1 },
  q2_tough: { end: 2, str: 1 },
  q3_charmer: { cha: 2, lck: 1 },
  q3_loner: { int: 2, agl: 1 }
};

function computeInitialSpecial(choices: string[]): Special | null {
  const hasQ1 = choices.some((c) => c.startsWith("q1_"));
  const hasQ2 = choices.some((c) => c.startsWith("q2_"));
  const hasQ3 = choices.some((c) => c.startsWith("q3_"));
  if (!hasQ1 || !hasQ2 || !hasQ3) return null;

  let result = { ...BASE };
  for (const choice of choices) {
    const bonus = OLD_TIMER_BONUS[choice];
    if (bonus) result = applyBonus(result, bonus);
  }
  return result;
}

export function CharacterCreationPanel({ onComplete, onCancel, initialChoices }: CharacterCreationPanelProps) {
  const precomputed = initialChoices ? computeInitialSpecial(initialChoices) : null;
  const [phase, setPhase] = useState<Phase>(precomputed ? "pointbuy" : "questions");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [suggestion, setSuggestion] = useState<Special>(precomputed ?? { ...BASE });
  const [special, setSpecial] = useState<Special>(precomputed ?? { ...BASE });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChoice(bonus: Partial<Special>) {
    const next = applyBonus(suggestion, bonus);
    setSuggestion(next);

    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setSpecial({ ...next });
      setPhase("pointbuy");
    }
  }

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
      onComplete(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const total = totalPoints(special);
  const attrs = Object.keys(special) as (keyof Special)[];
  const currentQuestion = QUESTIONS[questionIndex];

  return (
    <div className="char-creation-overlay">
      {phase === "questions" && currentQuestion && (
        <>
          <p className="char-creation-title">S.P.E.C.I.A.L. — Who Are You?</p>
          <p className="char-creation-question">{currentQuestion.text}</p>
          <div className="char-creation-choices">
            {currentQuestion.choices.map((choice) => (
              <button
                key={choice.id}
                className="ghost-button char-creation-choice"
                type="button"
                onClick={() => handleChoice(choice.bonus)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <button className="ghost-button" type="button" onClick={onCancel}>
            Not now
          </button>
        </>
      )}

      {phase === "pointbuy" && (
        <>
          <p className="char-creation-title">Assign Your S.P.E.C.I.A.L.</p>
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
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setSpecial({ ...suggestion })}
            >
              Reset to Suggestion
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={total !== 30}
              onClick={() => setPhase("confirm")}
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {phase === "confirm" && (
        <>
          <p className="char-creation-title">Are You Sure?</p>
          <p className="char-creation-question">
            These define who you are. Your S.P.E.C.I.A.L. stats shape every conversation, every skill check, every moment in the wasteland.
          </p>
          <div className="special-grid" style={{ maxWidth: "18rem" }}>
            {attrs.map((attr) => (
              <div key={attr} className="special-display-row">
                <span>{ATTR_LABELS[attr]}</span>
                <span className="special-display-value">{special[attr]}</span>
              </div>
            ))}
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setPhase("pointbuy")}
              disabled={saving}
            >
              ← Go Back
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={saving}
              onClick={() => void handleConfirm()}
            >
              {saving ? "Saving..." : "Confirm — Enter the Wasteland"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
