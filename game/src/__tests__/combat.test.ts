import { describe, expect, it } from "vitest";
import {
  buildInitialNpcs,
  buildPassableSet,
  computeMaxHp,
  computeNpcDamage,
  computeNpcHitChance,
  computePlayerDamage,
  computePlayerHitChance,
  resolveNpcAttack,
  resolvePlayerAttack
} from "../rules/combat.js";
import type { InteriorMapDefinition } from "../schemas/content.js";

// ─── computeMaxHp ─────────────────────────────────────────────────────────────

describe("computeMaxHp", () => {
  it("scales with endurance and level", () => {
    // 15 + 5*2 + 1*2 = 27
    expect(computeMaxHp(5, 1)).toBe(27);
  });

  it("scales upward with higher endurance", () => {
    // 15 + 10*2 + 1*2 = 37
    expect(computeMaxHp(10, 1)).toBe(37);
  });

  it("scales upward with higher level", () => {
    // 15 + 5*2 + 5*2 = 35
    expect(computeMaxHp(5, 5)).toBe(35);
  });

  it("floors at 1 even with minimum inputs", () => {
    // 15 + 1*2 + 1*2 = 19 — already above 1, so test 0 inputs
    expect(computeMaxHp(0, 0)).toBe(15);
    // manually verify floor: formula gives 15, so minimum is always at least 15 with 0 inputs
  });

  it("returns at least 1 regardless of input", () => {
    // Negative values are invalid in practice, but the function is defensive
    expect(computeMaxHp(-100, -100)).toBeGreaterThanOrEqual(1);
  });
});

// ─── computePlayerHitChance ───────────────────────────────────────────────────

describe("computePlayerHitChance", () => {
  it("computes base hit chance from skill, per, lck at distance 0", () => {
    // skill=50, per=5, lck=5 → 50 + 15 - 0 + 2 = 67
    expect(computePlayerHitChance(50, 5, 5, 0)).toBe(67);
  });

  it("applies distance penalty: each hex reduces by 8", () => {
    // skill=50, per=5, lck=5, dist=3 → 67 - 24 = 43
    expect(computePlayerHitChance(50, 5, 5, 3)).toBe(43);
  });

  it("applies perception bonus: per*3 per point", () => {
    // skill=50, per=8, lck=5, dist=0 → 50 + 24 + 2 = 76
    expect(computePlayerHitChance(50, 8, 5, 0)).toBe(76);
  });

  it("applies luck bonus: floor(lck/2)", () => {
    // skill=50, per=5, lck=10, dist=0 → 50 + 15 + 5 = 70
    expect(computePlayerHitChance(50, 5, 10, 0)).toBe(70);
  });

  it("clamps to 5 minimum when stats are very low and distance is high", () => {
    expect(computePlayerHitChance(0, 1, 1, 20)).toBe(5);
  });

  it("clamps to 95 maximum when stats are very high", () => {
    expect(computePlayerHitChance(200, 10, 10, 0)).toBe(95);
  });
});

// ─── computePlayerDamage ─────────────────────────────────────────────────────

describe("computePlayerDamage", () => {
  it("computes weapon damage + special stat - target AC", () => {
    // weapon=20, stat=5, ac=2 → 23
    expect(computePlayerDamage(20, 5, 2)).toBe(23);
  });

  it("floors at 1 when AC exceeds weapon + stat", () => {
    // weapon=5, stat=2, ac=20 → max(1, -13) = 1
    expect(computePlayerDamage(5, 2, 20)).toBe(1);
  });

  it("floors at 1 when exactly equal", () => {
    // weapon=5, stat=0, ac=5 → max(1, 0) = 1
    expect(computePlayerDamage(5, 0, 5)).toBe(1);
  });
});

// ─── resolvePlayerAttack ─────────────────────────────────────────────────────

describe("resolvePlayerAttack", () => {
  const baseParams = {
    skillValue: 50,
    per: 5,
    lck: 5,
    distanceToTarget: 1,
    weaponDamage: 20,
    specialStatValue: 5,
    targetAc: 2
  };

  it("returns hit=true and correct damage when roll is within hit chance", () => {
    // hitChance = 50+15-8+2 = 59; roll=0 < 59 → hit
    const result = resolvePlayerAttack({ ...baseParams, roll: 0 });
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(23); // 20 + 5 - 2
  });

  it("returns hit=false and damage=0 when roll exceeds hit chance", () => {
    // hitChance = 59; roll=99 >= 59 → miss
    const result = resolvePlayerAttack({ ...baseParams, roll: 99 });
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
  });

  it("is deterministic: same roll always produces same result", () => {
    const r1 = resolvePlayerAttack({ ...baseParams, roll: 30 });
    const r2 = resolvePlayerAttack({ ...baseParams, roll: 30 });
    expect(r1).toEqual(r2);
  });
});

