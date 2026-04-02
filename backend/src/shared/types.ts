export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
}

export interface SessionRow {
  id: string;
  user_id: string;
  current_save_id: string | null;
  expires_at: number;
  created_at: number;
}

export interface SaveGameRow {
  id: string;
  user_id: string;
  name: string;
  region_id: string;
  created_at: number;
  updated_at: number;
}

export interface PlayerCharacterRow {
  id: string;
  save_id: string;
  name: string;
  level: number;
  xp: number;
  archetype: string;
  special_json: string | null;
  karma: number;
  skills_json: string | null;
  tagged_skills_json: string | null;
  unspent_skill_points: number;
  hp: number;
  max_hp: number;
  equipped_weapon_id: string | null;
  created_at: number;
}

export interface CombatStateRow {
  save_id: string;
  map_id: string;
  turn_number: number;
  active_turn: string;
  npcs_json: string;
  updated_at: number;
}

export interface WorldStateRow {
  save_id: string;
  current_screen: "overworld" | "vault" | "location";
  current_region_id: string;
  current_location_id: string | null;
  current_map_id: string | null;
  current_panel: string | null;
  player_x: number | null;
  player_y: number | null;
  theft_witnesses_json: string | null;
  updated_at: number;
}

export interface MapDiscoveryRow {
  save_id: string;
  discovered_locations_json: string;
  discovered_tiles_json: string | null;
  entered_locations_json: string | null;
  updated_at: number;
}

export interface QuestStateRow {
  save_id: string;
  active_quests_json: string;
  completed_quests_json: string;
  failed_quests_json: string;
  dialogue_state_json: string;
  collected_actions_json: string;
  updated_at: number;
}

export interface PlayerInventoryRow {
  save_id: string;
  item_id: string;
  label: string;
  owned_by: string | null;
  quantity: number;
  description: string | null;
  tags?: string | null;
  collected_at: number;
}

export interface FactionStandingRow {
  save_id: string;
  standings_json: string;
  updated_at: number;
}

export interface CompanionInstanceRow {
  save_id: string;
  companion_id: string;
  recruited_at: number;
  loyalty: number;
  story_stage: number;
  story_stage_viewed: number;
  departed: number;
  companion_x: number | null;
  companion_y: number | null;
  companion_map_id: string | null;
  active_goal_id: string | null;
  goal_progress: string | null;
  conclusion_triggered: number;
  conclusion_accepted: number | null;
}

export interface MapLootRow {
  id: string;
  save_id: string;
  map_id: string;
  item_id: string;
  label: string;
  x: number;
  y: number;
  dropped_at: number;
}

export interface AuthUser {
  id: string;
  username: string;
}
