import { useState } from "react";

import type { GameState } from "../lib/api.js";
import { setTaggedSkills } from "../lib/api.js";
import { SKILL_DEFINITIONS } from "../../../game/src/skills.js";

interface TaggedSkillsPanelProps {
  special: Record<string, number>;
  onComplete: (state: GameState) => void;
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

export function TaggedSkillsPanel({ special, onComplete }: TaggedSkillsPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(skillId: string) {
    setSelected((prev) => {
      if (prev.includes(skillId)) {
        return prev.filter((id) => id !== skillId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, skillId];
    });
  }

  async function handleConfirm() {
    if (selected.length !== 3) return;
    setSaving(true);
    setError(null);
    try {
      const result = await setTaggedSkills(selected);
      onComplete(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set tagged skills.");
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
    <div className="character-creation-overlay tagged-skills-panel">
      <h2>Choose 3 Tagged Skills</h2>
      <p className="tagged-skills-desc">
        Tagged skills improve twice as fast when you spend skill points on them.
        Choose wisely — this cannot be changed later.
      </p>

      {(["combat", "active", "passive"] as const).map((category) => (
        <div key={category} className="skill-category-group">
          <h3 className="skill-category-title">{CATEGORY_LABELS[category]}</h3>
          <div className="skill-tag-list">
            {grouped[category].map((skill) => {
              const isSelected = selected.includes(skill.id);
              const baseValue = skill.initialValue(special);
              const statLabel = skill.stats.map((s) => STAT_LABELS[s] ?? s.toUpperCase()).join(", ");
              return (
                <button
                  key={skill.id}
                  type="button"
                  className={`skill-tag-option${isSelected ? " is-selected" : ""}${!isSelected && selected.length >= 3 ? " is-disabled" : ""}`}
                  onClick={() => toggleSkill(skill.id)}
                  disabled={!isSelected && selected.length >= 3}
                >
                  <span className="skill-tag-name">{skill.name}</span>
                  <span className="skill-tag-stats">{statLabel}</span>
                  <span className="skill-tag-value">{baseValue}%</span>
                  {isSelected && <span className="skill-tag-check">&#10003;</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="error-text">{error}</p>}

      <div className="creation-actions">
        <span className="tagged-count">{selected.length}/3 selected</span>
        <button
          className="primary-button"
          type="button"
          disabled={selected.length !== 3 || saving}
          onClick={() => void handleConfirm()}
        >
          {saving ? "Saving..." : "Confirm Tagged Skills"}
        </button>
      </div>
    </div>
  );
}
