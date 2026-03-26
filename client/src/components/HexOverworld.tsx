import type { GameState } from "../lib/api.js";
import { useRetainedMapRuntime } from "../lib/map/map_runtime.js";
import { buildOverworldSceneModel } from "../lib/map/overworld_scene_model.js";
import { overworldRuntimeAdapter } from "../lib/map/overworld_adapter.js";

interface HexOverworldProps {
  state: GameState;
  selectedQuestId?: string | null;
  highlightedLocationId: string | null;
  onHighlightLocation: (locationId: string | null) => void;
  onTravel: (x: number, y: number) => Promise<boolean>;
  onEnterLocation: (locationId: string) => void;
}

export function HexOverworld({ state, selectedQuestId, highlightedLocationId, onHighlightLocation, onTravel, onEnterLocation }: HexOverworldProps) {
  const scene = buildOverworldSceneModel(state, selectedQuestId, highlightedLocationId);
  const sceneHostRef = useRetainedMapRuntime(scene, overworldRuntimeAdapter, {
    onTravel,
    onEnterLocation
  });
  const currentTileLocations = state.locations.filter(
    (location) => location.atPlayerPosition && location.discovered && location.interiorMapId
  );
  const discoveredLocations = state.locations.filter((location) => location.discovered);

  return (
    <section className="panel overworld-panel">
      <div className="overworld-copy">
        <div>
          <p className="eyebrow">Frontier Overworld</p>
          <h2>{state.overworldMap?.name ?? "Unknown Region"}</h2>
        </div>
        <div className="hero-meta">
          <span>{state.mapDiscovery.discoveredTileKeys.length} revealed</span>
          <span>
            {state.worldState.player_x},{state.worldState.player_y}
          </span>
        </div>
      </div>

      <div className="scene-shell">
        <div ref={sceneHostRef} className="scene-surface overworld-surface" />
      </div>

      <div className="detail-grid scene-detail-grid">
        <div>
          <h3>Known locations</h3>
          <div className="location-chip-list">
            {discoveredLocations.map((location) => (
              <span
                key={location.id}
                className={`location-chip${location.atPlayerPosition ? " is-current" : ""}${highlightedLocationId === location.id ? " is-selected" : ""}`}
                onClick={() => onHighlightLocation(highlightedLocationId === location.id ? null : location.id)}
              >
                {location.name}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3>Current tile</h3>
          {currentTileLocations.length === 0 ? (
            <p className="subtle">Pan the map, move onto a marked tile, then enter it.</p>
          ) : (
            <div className="location-actions">
              {currentTileLocations.map((location) => (
                <button
                  key={location.id}
                  className="primary-button"
                  type="button"
                  onClick={() => onEnterLocation(location.id)}
                >
                  Enter {location.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
