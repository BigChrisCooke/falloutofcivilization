import {
  bestStepToward,
  buildInitialNpcs,
  buildPassableSet,
  computeMaxHp,
  computeSkillValue,
  hexDistance,
  hexNeighbors,
  resolveNpcAttack,
  resolvePlayerAttack,
  runAllyAiStep,
  toTileKey,
  type CombatAlly,
  type CombatNpc,
  type RollFn
} from "../../../game/src/index.js";
import { CompanionRepo } from "../repos/companion_repo.js";
import { withTransaction } from "../db/connection.js";
import { CombatRepo } from "../repos/combat_repo.js";
import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";
import { MapLootRepo } from "../repos/map_loot_repo.js";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * If the dead NPC shares a tile with another dead NPC, nudge it to the nearest
 * passable tile not occupied by any other NPC (dead or alive).
 */
function resolveCorpseOverlap(npc: CombatNpc, allNpcs: CombatNpc[], passableSet: Set<string>): void {
  const occupiedByOther = new Set(
    allNpcs.filter((n) => n.id !== npc.id).map((n) => toTileKey({ x: n.x, y: n.y }))
  );

  if (!occupiedByOther.has(toTileKey({ x: npc.x, y: npc.y }))) return;

  // BFS outward to find the nearest free passable tile
  const visited = new Set<string>([toTileKey({ x: npc.x, y: npc.y })]);
  const queue: Array<{ x: number; y: number }> = [{ x: npc.x, y: npc.y }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of hexNeighbors(current)) {
      const key = toTileKey(neighbor);
      if (visited.has(key)) continue;
      visited.add(key);
      if (passableSet.has(key) && !occupiedByOther.has(key)) {
        npc.x = neighbor.x;
        npc.y = neighbor.y;
        return;
      }
      queue.push(neighbor);
    }
  }
}

// ─── NPC base damage (placeholder until content-authored) ─────────────────────
const NPC_BASE_DAMAGE = 8;
const PLAYER_AC = 0;

function findAdjacentPassableHexExcluding(
  center: { x: number; y: number },
  passableSet: Set<string>,
  excludeKeys: Set<string>
): { x: number; y: number } | null {
  const neighbors = hexNeighbors(center).filter((n) => {
    const key = toTileKey(n);
    return passableSet.has(key) && !excludeKeys.has(key);
  }).sort((a, b) => b.y - a.y || a.x - b.x);
  return neighbors[0] ?? null;
}

// ─── CombatService ────────────────────────────────────────────────────────────

export class CombatService {
  private readonly saveRepo = new SaveRepo();
  private readonly inventoryRepo = new InventoryRepo();
  private readonly combatRepo = new CombatRepo();
  private readonly gameStateRepo = new GameStateRepo();
  private readonly mapLootRepo = new MapLootRepo();
  private readonly companionRepo = new CompanionRepo();

  constructor(private readonly rollFn: RollFn = Math.random) {}

  // ─── enterCombat ───────────────────────────────────────────────────────────

