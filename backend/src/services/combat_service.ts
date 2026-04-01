import {
  bestStepToward,
  buildInitialNpcs,
  buildPassableSet,
  computeMaxHp,
  computeSkillValue,
  hexDistance,
  resolveNpcAttack,
  resolvePlayerAttack,
  type CombatNpc,
  type RollFn
} from "../../../game/src/index.js";
import { withTransaction } from "../db/connection.js";
import { CombatRepo } from "../repos/combat_repo.js";
import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import type { PlayerCharacterRow } from "../shared/types.js";
import { getGameContent } from "./content_service.js";
import { getInteriorSpawnPoint, getInteriorMap } from "./interior_state.js";

// ─── Local helpers ────────────────────────────────────────────────────────────

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (json === null || json === undefined) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttackResult {
  hit: boolean;
  damage: number;
  message: string;
}

const AMMO_TYPES: Record<string, string> = {
  "9mm_rounds": "9mm Rounds",
  "10mm_rounds": "10mm Rounds",
  "357_rounds": ".357 Rounds",
  "308_rounds": ".308 Rounds",
  "556_rounds": "5.56mm Rounds",
  "shotgun_shells": "Shotgun Shells",
  "energy_cell": "Energy Cell"
};

// ─── NPC base damage (placeholder until content-authored) ─────────────────────
const NPC_BASE_DAMAGE = 8;
const PLAYER_AC = 0;

// ─── CombatService ────────────────────────────────────────────────────────────

export class CombatService {
  private readonly saveRepo = new SaveRepo();
  private readonly inventoryRepo = new InventoryRepo();
  private readonly combatRepo = new CombatRepo();
  private readonly gameStateRepo = new GameStateRepo();

  constructor(private readonly rollFn: RollFn = Math.random) {}

  // ─── enterCombat ───────────────────────────────────────────────────────────

  public async enterCombat(saveId: string): Promise<void> {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);
    if (!worldState?.current_map_id) return;

    const interiorMap = content.interiorMaps.find((m) => m.id === worldState.current_map_id);
    if (!interiorMap) return;

    const hostileNpcs = interiorMap.npcs.filter((n) => n.disposition === "hostile" && n.hp !== undefined);
    if (hostileNpcs.length === 0) return;

    const existing = await this.combatRepo.get(saveId);
    if (existing) return;

    const pc = await this.saveRepo.findPlayerCharacter(saveId);
    if (!pc) return;

    const special = safeJsonParse<Record<string, number>>(pc.special_json, {});
    let hp = pc.hp ?? 0;
    let maxHp = pc.max_hp ?? 0;

    if (maxHp === 0) {
      maxHp = computeMaxHp(special.end ?? 5, pc.level ?? 1);
      hp = maxHp;
      await this.saveRepo.updateHp(saveId, hp, maxHp);
    }

    const npcs: CombatNpc[] = buildInitialNpcs(hostileNpcs);

    await this.combatRepo.upsert({
      save_id: saveId,
      map_id: worldState.current_map_id,
      turn_number: 1,
      active_turn: "player",
      npcs_json: JSON.stringify(npcs),
      updated_at: Date.now()
    });

