import { getDb, withTransaction } from "../db/connection.js";
import type {
  FactionStandingRow,
  MapDiscoveryRow,
  QuestStateRow,
  WorldStateRow
} from "../shared/types.js";

export class GameStateRepo {
  public async createInitialState(
    worldState: WorldStateRow,
    mapDiscovery: MapDiscoveryRow,
    questState: QuestStateRow,
    factionStanding: FactionStandingRow
  ): Promise<void> {
    await withTransaction(async () => {
      const db = getDb();

      await db.run(
        "INSERT INTO world_state (save_id, current_screen, current_region_id, current_location_id, current_map_id, current_panel, player_x, player_y, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          worldState.save_id,
          worldState.current_screen,
          worldState.current_region_id,
          worldState.current_location_id,
          worldState.current_map_id,
          worldState.current_panel,
          worldState.player_x,
          worldState.player_y,
          worldState.updated_at
        ]
      );

      await db.run(
        "INSERT INTO map_discovery (save_id, discovered_locations_json, discovered_tiles_json, entered_locations_json, updated_at) VALUES (?, ?, ?, ?, ?)",
        [
          mapDiscovery.save_id,
          mapDiscovery.discovered_locations_json,
          mapDiscovery.discovered_tiles_json,
          mapDiscovery.entered_locations_json,
          mapDiscovery.updated_at
        ]
      );

      await db.run(
        "INSERT INTO quest_state (save_id, active_quests_json, completed_quests_json, failed_quests_json, dialogue_state_json, collected_actions_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          questState.save_id,
          questState.active_quests_json,
          questState.completed_quests_json,
          questState.failed_quests_json,
          questState.dialogue_state_json,
          questState.collected_actions_json,
          questState.updated_at
        ]
      );

      await db.run("INSERT INTO faction_standing (save_id, standings_json, updated_at) VALUES (?, ?, ?)", [
        factionStanding.save_id,
        factionStanding.standings_json,
        factionStanding.updated_at
      ]);
    });
  }

  public async getWorldState(saveId: string): Promise<WorldStateRow | undefined> {
    return getDb().get<WorldStateRow>("SELECT * FROM world_state WHERE save_id = ?", [saveId]);
  }

  public async getMapDiscovery(saveId: string): Promise<MapDiscoveryRow | undefined> {
    return getDb().get<MapDiscoveryRow>("SELECT * FROM map_discovery WHERE save_id = ?", [saveId]);
  }

  public async getQuestState(saveId: string): Promise<QuestStateRow | undefined> {
    return getDb().get<QuestStateRow>("SELECT * FROM quest_state WHERE save_id = ?", [saveId]);
  }

  public async getFactionStanding(saveId: string): Promise<FactionStandingRow | undefined> {
    return getDb().get<FactionStandingRow>("SELECT * FROM faction_standing WHERE save_id = ?", [saveId]);
  }

  public async updateWorldState(worldState: WorldStateRow): Promise<void> {
    await getDb().run(
      "UPDATE world_state SET current_screen = ?, current_region_id = ?, current_location_id = ?, current_map_id = ?, current_panel = ?, player_x = ?, player_y = ?, updated_at = ? WHERE save_id = ?",
      [
        worldState.current_screen,
        worldState.current_region_id,
        worldState.current_location_id,
        worldState.current_map_id,
        worldState.current_panel,
        worldState.player_x,
        worldState.player_y,
        worldState.updated_at,
        worldState.save_id
      ]
    );
  }

  public async updateMapDiscovery(mapDiscovery: MapDiscoveryRow): Promise<void> {
    await getDb().run(
      "UPDATE map_discovery SET discovered_locations_json = ?, discovered_tiles_json = ?, entered_locations_json = ?, updated_at = ? WHERE save_id = ?",
      [
        mapDiscovery.discovered_locations_json,
        mapDiscovery.discovered_tiles_json,
        mapDiscovery.entered_locations_json,
        mapDiscovery.updated_at,
        mapDiscovery.save_id
      ]
    );
  }

  public async updateQuestState(questState: QuestStateRow): Promise<void> {
    await getDb().run(
      "UPDATE quest_state SET active_quests_json = ?, completed_quests_json = ?, failed_quests_json = ?, dialogue_state_json = ?, collected_actions_json = ?, updated_at = ? WHERE save_id = ?",
      [
        questState.active_quests_json,
        questState.completed_quests_json,
        questState.failed_quests_json,
        questState.dialogue_state_json,
        questState.collected_actions_json,
        questState.updated_at,
        questState.save_id
      ]
    );
  }

  public async updateFactionStanding(factionStanding: FactionStandingRow): Promise<void> {
    await getDb().run("UPDATE faction_standing SET standings_json = ?, updated_at = ? WHERE save_id = ?", [
      factionStanding.standings_json,
      factionStanding.updated_at,
      factionStanding.save_id
    ]);
  }

  public async updateExplorationState(worldState: WorldStateRow, mapDiscovery: MapDiscoveryRow): Promise<void> {
    await withTransaction(async () => {
      await this.updateWorldState(worldState);
      await this.updateMapDiscovery(mapDiscovery);
    });
  }
}
