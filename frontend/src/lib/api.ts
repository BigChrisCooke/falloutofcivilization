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
  interiorMapId: string | null;
}

export interface GameState {
  save: SaveGame;
  playerCharacter: {
    name: string;
    level: number;
    archetype: string;
  };
  worldState: {
    current_screen: "overworld" | "vault" | "location";
    current_location_id: string | null;
    current_panel: string | null;
  };
  region: {
    name: string;
    summary: string;
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
    interactables: Array<{ id: string; label: string; type: string }>;
    npcs: Array<{ id: string; name: string; disposition: string }>;
    loot: Array<{ id: string; label: string }>;
  } | null;
  mapDiscovery: string[];
  factionStanding: Record<string, number>;
  locations: LocationSummary[];
}

interface SessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  currentSaveId: string | null;
}

const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
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
