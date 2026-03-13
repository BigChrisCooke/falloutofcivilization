import type Database from "better-sqlite3";
import { toTileKey } from "../../../game/src/index.js";

import { GameStateRepo } from "../repos/game_state_repo.js";
import { SaveRepo } from "../repos/save_repo.js";
import { getGameContent } from "./content_service.js";
import {
  getOverworldMap,
  getRegionLocations,
  getStartingLocation,
  revealExploration
} from "./exploration_state.js";
import type {
  FactionStandingRow,
  MapDiscoveryRow,
  PlayerCharacterRow,
  QuestStateRow,
  SaveGameRow,
  WorldStateRow
} from "../shared/types.js";

export class SaveService {
  private readonly saveRepo: SaveRepo;
  private readonly gameStateRepo: GameStateRepo;

  public constructor(db: Database.Database) {
    this.saveRepo = new SaveRepo(db);
    this.gameStateRepo = new GameStateRepo(db);
  }

  public listSaves(userId: string): SaveGameRow[] {
    return this.saveRepo.listByUser(userId);
  }

  public createSave(userId: string, saveName: string): SaveGameRow {
    const content = getGameContent();
    const region = content.regions[0];

    if (!region) {
      throw new Error("No starting region content is available.");
    }

    const regionLocations = getRegionLocations(content, region.id);
    const overworldMap = getOverworldMap(content, region);
    const startingLocation = getStartingLocation(content, region, regionLocations);
    const explorationState = revealExploration(
      overworldMap,
      regionLocations,
      startingLocation.position,
      [startingLocation.id],
      [toTileKey(startingLocation.position)]
    );

    const now = Date.now();
    const save: SaveGameRow = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: saveName,
      region_id: region.id,
      created_at: now,
      updated_at: now
    };

    const playerCharacter: PlayerCharacterRow = {
      id: crypto.randomUUID(),
      save_id: save.id,
      name: "The Courier",
      level: 1,
      archetype: "survivor",
      created_at: now
    };

    const worldState: WorldStateRow = {
      save_id: save.id,
      current_screen: "overworld",
      current_region_id: region.id,
      current_location_id: null,
      current_map_id: region.mapId,
      current_panel: null,
      player_x: startingLocation.position.x,
      player_y: startingLocation.position.y,
      updated_at: now
    };

    const mapDiscovery: MapDiscoveryRow = {
      save_id: save.id,
      discovered_locations_json: JSON.stringify(explorationState.discoveredLocationIds),
      discovered_tiles_json: JSON.stringify(explorationState.discoveredTileKeys),
      updated_at: now
    };

    const questState: QuestStateRow = {
      save_id: save.id,
      active_quests_json: JSON.stringify([]),
      completed_quests_json: JSON.stringify([]),
      updated_at: now
    };

    const factionStanding: FactionStandingRow = {
      save_id: save.id,
      standings_json: JSON.stringify({
        vaultDwellers: 0,
        traders: 0,
        raiders: 0
      }),
      updated_at: now
    };

    this.saveRepo.create(save, playerCharacter);
    this.gameStateRepo.createInitialState(worldState, mapDiscovery, questState, factionStanding);

    return save;
  }

  public getSave(saveId: string): SaveGameRow | undefined {
    return this.saveRepo.findById(saveId);
  }
}
