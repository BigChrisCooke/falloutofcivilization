import type Database from "better-sqlite3";

import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import type { PlayerInventoryRow } from "../shared/types.js";

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (json === null || json === undefined) {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export interface CollectItemResult {
  item: PlayerInventoryRow;
  karmaDelta: number;
  factionDelta: { factionId: string; delta: number } | null;
}

export class InventoryService {
  private readonly inventoryRepo: InventoryRepo;
  private readonly saveRepo: SaveRepo;
  private readonly gameStateRepo: GameStateRepo;

  public constructor(db: Database.Database) {
    this.inventoryRepo = new InventoryRepo(db);
    this.saveRepo = new SaveRepo(db);
    this.gameStateRepo = new GameStateRepo(db);
  }

  public collectItem(
    saveId: string,
    itemId: string,
    label: string,
    ownedBy: string | null,
    quantity: number,
    description: string | null = null
  ): CollectItemResult {
    const now = Date.now();
    const row: PlayerInventoryRow = {
      save_id: saveId,
      item_id: itemId,
      label,
      owned_by: ownedBy,
      quantity,
      description,
      collected_at: now
    };

    this.inventoryRepo.addItem(row);

    let karmaDelta = 0;
    let factionDelta: { factionId: string; delta: number } | null = null;

    if (ownedBy) {
      // Stealing: karma -2, faction -3
      karmaDelta = -2;
      factionDelta = { factionId: ownedBy, delta: -3 };

      const playerCharacter = this.saveRepo.findPlayerCharacter(saveId);
      if (playerCharacter) {
        this.saveRepo.updateKarma(saveId, playerCharacter.karma + karmaDelta);
      }

      const factionStanding = this.gameStateRepo.getFactionStanding(saveId);
      if (factionStanding) {
        const standings = safeJsonParse<Record<string, number>>(factionStanding.standings_json, {});
        standings[ownedBy] = (standings[ownedBy] ?? 0) + factionDelta.delta;

        this.gameStateRepo.updateFactionStanding({
          ...factionStanding,
          standings_json: JSON.stringify(standings),
          updated_at: now
        });
      }
    }

    const persisted = this.inventoryRepo.findItem(saveId, itemId) ?? row;

    return { item: persisted, karmaDelta, factionDelta };
  }

  public getInventory(saveId: string): PlayerInventoryRow[] {
    return this.inventoryRepo.getAll(saveId);
  }

  public getCollectedItemIds(saveId: string): string[] {
    return this.inventoryRepo.getCollectedItemIds(saveId);
  }

  public removeItem(saveId: string, itemId: string): void {
    this.inventoryRepo.removeItem(saveId, itemId);
  }
}
