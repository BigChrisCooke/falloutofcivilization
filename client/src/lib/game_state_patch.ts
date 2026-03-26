import type {
  GameState,
  GameStatePatch,
  InteriorReplayStep,
  OverworldReplayStep
} from "./api.js";

function withDerivedLocations(nextState: GameState, previousLocations = nextState.locations): GameState {
  const discoveredLocationIds = new Set(nextState.mapDiscovery.discoveredLocationIds);
  const locations = previousLocations.map((location) => {
    const discovered = discoveredLocationIds.has(location.id);
    const atPlayerPosition =
      nextState.worldState.player_x === location.position.x &&
      nextState.worldState.player_y === location.position.y;

    if (location.discovered === discovered && location.atPlayerPosition === atPlayerPosition) {
      return location;
    }

    return {
      ...location,
      discovered,
      atPlayerPosition
    };
  });

  return {
    ...nextState,
    locations
  };
}

function appendUniqueValues(existing: string[], additions: string[]): string[] {
  if (additions.length === 0) {
    return existing;
  }

  const combined = [...existing];
  const seen = new Set(existing);

  for (const value of additions) {
    if (!seen.has(value)) {
      combined.push(value);
      seen.add(value);
    }
  }

  return combined;
}

export function applyGameStatePatch(previousState: GameState, patch: GameStatePatch): GameState {
  return withDerivedLocations({
    ...previousState,
    ...patch
  }, previousState.locations);
}

export function applyOverworldReplayStep(previousState: GameState, step: OverworldReplayStep): GameState {
  return withDerivedLocations({
    ...previousState,
    worldState: {
      ...previousState.worldState,
      current_screen: "overworld",
      current_location_id: null,
      current_panel: null,
      player_x: step.position.x,
      player_y: step.position.y
    },
    currentLocation: null,
    currentInteriorMap: null,
    mapDiscovery: {
      discoveredLocationIds: appendUniqueValues(previousState.mapDiscovery.discoveredLocationIds, step.discoveredLocationIds),
      discoveredTileKeys: appendUniqueValues(previousState.mapDiscovery.discoveredTileKeys, step.revealedTileKeys)
    }
  }, previousState.locations);
}

export function applyInteriorReplayStep(previousState: GameState, step: InteriorReplayStep): GameState {
  return withDerivedLocations({
    ...previousState,
    worldState: {
      ...previousState.worldState,
      player_x: step.position.x,
      player_y: step.position.y
    }
  }, previousState.locations);
}
