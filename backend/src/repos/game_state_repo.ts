import type Database from "better-sqlite3";

import type {
  FactionStandingRow,
  MapDiscoveryRow,
  QuestStateRow,
  WorldStateRow
} from "../shared/types.js";

export class GameStateRepo {
  public constructor(private readonly db: Database.Database) {}

  public createInitialState(
    worldState: WorldStateRow,
    mapDiscovery: MapDiscoveryRow,
    questState: QuestStateRow,
    factionStanding: FactionStandingRow
  ): void {
    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO world_state (save_id, current_screen, current_region_id, current_location_id, current_map_id, current_panel, player_x, player_y, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          worldState.save_id,
          worldState.current_screen,
          worldState.current_region_id,
          worldState.current_location_id,
          worldState.current_map_id,
          worldState.current_panel,
          worldState.player_x,
          worldState.player_y,
          worldState.updated_at
        );

      this.db
        .prepare(
          "INSERT INTO map_discovery (save_id, discovered_locations_json, discovered_tiles_json, updated_at) VALUES (?, ?, ?, ?)"
        )
        .run(
          mapDiscovery.save_id,
          mapDiscovery.discovered_locations_json,
          mapDiscovery.discovered_tiles_json,
          mapDiscovery.updated_at
        );

      this.db
        .prepare("INSERT INTO quest_state (save_id, active_quests_json, completed_quests_json, collected_actions_json, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run(
          questState.save_id,
          questState.active_quests_json,
          questState.completed_quests_json,
          questState.collected_actions_json,
          questState.updated_at
        );

      this.db
        .prepare("INSERT INTO faction_standing (save_id, standings_json, updated_at) VALUES (?, ?, ?)")
        .run(factionStanding.save_id, factionStanding.standings_json, factionStanding.updated_at);
    });

    transaction();
  }

  public getWorldState(saveId: string): WorldStateRow | undefined {
    return this.db.prepare("SELECT * FROM world_state WHERE save_id = ?").get(saveId) as WorldStateRow | undefined;
  }

  public getMapDiscovery(saveId: string): MapDiscoveryRow | undefined {
    return this.db.prepare("SELECT * FROM map_discovery WHERE save_id = ?").get(saveId) as MapDiscoveryRow | undefined;
  }

  public getQuestState(saveId: string): QuestStateRow | undefined {
    return this.db.prepare("SELECT * FROM quest_state WHERE save_id = ?").get(saveId) as QuestStateRow | undefined;
  }

  public getFactionStanding(saveId: string): FactionStandingRow | undefined {
    return this.db.prepare("SELECT * FROM faction_standing WHERE save_id = ?").get(saveId) as FactionStandingRow | undefined;
  }

  public updateWorldState(worldState: WorldStateRow): void {
    this.db
      .prepare(
        "UPDATE world_state SET current_screen = ?, current_region_id = ?, current_location_id = ?, current_map_id = ?, current_panel = ?, player_x = ?, player_y = ?, updated_at = ? WHERE save_id = ?"
      )
      .run(
        worldState.current_screen,
        worldState.current_region_id,
        worldState.current_location_id,
        worldState.current_map_id,
        worldState.current_panel,
        worldState.player_x,
        worldState.player_y,
        worldState.updated_at,
        worldState.save_id
      );
  }

  public updateMapDiscovery(mapDiscovery: MapDiscoveryRow): void {
    this.db
      .prepare(
        "UPDATE map_discovery SET discovered_locations_json = ?, discovered_tiles_json = ?, entered_locations_json = ?, updated_at = ? WHERE save_id = ?"
      )
      .run(
        mapDiscovery.discovered_locations_json,
        mapDiscovery.discovered_tiles_json,
        mapDiscovery.entered_locations_json,
        mapDiscovery.updated_at,
        mapDiscovery.save_id
      );
  }

  public updateQuestState(questState: QuestStateRow): void {
    this.db
      .prepare(
        "UPDATE quest_state SET active_quests_json = ?, completed_quests_json = ?, failed_quests_json = ?, dialogue_state_json = ?, collected_actions_json = ?, updated_at = ? WHERE save_id = ?"
      )
      .run(
        questState.active_quests_json,
        questState.completed_quests_json,
        questState.failed_quests_json,
        questState.dialogue_state_json,
        questState.collected_actions_json,
        questState.updated_at,
        questState.save_id
      );
  }

  public updateFactionStanding(factionStanding: FactionStandingRow): void {
    this.db
      .prepare("UPDATE faction_standing SET standings_json = ?, updated_at = ? WHERE save_id = ?")
      .run(factionStanding.standings_json, factionStanding.updated_at, factionStanding.save_id);
  }

  public updateExplorationState(worldState: WorldStateRow, mapDiscovery: MapDiscoveryRow): void {
    const transaction = this.db.transaction(() => {
      this.updateWorldState(worldState);
      this.updateMapDiscovery(mapDiscovery);
    });

    transaction();
  }
}
