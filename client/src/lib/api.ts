import { getApiBaseUrl } from "./runtime_config.js";

export interface AuthUser {
  id: string;
  username: string;
}

export interface SaveGame {
  id: string;
  name: string;
  region_id: string;
}

export interface LocationSummary {
  id: string;
  name: string;
  type: string;
  description: string;
  position: {
    x: number;
    y: number;
  };
  interiorMapId: string | null;
  discovered: boolean;
  atPlayerPosition: boolean;
}

export interface DialogueOption {
  id: string;
  label: string;
  specialGateLabel: string | null;
  hasResponse: boolean;
  hasNext: boolean;
  grantsQuest: string | null;
  returnToRoot: boolean;
  alreadySelected: boolean;
  capsCost: number | null;
  canAfford: boolean;
}

export interface WeaponDefinition {
  id: string;
  name: string;
  category: string;
  damage: number;
  damageType: string;
  weight: number;
  value: number;
  rarity: string;
  description: string;
}

export interface DialogueNode {
  id: string;
  text: string;
  options: DialogueOption[];
  isRoot: boolean;
}

export interface QuestCompletionResult {
  questId: string;
  questName: string;
  karmaDelta: number;
  factionDeltas: Record<string, number>;
  itemsGranted: Array<{ itemId: string; label: string; quantity: number }>;
  capsGranted: number;
}

export interface DialogueSelectResult {
  response: string | null;
  nextNode: DialogueNode | null;
  questGranted: { id: string; name: string; description: string } | null;
  questCompleted: QuestCompletionResult | null;
  karmaDelta: number;
  factionDelta: { factionId: string; delta: number } | null;
  companionRecruited: string | null;
  companionReaction: { companionId: string; loyaltyDelta: number; newLoyalty: number; reaction: string; departed: boolean } | null;
  stateUpdated: boolean;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: "talk" | "fetch" | "kill" | "visit";
  target: string;
  locationId?: string;
  completed: boolean;
}

export interface QuestSummary {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  mapMarker: { locationId: string; label: string } | null;
  activeMapMarker: { locationId: string; label: string } | null;
}

export interface GameState {
  save: SaveGame;
  playerCharacter: {
    name: string;
    level: number;
    xp: number;
    archetype: string;
    special: {
      str: number; per: number; end: number; cha: number;
      int: number; agl: number; lck: number;
    } | null;
    karma: number;
  };
  worldState: {
    current_screen: "overworld" | "vault" | "location";
    current_location_id: string | null;
    current_panel: string | null;
    player_x: number | null;
    player_y: number | null;
  };
  region: {
    name: string;
    summary: string;
  } | null;
  overworldMap: {
    id: string;
    name: string;
    theme: string;
    width: number;
    height: number;
    fogRevealRadius: number;
    layout: string[][];
  } | null;
  currentLocation: {
    id: string;
    name: string;
    description: string;
  } | null;
  currentInteriorMap: {
    id: string;
    name: string;
    theme: string;
    layout: string[][];
    spawnPoints: Array<{ id: string; x: number; y: number }>;
    exits: Array<{ id: string; target: string; x: number; y: number }>;
    interactables: Array<{
      id: string;
      label: string;
      type: string;
      actions?: Array<{
        id: string;
        label: string;
        response?: string;
        steal?: { itemId: string; label: string; ownedBy?: string; quantity?: number; description?: string };
        grant?: { itemId: string; label: string; quantity?: number; description?: string };
      }>;
    }>;
    npcs: Array<{
      id: string;
      name: string;
      disposition: string;
      factionId?: string;
      dialogue?: {
        rootNodeId: string;
        nodes: Array<{
          id: string;
          text: string;
          options: Array<{
            id: string;
            label: string;
            response?: string;
            next?: string;
            specialGate?: { stat: string; min?: number; max?: number };
            questGrant?: string;
            factionDelta?: { factionId: string; delta: number };
            karmaDelta?: number;
            returnToRoot?: boolean;
          }>;
        }>;
      };
    }>;
    loot: Array<{ id: string; label: string; ownedBy?: string; description?: string }>;
    questHooks: string[];
  } | null;
  mapDiscovery: {
    discoveredLocationIds: string[];
    discoveredTileKeys: string[];
  };
  questState: {
    active: string[];
    completed: string[];
    definitions: QuestSummary[];
  };
  inventory: Array<{
    id: string;
    label: string;
    ownedBy: string | null;
    quantity: number;
    description: string | null;
  }>;
  collectedItemIds: string[];
  collectedActionIds: string[];
  companions: Array<{
    companionId: string;
    name: string;
    tokenColor: string | null;
    loyalty: number;
    storyStage: number;
    storyStageTitle: string | null;
    hasNewStory: boolean;
    recruitedAt: number;
  }>;
  factionStanding: Record<string, number>;
  locations: LocationSummary[];
  weaponCatalog: WeaponDefinition[];
}

