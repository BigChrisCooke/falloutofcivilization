import type Database from "better-sqlite3";

import { GameStateRepo } from "../repos/game_state_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import { getGameContent } from "./content_service.js";

export class GameService {
  private readonly saveRepo: SaveRepo;
  private readonly gameStateRepo: GameStateRepo;

  public constructor(db: Database.Database) {
    this.saveRepo = new SaveRepo(db);
    this.gameStateRepo = new GameStateRepo(db);
  }

  public getState(saveId: string) {
    const content = getGameContent();
    const save = this.saveRepo.findById(saveId);
    const playerCharacter = this.saveRepo.findPlayerCharacter(saveId);
    const worldState = this.gameStateRepo.getWorldState(saveId);
    const mapDiscovery = this.gameStateRepo.getMapDiscovery(saveId);
    const questState = this.gameStateRepo.getQuestState(saveId);
    const factionStanding = this.gameStateRepo.getFactionStanding(saveId);

    if (!save || !playerCharacter || !worldState || !mapDiscovery || !questState || !factionStanding) {
      throw new Error("Save state is incomplete.");
    }

    const region = content.regions.find((candidate) => candidate.id === worldState.current_region_id) ?? null;
    const overworldMap = region
      ? content.overworldMaps.find((candidate) => candidate.id === region.mapId) ?? null
      : null;
    const currentLocation = worldState.current_location_id
      ? content.locations.find((candidate) => candidate.id === worldState.current_location_id) ?? null
      : null;
    const currentInteriorMap = worldState.current_map_id
      ? content.interiorMaps.find((candidate) => candidate.id === worldState.current_map_id) ?? null
      : null;

    return {
      save,
      playerCharacter,
      worldState,
      region,
      overworldMap,
      currentLocation,
      currentInteriorMap,
      mapDiscovery: JSON.parse(mapDiscovery.discovered_locations_json) as string[],
      questState: {
        active: JSON.parse(questState.active_quests_json) as string[],
        completed: JSON.parse(questState.completed_quests_json) as string[]
      },
      factionStanding: JSON.parse(factionStanding.standings_json) as Record<string, number>,
      locations: content.locations.filter((location) => location.regionId === save.region_id)
    };
  }

  public updateScreen(saveId: string, screen: "overworld" | "vault"): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);
    if (!worldState) {
      throw new Error("World state not found.");
    }

    const region = content.regions.find((candidate) => candidate.id === worldState.current_region_id);
    if (!region) {
      throw new Error("Region content not found.");
    }

    const vaultLocation = content.locations.find(
      (candidate) => candidate.regionId === region.id && candidate.type === "vault" && candidate.interiorMapId
    );

    if (screen === "vault" && !vaultLocation?.interiorMapId) {
      throw new Error("No vault content is available for this region.");
    }

    this.gameStateRepo.updateWorldState({
      ...worldState,
      current_screen: screen,
      current_location_id: screen === "overworld" ? null : vaultLocation?.id ?? null,
      current_map_id: screen === "overworld" ? region.mapId : vaultLocation?.interiorMapId ?? null,
      current_panel: screen === "vault" ? "vault" : null,
      updated_at: Date.now()
    });
  }

  public enterLocation(saveId: string, locationId: string): void {
    const content = getGameContent();
    const worldState = this.gameStateRepo.getWorldState(saveId);
    const location = content.locations.find((candidate) => candidate.id === locationId);

    if (!worldState) {
      throw new Error("World state not found.");
    }

    if (!location || !location.interiorMapId) {
      throw new Error("That location cannot be entered.");
    }

    this.gameStateRepo.updateWorldState({
      ...worldState,
      current_screen: "location",
      current_location_id: location.id,
      current_map_id: location.interiorMapId,
      current_panel: "location",
      updated_at: Date.now()
    });
  }
}
