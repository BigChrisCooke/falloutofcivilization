/**
 * Skill definitions for the Fallout of Civilizations RPG.
 *
 * Each skill has a base value derived from SPECIAL stats,
 * a category that determines difficulty modifier behavior,
 * and a tiered cost system for spending skill points.
 */

export interface SkillDefinition {
  id: string;
  name: string;
  stats: string[];
  category: "combat" | "active" | "passive";
  initialValue: (special: Record<string, number>) => number;
}

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // ── Combat skills (unaffected by difficulty) ──────────────
  { id: "small_guns",     name: "Small Guns",     stats: ["agl"],        category: "combat",  initialValue: (s) => 5 + 4 * (s.agl ?? 0) },
  { id: "big_guns",       name: "Big Guns",       stats: ["agl"],        category: "combat",  initialValue: (s) => 2 * (s.agl ?? 0) },
  { id: "energy_weapons", name: "Energy Weapons", stats: ["agl"],        category: "combat",  initialValue: (s) => 2 * (s.agl ?? 0) },
  { id: "unarmed",        name: "Unarmed",        stats: ["agl", "str"], category: "combat",  initialValue: (s) => 30 + 2 * ((s.str ?? 0) + (s.agl ?? 0)) },
  { id: "melee_weapons",  name: "Melee Weapons",  stats: ["agl", "str"], category: "combat",  initialValue: (s) => 20 + 2 * ((s.str ?? 0) + (s.agl ?? 0)) },
  { id: "throwing",       name: "Throwing",        stats: ["agl"],        category: "combat",  initialValue: (s) => 4 * (s.agl ?? 0) },

  // ── Active skills (difficulty: -10 hard, +20 easy) ───────
  { id: "first_aid",      name: "First Aid",      stats: ["per", "int"], category: "active",  initialValue: (s) => 2 * ((s.per ?? 0) + (s.int ?? 0)) },
  { id: "doctor",         name: "Doctor",          stats: ["per", "int"], category: "active",  initialValue: (s) => 5 + (s.per ?? 0) + (s.int ?? 0) },
  { id: "sneak",          name: "Sneak",           stats: ["agl"],        category: "active",  initialValue: (s) => 5 + 3 * (s.agl ?? 0) },
  { id: "lockpick",       name: "Lockpick",        stats: ["per", "agl"], category: "active",  initialValue: (s) => 10 + (s.per ?? 0) + (s.agl ?? 0) },
  { id: "steal",          name: "Steal",           stats: ["agl"],        category: "active",  initialValue: (s) => 3 * (s.agl ?? 0) },
  { id: "traps",          name: "Traps",           stats: ["per", "agl"], category: "active",  initialValue: (s) => 10 + (s.per ?? 0) + (s.agl ?? 0) },
  { id: "science",        name: "Science",         stats: ["int"],        category: "active",  initialValue: (s) => 4 * (s.int ?? 0) },
  { id: "repair",         name: "Repair",          stats: ["int"],        category: "active",  initialValue: (s) => 3 * (s.int ?? 0) },

  // ── Passive skills (difficulty: -10 hard, +20 easy) ──────
  { id: "speech",         name: "Speech",          stats: ["cha"],        category: "passive", initialValue: (s) => 5 * (s.cha ?? 0) },
  { id: "barter",         name: "Barter",          stats: ["cha"],        category: "passive", initialValue: (s) => 4 * (s.cha ?? 0) },
  { id: "gambling",       name: "Gambling",        stats: ["lck"],        category: "passive", initialValue: (s) => 5 * (s.lck ?? 0) },
  { id: "outdoorsman",    name: "Outdoorsman",     stats: ["end", "int"], category: "passive", initialValue: (s) => 2 * ((s.end ?? 0) + (s.int ?? 0)) },
];

/** All valid skill IDs. */
export const SKILL_IDS = SKILL_DEFINITIONS.map((s) => s.id);

/**
 * Cost in skill points to raise a skill by 1% (or 2% if tagged)
 * at the given current percentage value.
 */
export function getSkillPointCost(currentValue: number): number {
  if (currentValue <= 100) return 1;
  if (currentValue <= 125) return 2;
  if (currentValue <= 150) return 3;
  if (currentValue <= 175) return 4;
  if (currentValue <= 200) return 5;
  return 6; // 201-300
}

/**
 * Skill points earned when leveling up.
 * Formula: 5 + 2 * Intelligence
 */
export function skillPointsPerLevel(intelligence: number): number {
  return 5 + 2 * intelligence;
}

/**
 * Compute the total effective value for a single skill.
 *
 * total = base(SPECIAL) + allocated + tagBonus(from tagged allocation)
 *
 * Note: difficulty modifiers are applied at display/check time, not stored.
 */
export function computeSkillValue(
  skillId: string,
  special: Record<string, number>,
  allocated: Record<string, number>
): number {
  const def = SKILL_DEFINITIONS.find((s) => s.id === skillId);
  if (!def) return 0;
  const base = def.initialValue(special);
  const bonus = allocated[skillId] ?? 0;
  return base + bonus;
}

/**
 * Compute all skill values at once.
 */
export function computeAllSkillValues(
  special: Record<string, number>,
  allocated: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const def of SKILL_DEFINITIONS) {
    result[def.id] = def.initialValue(special) + (allocated[def.id] ?? 0);
  }
  return result;
}