interface SessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  currentSaveId: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Request failed." }))) as { error?: string };
    throw new Error(payload.error ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getSession(): Promise<SessionResponse> {
  return request<SessionResponse>("/api/auth/session");
}

export function register(username: string, password: string): Promise<{ user: AuthUser }> {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function login(username: string, password: string): Promise<{ user: AuthUser }> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function logout(): Promise<void> {
  return request("/api/auth/logout", {
    method: "POST"
  });
}

export function listSaves(): Promise<{ saves: SaveGame[] }> {
  return request("/api/saves");
}

export function createSave(name: string): Promise<{ save: SaveGame }> {
  return request("/api/saves", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export function loadSave(saveId: string): Promise<{ save: SaveGame }> {
  return request(`/api/saves/${saveId}/load`, {
    method: "POST"
  });
}

export function deleteSave(saveId: string): Promise<{ deleted: boolean }> {
  return request(`/api/saves/${saveId}`, {
    method: "DELETE"
  });
}

export function getGameState(): Promise<{ saveLoaded: false } | { saveLoaded: true; state: GameState }> {
  return request("/api/game/state");
}

export function updateScreen(screen: "overworld" | "vault"): Promise<{ state: GameState }> {
  return request("/api/game/screen", {
    method: "POST",
    body: JSON.stringify({ screen })
  });
}

export function enterLocation(locationId: string): Promise<{ state: GameState }> {
  return request("/api/game/location/enter", {
    method: "POST",
    body: JSON.stringify({ locationId })
  });
}

export function travel(x: number, y: number): Promise<{ state: GameState }> {
  return request("/api/game/travel", {
    method: "POST",
    body: JSON.stringify({ x, y })
  });
}

export function moveInterior(x: number, y: number): Promise<{ state: GameState }> {
  return request("/api/game/interior/move", {
    method: "POST",
    body: JSON.stringify({ x, y })
  });
}

export function exitInterior(exitId: string): Promise<{ state: GameState }> {
  return request("/api/game/interior/exit", {
    method: "POST",
    body: JSON.stringify({ exitId })
  });
}

export function savePlayerSpecial(special: Record<string, number>): Promise<{ state: GameState }> {
  return request("/api/game/character/special", {
    method: "POST",
    body: JSON.stringify(special)
  });
}

export function getDialogueNode(npcId: string): Promise<{ node: DialogueNode | null }> {
  return request("/api/game/dialogue/node", {
    method: "POST",
    body: JSON.stringify({ npcId })
  });
}

export function selectDialogueOption(npcId: string, optionId: string): Promise<{ result: DialogueSelectResult; state: GameState }> {
  return request("/api/game/dialogue/select", {
    method: "POST",
    body: JSON.stringify({ npcId, optionId })
  });
}

export function collectItem(
  itemId: string,
  label: string,
  ownedBy?: string | null,
  quantity?: number,
  description?: string | null,
  actionId?: string
): Promise<{ result: { karmaDelta: number; factionDelta: { factionId: string; delta: number } | null; companionReaction: { companionId: string; loyaltyDelta: number; newLoyalty: number; reaction: string; departed: boolean } | null }; state: GameState }> {
  return request("/api/game/inventory/collect", {
    method: "POST",
    body: JSON.stringify({ itemId, label, ownedBy: ownedBy ?? null, quantity: quantity ?? 1, description: description ?? null, actionId: actionId ?? undefined })
  });
}

export function saveCurrentGame(saveId: string): Promise<{ save: SaveGame; message: string }> {
  return request(`/api/saves/${saveId}/save`, {
    method: "POST"
  });
}

export function getCompanionStoryDialogue(companionId: string): Promise<{ storyDialogue: { dialogue: { rootNodeId: string; nodes: Array<{ id: string; text: string; options: Array<{ id: string; label: string; response?: string; next?: string }> }> }; stageTitle: string } | null }> {
  return request("/api/game/companion/story", {
    method: "POST",
    body: JSON.stringify({ companionId })
  });
}

export function recruitCompanion(companionId: string): Promise<{ state: GameState }> {
  return request("/api/game/companion/recruit", {
    method: "POST",
    body: JSON.stringify({ companionId })
  });
}

export function resetDialogue(npcId: string): Promise<{ node: DialogueNode | null }> {
  return request("/api/game/dialogue/reset", {
    method: "POST",
    body: JSON.stringify({ npcId })
  });
}