// ─── computeNpcHitChance ─────────────────────────────────────────────────────

describe("computeNpcHitChance", () => {
  it("returns 40 at distance 0 (melee adjacent)", () => {
    expect(computeNpcHitChance(0)).toBe(40);
  });

  it("returns 32 at distance 1", () => {
    // 40 - 1*8 = 32
    expect(computeNpcHitChance(1)).toBe(32);
  });

  it("clamps to 5 minimum at large distances", () => {
    expect(computeNpcHitChance(10)).toBe(5);
  });

  it("clamps to 75 maximum (would require negative distance, checks ceiling)", () => {
    // 40 - (-5)*8 = 80, clamped to 75
    expect(computeNpcHitChance(-5)).toBe(75);
  });
});

// ─── computeNpcDamage ────────────────────────────────────────────────────────

describe("computeNpcDamage", () => {
  it("computes base damage minus player AC", () => {
    expect(computeNpcDamage(8, 0)).toBe(8);
    expect(computeNpcDamage(8, 3)).toBe(5);
  });

  it("floors at 1 when player AC >= npc base damage", () => {
    expect(computeNpcDamage(8, 10)).toBe(1);
    expect(computeNpcDamage(8, 8)).toBe(1);
  });
});

// ─── resolveNpcAttack ────────────────────────────────────────────────────────

describe("resolveNpcAttack", () => {
  const baseParams = {
    distanceToPlayer: 1, // hitChance = 40-8 = 32
    npcBaseDamage: 8,
    playerAc: 0
  };

  it("returns hit=true and correct damage when roll is within hit chance", () => {
    const result = resolveNpcAttack({ ...baseParams, roll: 0 });
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(8);
  });

  it("returns hit=false and damage=0 when roll exceeds hit chance", () => {
    const result = resolveNpcAttack({ ...baseParams, roll: 99 });
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
  });

  it("floors damage at 1 when player AC is high", () => {
    const result = resolveNpcAttack({ ...baseParams, npcBaseDamage: 8, playerAc: 20, roll: 0 });
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(1);
  });
});

// ─── buildPassableSet ────────────────────────────────────────────────────────

const minimalMap: InteriorMapDefinition = {
  id: "test",
  name: "Test",
  theme: "wasteland",
  layout: [
    ["floor", "rock"],
    ["wall", "floor"]
  ],
  spawnPoints: [{ id: "default", x: 0, y: 0 }],
  exits: [],
  interactables: [],
  npcs: [],
  loot: [],
  questHooks: []
};

describe("buildPassableSet", () => {
  it("includes passable floor tiles", () => {
    const set = buildPassableSet(minimalMap);
    expect(set.has("0,0")).toBe(true); // floor
    expect(set.has("1,1")).toBe(true); // floor
  });

  it("excludes blocking tiles (rock, wall)", () => {
    const set = buildPassableSet(minimalMap);
    expect(set.has("1,0")).toBe(false); // rock
    expect(set.has("0,1")).toBe(false); // wall
  });

  it("returns an empty set for an empty layout", () => {
    const emptyMap: InteriorMapDefinition = { ...minimalMap, layout: [] };
    expect(buildPassableSet(emptyMap).size).toBe(0);
  });
});

// ─── buildInitialNpcs ────────────────────────────────────────────────────────

describe("buildInitialNpcs", () => {
  it("maps all fields correctly from content definitions", () => {
    const npcs = buildInitialNpcs([{ id: "raider_a", name: "Raider", hp: 30, ac: 2, x: 8, y: 2 }]);
    expect(npcs[0]).toEqual({
      id: "raider_a",
      name: "Raider",
      hp: 30,
      maxHp: 30,
      ac: 2,
      x: 8,
      y: 2,
      dead: false
    });
  });

  it("sets dead=false and maxHp=hp for every NPC", () => {
    const npcs = buildInitialNpcs([
      { id: "a", name: "A", hp: 10 },
      { id: "b", name: "B", hp: 20 }
    ]);
    for (const npc of npcs) {
      expect(npc.dead).toBe(false);
      expect(npc.maxHp).toBe(npc.hp);
    }
  });

  it("defaults x, y, ac to 0 when undefined", () => {
    const npcs = buildInitialNpcs([{ id: "a", name: "A", hp: 5 }]);
    expect(npcs[0]?.x).toBe(0);
    expect(npcs[0]?.y).toBe(0);
    expect(npcs[0]?.ac).toBe(0);
  });

  it("defaults hp to 1 when undefined", () => {
    const npcs = buildInitialNpcs([{ id: "a", name: "A" }]);
    expect(npcs[0]?.hp).toBe(1);
    expect(npcs[0]?.maxHp).toBe(1);
  });

  it("handles an empty array", () => {
    expect(buildInitialNpcs([])).toEqual([]);
  });
});
