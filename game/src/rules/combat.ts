import { isPassableTile } from "../tiles.js";
import { toTileKey } from "./hex.js";
import type { HexPoint } from "./hex.js";
import type { InteriorMapDefinition } from "../schemas/content.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Injectable randomness seam.
 * Production: Math.random. Tests: () => 0 (always hit) or () => 0.99 (always miss).
 */
export type RollFn = () => number;

/**
 * Runtime state of a single NPC during combat.
 * Exported here so both CombatService and tests import from one place.
 */
export interface CombatNpc {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  x: number;
  y: number;
  dead: boolean;
}

// ─── HP ───────────────────────────────────────────────────────────────────────

/**
 * Compute the player's max HP from their Endurance stat and level.
 * Formula: 15 + END*2 + level*2, minimum 1.
 */
export function computeMaxHp(endurance: number, level: number): number {
  return Math.max(1, 15 + endurance * 2 + level * 2);
}

// ─── Player attack ────────────────────────────────────────────────────────────

/**
 * Compute the player's hit chance (1–100 integer) clamped to [5, 95].
 * skill: relevant weapon skill value (0–100+)
 * per: Perception SPECIAL stat
 * lck: Luck SPECIAL stat
 * distanceToTarget: hex distance to target NPC
 */
export function computePlayerHitChance(
  skillValue: number,
  per: number,
  lck: number,
  distanceToTarget: number
): number {
  const raw = skillValue + per * 3 - distanceToTarget * 8 + Math.floor(lck / 2);
  return Math.max(5, Math.min(95, raw));
}

/**
 * Compute damage dealt by the player.
 * weaponDamage: base damage on the weapon definition
 * specialStatValue: value of the relevant SPECIAL stat (STR for melee/throwing, AGL otherwise)
 * targetAc: target NPC's armor class
 * Result is floored at 1.
 */
export function computePlayerDamage(
  weaponDamage: number,
  specialStatValue: number,
  targetAc: number
): number {
  return Math.max(1, weaponDamage + specialStatValue - targetAc);
}

/**
 * Resolve a single player attack given a pre-rolled value [0, 100).
 * roll should be `rollFn() * 100` so this function stays pure.
 * Returns { hit, damage } — damage is 0 on a miss.
 */
export function resolvePlayerAttack(params: {
  skillValue: number;
  per: number;
  lck: number;
  distanceToTarget: number;
  weaponDamage: number;
  specialStatValue: number;
  targetAc: number;
  roll: number;
}): { hit: boolean; damage: number } {
  const hitChance = computePlayerHitChance(params.skillValue, params.per, params.lck, params.distanceToTarget);
  // roll is [0, 100): hit if roll < hitChance (i.e. a 1-in-100 scale where roll 0 = roll of 1)
  const hit = params.roll < hitChance;
  const damage = hit ? computePlayerDamage(params.weaponDamage, params.specialStatValue, params.targetAc) : 0;
  return { hit, damage };
}

// ─── NPC attack ───────────────────────────────────────────────────────────────

/**
 * Compute an NPC's hit chance (1–100 integer) clamped to [5, 75].
 * Base is 40 at distance 0 (melee range), reduced by 8 per hex.
 */
export function computeNpcHitChance(distanceToPlayer: number): number {
  return Math.max(5, Math.min(75, 40 - distanceToPlayer * 8));
}

/**
 * Compute damage dealt by an NPC.
 * npcBaseDamage: the NPC's base attack damage (currently hardcoded 8 in game_service)
 * playerAc: player armor class (currently 0)
 * Result is floored at 1.
 */
export function computeNpcDamage(npcBaseDamage: number, playerAc: number): number {
  return Math.max(1, npcBaseDamage - playerAc);
}

/**
 * Resolve a single NPC attack given a pre-rolled value [0, 100).
 */
export function resolveNpcAttack(params: {
  distanceToPlayer: number;
  npcBaseDamage: number;
  playerAc: number;
  roll: number;
}): { hit: boolean; damage: number } {
  const hitChance = computeNpcHitChance(params.distanceToPlayer);
  const hit = params.roll < hitChance;
  const damage = hit ? computeNpcDamage(params.npcBaseDamage, params.playerAc) : 0;
  return { hit, damage };
}

// ─── Map utility ─────────────────────────────────────────────────────────────

/**
 * Build the set of passable tile keys for an interior map.
 * Uses the game-layer isPassableTile (blocklist: wall, rock, metal, bar).
 * Shared by both CombatService (NPC pathfinding) and GameService (interior movement).
 */
export function buildPassableSet(interiorMap: InteriorMapDefinition): Set<string> {
  const passableSet = new Set<string>();

  for (let rowIndex = 0; rowIndex < interiorMap.layout.length; rowIndex += 1) {
    const row = interiorMap.layout[rowIndex] ?? [];

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const tile = row[columnIndex] ?? null;
      if (isPassableTile(tile)) {
        passableSet.add(toTileKey({ x: columnIndex, y: rowIndex }));
      }
    }
  }

  return passableSet;
}

// ─── Combat initialisation ────────────────────────────────────────────────────

/**
 * Build the initial CombatNpc array from interior map NPC definitions.
 * Maps content authoring fields to runtime state.
 * All NPCs start alive with hp = maxHp.
 */
export function buildInitialNpcs(
  hostileNpcs: Array<{
    id: string;
    name: string;
    hp?: number;
    ac?: number;
    x?: number;
    y?: number;
  }>
): CombatNpc[] {
  return hostileNpcs.map((n) => ({
    id: n.id,
    name: n.name,
    hp: n.hp ?? 1,
    maxHp: n.hp ?? 1,
    ac: n.ac ?? 0,
    x: n.x ?? 0,
    y: n.y ?? 0,
    dead: false
  }));
}

// ─── Re-export HexPoint for consumers of this module ─────────────────────────
export type { HexPoint };
