import { useState } from "react";

import type { GameState } from "../lib/api.js";
import { allocateSkillPoints } from "../lib/api.js";
import { SKILL_DEFINITIONS, getSkillPointCost } from "../../../game/src/skills.js";

interface SkillAllocationPanelProps {
  state: GameState;
  onComplete: (state: GameState) => void;
  onClose: () => void;
}

const STAT_LABELS: Record<string, string> = {
  str: "STR", per: "PER", end: "END", cha: "CHA",
  int: "INT", agl: "AGL", lck: "LCK"
};

const CATEGORY_LABELS: Record<string, string> = {
  combat: "Combat",
  active: "Active",
  passive: "Passive"
};

export function SkillAllocationPanel({ state, onComplete, onClose }: SkillAllocationPanelProps) {
  const skills = state.playerCharacter.skills!;
  const [pending, setPending] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate remaining points after pending allocations
  let spent = 0;
  const effectiveValues: Record<string, number> = {};
  for (const def of SKILL_DEFINITIONS) {
    let currentValue = skills.values[def.id] ?? 0;
    const isTagged = skills.tagged.includes(def.id);
    const pendingCount = pending[def.id] ?? 0;
    let skillSpent = 0;
    for (let i = 0; i < pendingCount; i++) {
      const cost = getSkillPointCost(currentValue);
      skillSpent += cost;
      currentValue += isTagged ? 2 : 1;
    }
    spent += skillSpent;
    effectiveValues[def.id] = currentValue;
  }
  const remaining = skills.unspentPoints - spent;

  function addPoint(skillId: string) {
    const currentValue = effectiveValues[skillId] ?? 0;
    const cost = getSkillPointCost(currentValue);
    if (remaining < cost) return;
    setPending((prev) => ({ ...prev, [skillId]: (prev[skillId] ?? 0) + 1 }));
  }

  function removePoint(skillId: string) {
    if ((pending[skillId] ?? 0) <= 0) return;
    setPending((prev) => ({ ...prev, [skillId]: (prev[skillId] ?? 0) - 1 }));
  }

  async function handleConfirm() {
    const nonZero: Record<string, number> = {};
    for (const [k, v] of Object.entries(pending)) {
      if (v > 0) nonZero[k] = v;
    }
    if (Object.keys(nonZero).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await allocateSkillPoints(nonZero);
      onComplete(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to allocate skill points.");
    } finally {
      setSaving(false);
    }
  }

  const grouped = {
    combat: SKILL_DEFINITIONS.filter((s) => s.category === "combat"),
    active: SKILL_DEFINITIONS.filter((s) => s.category === "active"),
    passive: SKILL_DEFINITIONS.filter((s) => s.category === "passive")
  };

  return (
    <div className="character-creation-overlay skill-allocation-panel">
      <div className="skill-alloc-header">
        <h2>Allocate Skill Points</h2>
        <span className="skill-points-remaining">{remaining} points remaining</span>
      </div>

      {(["combat", "active", "passive"] as const).map((category) => (
        <div key={category} className="skill-category-group">
          <h3 className="skill-category-title">{CATEGORY_LABELS[category]}</h3>
          {grouped[category].map((def) => {
            const isTagged = skills.tagged.includes(def.id);
            const baseValue = skills.values[def.id] ?? 0;
            const currentValue = effectiveValues[def.id] ?? 0;
            const pendingCount = pending[def.id] ?? 0;
            const cost = getSkillPointCost(currentValue);
            const statLabel = def.stats.map((s) => STAT_LABELS[s] ?? s.toUpperCase()).join(", ");
            const gain = isTagged ? 2 : 1;

            return (
              <div key={def.id} className="skill-alloc-row">
                <div className="skill-alloc-info">
                  <span className="skill-alloc-name">
                    {def.name}
                    {isTagged && <span className="skill-tagged-badge">TAG</span>}
                  </span>
                  <span className="skill-alloc-stat">{statLabel}</span>
                </div>
                <div className="skill-alloc-controls">
                  <button
                    type="button"
                    className="skill-alloc-btn"
                    onClick={() => removePoint(def.id)}
                    disabled={pendingCount <= 0}
                  >
                    &minus;
                  </button>
                  <span className={`skill-alloc-value${pendingCount > 0 ? " has-pending" : ""}`}>
                    {currentValue}%
                    {pendingCount > 0 && (
                      <span className="skill-alloc-delta"> (+{currentValue - baseValue})</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="skill-alloc-btn"
                    onClick={() => addPoint(def.id)}
                    disabled={remaining < cost}
                    title={`Cost: ${cost} point${cost > 1 ? "s" : ""} for +${gain}%`}
                  >
                    +
                  </button>
                  <span className="skill-alloc-cost">
                    {cost > 1 ? `${cost}pt` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {error && <p className="error-text">{error}</p>}

      <div className="creation-actions">
        <button
          className="ghost-button"
          type="button"
          onClick={onClose}
          disabled={saving}
        >
          Save for later
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={saving || spent === 0}
          onClick={() => void handleConfirm()}
        >
          {saving ? "Saving..." : "Confirm Allocation"}
        </button>
      </div>
    </div>
  );
}