  public async enterCombat(saveId: string): Promise<void> {
    const content = getGameContent();
    const worldState = await this.gameStateRepo.getWorldState(saveId);
    if (!worldState?.current_map_id) return;

    const interiorMap = content.interiorMaps.find((m) => m.id === worldState.current_map_id);
    if (!interiorMap) return;

    let hostileNpcs = interiorMap.npcs.filter((n) => n.disposition === "hostile" && n.hp !== undefined);
    if (hostileNpcs.length === 0) return;

    // Arena: randomly pick 2–3 opponents from the pool each fight
    if (worldState.current_map_id === "dry_lake_bed_arena") {
      const shuffled = [...hostileNpcs].sort(() => this.rollFn() - 0.5);
      const count = this.rollFn() < 0.5 ? 2 : 3;
      hostileNpcs = shuffled.slice(0, Math.min(count, shuffled.length));
    }

    const existing = await this.combatRepo.get(saveId);
    // If a stale victory record remains (e.g. player exited and re-entered), clear it and start fresh
    if (existing) {
      if (existing.active_turn === "victory") {
        await this.combatRepo.delete(saveId);
      } else {
        return;
      }
    }

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

    // Build ally list from recruited companions that have combat stats (arena only for now)
    const allies: CombatAlly[] = [];
    if (worldState.current_map_id === "dry_lake_bed_arena") {
      const content = getGameContent();
      const spawnPoint = getInteriorSpawnPoint(interiorMap);
      const passableSet = buildPassableSet(interiorMap);
      const companionRows = await this.companionRepo.getAll(saveId);
      const occupied = new Set<string>([toTileKey(spawnPoint)]);
      for (const row of companionRows) {
        const def = content.companions.find((c) => c.id === row.companion_id);
        if (!def?.combat) continue;
        // Place ally adjacent to spawn, separate tiles
        const allyPos = findAdjacentPassableHexExcluding(spawnPoint, passableSet, occupied) ?? spawnPoint;
        occupied.add(toTileKey(allyPos));
        allies.push({
          companionId: row.companion_id,
          id: `ally-${row.companion_id}`,
          name: def.name,
          hp: def.combat.hp,
          maxHp: def.combat.hp,
          ac: def.combat.ac,
          damage: def.combat.damage,
          weapon: def.combat.weapon ?? null,
          x: allyPos.x,
          y: allyPos.y,
          dead: false
        });
      }
    }

    await this.combatRepo.upsert({
      save_id: saveId,
      map_id: worldState.current_map_id,
      turn_number: 1,
      active_turn: "player",
      npcs_json: JSON.stringify(npcs),
      allies_json: JSON.stringify(allies),
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
      const allies = safeJsonParse<CombatAlly[]>(combatRow.allies_json, []);
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

      // Enforce range for melee, unarmed, and throwing (guns/energy weapons have no arena restriction)
      if (
        (weapon.category === "melee_weapons" || weapon.category === "unarmed" || weapon.category === "throwing") &&
        distanceToTarget > weapon.range
      ) {
        throw new Error(`Too far away. Move closer to use the ${weapon.name}.`);
      }

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
        if (target.hp <= 0) {
          target.dead = true;
          const interiorMapDef = content.interiorMaps.find((m) => m.id === combatRow.map_id);
          if (interiorMapDef) {
            resolveCorpseOverlap(target, npcs, buildPassableSet(interiorMapDef));
          }
        }
        message = `Hit! ${damage} damage to ${target.name}.`;
      } else {
        message = `Missed ${target.name}!`;
      }

      // Throwing weapons are consumed on use (hit or miss) and land at the target tile
      if (weapon.category === "throwing") {
        await this.inventoryRepo.removeItem(saveId, weapon.id);
        await this.saveRepo.setEquippedWeapon(saveId, null);
        await this.mapLootRepo.drop({
          id: crypto.randomUUID(),
          save_id: saveId,
          map_id: combatRow.map_id,
          item_id: weapon.id,
          label: weapon.name,
          x: target.x,
          y: target.y,
          dropped_at: Date.now()
        });
      }

      const livingNpcs = npcs.filter((n) => !n.dead);

      const livingNpcsAfterPlayer = npcs.filter((n) => !n.dead);

      if (livingNpcsAfterPlayer.length === 0) {
        // Victory — award XP and flag it
        await this.combatRepo.delete(saveId);
        await this.saveRepo.awardXp(saveId, npcs.reduce((sum, n) => sum + n.maxHp, 0));
        await this.combatRepo.upsert({
          save_id: saveId,
          map_id: combatRow.map_id,
          turn_number: combatRow.turn_number,
          active_turn: "victory",
          npcs_json: JSON.stringify(npcs),
          allies_json: JSON.stringify(allies),
          updated_at: Date.now()
        });
      } else {
        // Run ally turns before enemies get to move
        const allyMessages = this.runAllyTurns(allies, npcs, combatRow.map_id);
        if (allyMessages.length > 0) {
          message += " " + allyMessages.join(" ");
        }

        // Check if allies finished off the remaining NPCs
        const livingNpcsAfterAllies = npcs.filter((n) => !n.dead);
        if (livingNpcsAfterAllies.length === 0) {
          await this.combatRepo.delete(saveId);
          await this.saveRepo.awardXp(saveId, npcs.reduce((sum, n) => sum + n.maxHp, 0));
          await this.combatRepo.upsert({
            save_id: saveId,
            map_id: combatRow.map_id,
            turn_number: combatRow.turn_number,
            active_turn: "victory",
            npcs_json: JSON.stringify(npcs),
            allies_json: JSON.stringify(allies),
            updated_at: Date.now()
          });
        } else {
          const npcTurnResult = await this.runNpcTurn(saveId, npcs, allies, combatRow.map_id, combatRow.turn_number);
          message += npcTurnResult.messages.length > 0 ? " " + npcTurnResult.messages.join(" ") : "";
        }
      }

      return { hit, damage, message };
    });
  }

  // ─── runAllyTurns ──────────────────────────────────────────────────────────

  private runAllyTurns(
    allies: CombatAlly[],
    npcs: CombatNpc[],
    mapId: string
  ): string[] {
    const content = getGameContent();
    const interiorMapDef = content.interiorMaps.find((m) => m.id === mapId);
    const passableSet = interiorMapDef ? buildPassableSet(interiorMapDef) : new Set<string>();
    const messages: string[] = [];

    // Track ally-occupied tiles so they don't stack on the same tile
    const allyOccupied = new Set<string>(
      allies.filter((a) => !a.dead).map((a) => toTileKey({ x: a.x, y: a.y }))
    );

    for (const ally of allies) {
      if (ally.dead) continue;
      // Free this ally's current tile so it can step away
      allyOccupied.delete(toTileKey({ x: ally.x, y: ally.y }));
      // Build effective passable set that excludes tiles occupied by other allies
      const effectivePassable = new Set([...passableSet].filter((k) => !allyOccupied.has(k)));
      const result = runAllyAiStep(ally, npcs, effectivePassable, this.rollFn);
      ally.x = result.ally.x;
      ally.y = result.ally.y;
      allyOccupied.add(toTileKey({ x: ally.x, y: ally.y }));
      if (result.message) messages.push(result.message);
    }

    return messages;
  }

  // ─── runNpcTurn ────────────────────────────────────────────────────────────

  private async runNpcTurn(
    saveId: string,
    npcs: CombatNpc[],
    allies: CombatAlly[],
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

      // Reset allies to full HP at spawn positions on defeat
      const resetAllies: CombatAlly[] = allies.map((a) => ({ ...a, hp: a.maxHp, dead: false }));

      await this.combatRepo.upsert({
        save_id: saveId,
        map_id: mapId,
        turn_number: 1,
        active_turn: "player",
        npcs_json: JSON.stringify(resetNpcs),
        allies_json: JSON.stringify(resetAllies),
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
        allies_json: JSON.stringify(allies),
        updated_at: Date.now()
      });
    }

    return { messages };
  }

  // ─── lootBody ─────────────────────────────────────────────────────────────

  public async lootBody(saveId: string, npcId: string): Promise<{ weaponId: string | null; weaponLabel: string | null; itemLabels: string[] }> {
    return withTransaction(async () => {
      const combatRow = await this.combatRepo.get(saveId);
      if (!combatRow) throw new Error("No active combat.");

      const npcs = safeJsonParse<CombatNpc[]>(combatRow.npcs_json, []);
      const npc = npcs.find((n) => n.id === npcId && n.dead);
      if (!npc) throw new Error("NPC not found or not dead.");
      if (npc.looted) return { weaponId: null, weaponLabel: null, itemLabels: [] };

      npc.looted = true;
      let weaponLabel: string | null = null;
      const itemLabels: string[] = [];

      const content = getGameContent();

      if (npc.weapon) {
        const weaponDef = content.weapons.find((w) => w.id === npc.weapon);
        if (weaponDef) {
          weaponLabel = weaponDef.name;
          await this.inventoryRepo.addItem({
            save_id: saveId,
            item_id: weaponDef.id,
            label: weaponDef.name,
            owned_by: null,
            quantity: 1,
            description: weaponDef.description,
            tags: JSON.stringify(["weapon"]),
            collected_at: Date.now()
          });
          if (weaponDef.ammoType) {
            const ammoLabel = AMMO_TYPES[weaponDef.ammoType] ?? weaponDef.ammoType;
            const existing = await this.inventoryRepo.findItem(saveId, weaponDef.ammoType);
            if (existing) {
              await this.inventoryRepo.updateQuantity(saveId, weaponDef.ammoType, existing.quantity + 5);
            } else {
              await this.inventoryRepo.addItem({
                save_id: saveId,
                item_id: weaponDef.ammoType,
                label: ammoLabel,
                owned_by: null,
                quantity: 5,
                description: null,
                tags: JSON.stringify(["ammo"]),
                collected_at: Date.now()
              });
            }
          }
        }
      }

      // Grant any authored items on this NPC
      const interiorMapDef = content.interiorMaps.find((m) => m.id === combatRow.map_id);
      const npcDef = interiorMapDef?.npcs.find((n) => n.id === npcId);
      if (npcDef?.items) {
        for (const item of npcDef.items) {
          const existing = await this.inventoryRepo.findItem(saveId, item.id);
          if (existing) {
            await this.inventoryRepo.updateQuantity(saveId, item.id, existing.quantity + item.quantity);
          } else {
            await this.inventoryRepo.addItem({
              save_id: saveId,
              item_id: item.id,
              label: item.label,
              owned_by: null,
              quantity: item.quantity,
              description: item.description ?? null,
              tags: JSON.stringify(item.tags ?? []),
              collected_at: Date.now()
            });
          }
          itemLabels.push(item.quantity > 1 ? `${item.quantity}x ${item.label}` : item.label);
        }
      }

      await this.combatRepo.upsert({
        ...combatRow,
        npcs_json: JSON.stringify(npcs),
        updated_at: Date.now()
      });

      return { weaponId: npc.weapon, weaponLabel, itemLabels };
    });
  }

  // ─── resetArena ───────────────────────────────────────────────────────────

  public async resetArena(saveId: string): Promise<void> {
    await this.combatRepo.delete(saveId);
    await this.enterCombat(saveId);
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