    await this.grantStarterAmmo(saveId, pc);
  }

  // ─── equipWeapon ───────────────────────────────────────────────────────────

  public async equipWeapon(saveId: string, weaponId: string): Promise<void> {
    const content = getGameContent();
    const weapon = content.weapons.find((w) => w.id === weaponId);
    if (!weapon) throw new Error("Unknown weapon.");

    await this.saveRepo.setEquippedWeapon(saveId, weaponId);
  }

  // ─── attackTarget ──────────────────────────────────────────────────────────

  public async attackTarget(saveId: string, targetNpcId: string): Promise<AttackResult> {
    return withTransaction(async () => {
      const content = getGameContent();
      const combatRow = await this.combatRepo.get(saveId);
      if (!combatRow) throw new Error("No active combat.");
      if (combatRow.active_turn !== "player") throw new Error("It is not the player's turn.");

      const npcs = safeJsonParse<CombatNpc[]>(combatRow.npcs_json, []);
      const target = npcs.find((n) => n.id === targetNpcId && !n.dead);
      if (!target) throw new Error("Target not found or already dead.");

      const pc = await this.saveRepo.findPlayerCharacter(saveId);
      if (!pc) throw new Error("Player character not found.");
      if (!pc.equipped_weapon_id) throw new Error("No weapon equipped.");

      const weapon = content.weapons.find((w) => w.id === pc.equipped_weapon_id);
      if (!weapon) throw new Error("Equipped weapon not found in catalog.");

      // Consume ammo
      if (weapon.ammoType) {
        const ammoItem = await this.inventoryRepo.findItem(saveId, weapon.ammoType);
        if (!ammoItem || ammoItem.quantity <= 0) {
          throw new Error(`Out of ammo (${weapon.ammoType}).`);
        }
        if (ammoItem.quantity <= 1) {
          await this.inventoryRepo.removeItem(saveId, weapon.ammoType);
        } else {
          await this.inventoryRepo.updateQuantity(saveId, weapon.ammoType, ammoItem.quantity - 1);
        }
      }

      // Resolve player attack using pure rules
      const special = safeJsonParse<Record<string, number>>(pc.special_json, {});
      const allocated = safeJsonParse<Record<string, number>>(pc.skills_json, {});
      const skillId = weapon.category;
      const skillValue = computeSkillValue(skillId, special, allocated);
      const worldState = await this.gameStateRepo.getWorldState(saveId);
      const playerPos = { x: worldState?.player_x ?? 0, y: worldState?.player_y ?? 0 };
      const distanceToTarget = hexDistance(playerPos, { x: target.x, y: target.y });
      const per = special.per ?? 5;
      const lck = special.lck ?? 5;
      const specialStatName = weapon.specialStat ?? (weapon.category === "melee_weapons" || weapon.category === "throwing" ? "str" : "agl");
      const specialStatValue = special[specialStatName] ?? 5;

      const { hit, damage } = resolvePlayerAttack({
        skillValue,
        per,
        lck,
        distanceToTarget,
        weaponDamage: weapon.damage,
        specialStatValue,
        targetAc: target.ac,
        roll: this.rollFn() * 100
      });

      let message = "";

      if (hit) {
        target.hp = Math.max(0, target.hp - damage);
        if (target.hp <= 0) target.dead = true;
        message = `Hit! ${damage} damage to ${target.name}.`;
      } else {
        message = `Missed ${target.name}!`;
      }

      const livingNpcs = npcs.filter((n) => !n.dead);

      if (livingNpcs.length === 0) {
        // Victory — award XP and flag it
        await this.combatRepo.delete(saveId);
        await this.saveRepo.awardXp(saveId, npcs.reduce((sum, n) => sum + n.maxHp, 0));
        await this.combatRepo.upsert({
          save_id: saveId,
          map_id: combatRow.map_id,
          turn_number: combatRow.turn_number,
          active_turn: "victory",
          npcs_json: JSON.stringify(npcs),
          updated_at: Date.now()
        });
      } else {
        const npcTurnResult = await this.runNpcTurn(saveId, npcs, combatRow.map_id, combatRow.turn_number);
        message += npcTurnResult.messages.length > 0 ? " " + npcTurnResult.messages.join(" ") : "";
      }

      return { hit, damage, message };
    });
  }

  // ─── runNpcTurn ────────────────────────────────────────────────────────────

  private async runNpcTurn(
    saveId: string,
    npcs: CombatNpc[],
    mapId: string,
    turnNumber: number
  ): Promise<{ messages: string[] }> {
    const pc = await this.saveRepo.findPlayerCharacter(saveId);
    if (!pc) throw new Error("Player character not found.");

    const worldState = await this.gameStateRepo.getWorldState(saveId);
    let playerPos = { x: worldState?.player_x ?? 0, y: worldState?.player_y ?? 0 };
    let playerHp = pc.hp ?? pc.max_hp ?? 20;
    const playerMaxHp = pc.max_hp ?? 20;
    const messages: string[] = [];

    const content = getGameContent();
    const interiorMapDef = content.interiorMaps.find((m) => m.id === mapId);
    const passableSet = interiorMapDef ? buildPassableSet(interiorMapDef) : new Set<string>();

    for (const npc of npcs) {
      if (npc.dead) continue;

      const dist = hexDistance({ x: npc.x, y: npc.y }, playerPos);

      if (dist <= 1) {
        // Attack player
        const { hit, damage } = resolveNpcAttack({
          distanceToPlayer: dist,
          npcBaseDamage: NPC_BASE_DAMAGE,
          playerAc: PLAYER_AC,
          roll: this.rollFn() * 100
        });

        if (hit) {
          playerHp = Math.max(0, playerHp - damage);
          messages.push(`${npc.name} hits you for ${damage} damage!`);
        } else {
          messages.push(`${npc.name} misses!`);
        }
      } else {
        // Move toward player
        const step = bestStepToward({ x: npc.x, y: npc.y }, playerPos, passableSet);
        if (step) {
          npc.x = step.x;
          npc.y = step.y;
        }
      }
    }

    if (playerHp <= 0) {
      // Defeat — reset to spawn
      const spawnPoint = interiorMapDef ? getInteriorSpawnPoint(interiorMapDef) : { x: 10, y: 17 };

      const resetNpcs: CombatNpc[] = npcs.map((n) => ({
        ...n,
        hp: n.maxHp,
        dead: false,
        x: interiorMapDef?.npcs.find((def) => def.id === n.id)?.x ?? n.x,
        y: interiorMapDef?.npcs.find((def) => def.id === n.id)?.y ?? n.y
      }));

      await this.saveRepo.updateHp(saveId, playerMaxHp, playerMaxHp);

      if (worldState) {
        await this.gameStateRepo.updateWorldState({
          ...worldState,
          player_x: spawnPoint.x,
          player_y: spawnPoint.y,
          updated_at: Date.now()
        });
      }

      await this.combatRepo.upsert({
        save_id: saveId,
        map_id: mapId,
        turn_number: 1,
        active_turn: "player",
        npcs_json: JSON.stringify(resetNpcs),
        updated_at: Date.now()
      });

      messages.push("You were defeated. Back on your feet!");
    } else {
      await this.saveRepo.updateHp(saveId, playerHp, playerMaxHp);
      await this.combatRepo.upsert({
        save_id: saveId,
        map_id: mapId,
        turn_number: turnNumber + 1,
        active_turn: "player",
        npcs_json: JSON.stringify(npcs),
        updated_at: Date.now()
      });
    }

    return { messages };
  }

  // ─── grantStarterAmmo ─────────────────────────────────────────────────────

  private async grantStarterAmmo(saveId: string, pc: PlayerCharacterRow): Promise<void> {
    const inventory = await this.inventoryRepo.getAll(pc.save_id);
    const inventoryIds = new Set(inventory.map((r) => r.item_id));

    for (const [ammoId, label] of Object.entries(AMMO_TYPES)) {
      if (!inventoryIds.has(ammoId)) {
        await this.inventoryRepo.addItem({
          save_id: pc.save_id,
          item_id: ammoId,
          label,
          owned_by: null,
          quantity: 30,
          description: null,
          tags: JSON.stringify(["ammo"]),
          collected_at: Date.now()
        });
      }
    }
  }
}
