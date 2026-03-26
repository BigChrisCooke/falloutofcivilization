import { withTransaction } from "../db/connection.js";
import { CompanionRepo } from "../repos/companion_repo.js";
import { GameStateRepo } from "../repos/game_state_repo.js";
import { InventoryRepo } from "../repos/inventory_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import type { PlayerInventoryRow } from "../shared/types.js";
import { getGameContent } from "./content_service.js";

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

export interface CompanionReaction {
  companionId: string;
  loyaltyDelta: number;
  newLoyalty: number;
  reaction: string;
  departed: boolean;
}

export interface CollectItemResult {
  item: PlayerInventoryRow;
  karmaDelta: number;
  factionDelta: { factionId: string; delta: number } | null;
  companionReaction: CompanionReaction | null;
}

export class InventoryService {
  private readonly inventoryRepo = new InventoryRepo();
  private readonly saveRepo = new SaveRepo();
  private readonly gameStateRepo = new GameStateRepo();
  private readonly companionRepo = new CompanionRepo();

  public async collectItem(
    saveId: string,
    itemId: string,
    label: string,
    ownedBy: string | null,
    quantity: number,
    description: string | null = null,
    tags: string[] | null = null
  ): Promise<CollectItemResult> {
    return withTransaction(async () => {
      const now = Date.now();
      const row: PlayerInventoryRow = {
        save_id: saveId,
        item_id: itemId,
        label,
        owned_by: ownedBy,
        quantity,
        description,
        tags: tags ? JSON.stringify(tags) : null,
        collected_at: now
      };

      await this.inventoryRepo.addItem(row);

      let karmaDelta = 0;
      let factionDelta: { factionId: string; delta: number } | null = null;

      if (ownedBy) {
        karmaDelta = -2;
        factionDelta = { factionId: ownedBy, delta: -3 };

        const playerCharacter = await this.saveRepo.findPlayerCharacter(saveId);
        if (playerCharacter) {
          await this.saveRepo.updateKarma(saveId, playerCharacter.karma + karmaDelta);
        }

        const factionStanding = await this.gameStateRepo.getFactionStanding(saveId);
        if (factionStanding) {
          const standings = safeJsonParse<Record<string, number>>(factionStanding.standings_json, {});
          standings[ownedBy] = (standings[ownedBy] ?? 0) + factionDelta.delta;

          await this.gameStateRepo.updateFactionStanding({
            ...factionStanding,
            standings_json: JSON.stringify(standings),
            updated_at: now
          });
        }
      }

      const companionReaction = ownedBy
        ? await this.applyCompanionLoyaltyDelta(saveId, -1, "negative")
        : null;

      const persisted = (await this.inventoryRepo.findItem(saveId, itemId)) ?? row;

      return { item: persisted, karmaDelta, factionDelta, companionReaction };
    });
  }

  public async applyCompanionLoyaltyDelta(
    saveId: string,
    delta: number,
    reactionType: "positive" | "negative"
  ): Promise<CompanionReaction | null> {
    const companions = await this.companionRepo.getAll(saveId);
    const companion = companions[0];
    if (!companion) return null;

    const content = getGameContent();
    const companionDef = content.companions.find((c) => c.id === companion.companion_id);
    if (!companionDef) return null;

    const newLoyalty = Math.max(0, Math.min(100, companion.loyalty + delta));
    await this.companionRepo.updateLoyalty(saveId, companion.companion_id, newLoyalty);

    let reaction: string;
    let departed = false;

    if (newLoyalty === 0) {
      reaction = companionDef.reactions.farewell;
      await this.companionRepo.remove(saveId, companion.companion_id);
      departed = true;
    } else if (newLoyalty < 20) {
      reaction = companionDef.reactions.warning;
    } else {
      const lines = reactionType === "positive"
        ? companionDef.reactions.positive
        : companionDef.reactions.negative;
      reaction = lines[Math.floor(Math.random() * lines.length)]?.text ?? "...";
    }

    return {
      companionId: companion.companion_id,
      loyaltyDelta: delta,
      newLoyalty,
      reaction,
      departed
    };
  }

  public async getInventory(saveId: string): Promise<PlayerInventoryRow[]> {
    return this.inventoryRepo.getAll(saveId);
  }

  public async getCollectedItemIds(saveId: string): Promise<string[]> {
    return this.inventoryRepo.getCollectedItemIds(saveId);
  }

  public async removeItem(saveId: string, itemId: string): Promise<void> {
    await this.inventoryRepo.removeItem(saveId, itemId);
  }
}
