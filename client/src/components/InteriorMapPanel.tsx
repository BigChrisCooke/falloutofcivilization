import type { GameState } from "../lib/api.js";
import { interiorRuntimeAdapter } from "../lib/map/interior_adapter.js";
import { buildInteriorSceneModel } from "../lib/map/interior_scene_model.js";
import { useRetainedMapRuntime } from "../lib/map/map_runtime.js";

interface InteriorMapPanelProps {
  state: GameState;
  variant: "vault" | "location";
  onMove: (x: number, y: number) => void;
  onExit: (exitId: string) => void;
}

export function InteriorMapPanel({ state, variant, onMove, onExit }: InteriorMapPanelProps) {
  const map = state.currentInteriorMap;
  const scene = buildInteriorSceneModel(state);
  const sceneHostRef = useRetainedMapRuntime(scene, interiorRuntimeAdapter, {
    onMove,
    onExit
  });

  if (!map) {
    return null;
  }

  return (
    <section className={`panel interior-panel ${variant === "vault" ? "is-vault" : "is-location"}`}>
      <div className="interior-copy">
        <div>
          <p className="eyebrow">{variant === "vault" ? "Vault Home" : state.currentLocation?.name ?? "Interior"}</p>
          <h2>{map.name}</h2>
        </div>
        <div className="hero-meta">
          <span>{map.theme}</span>
          <span>
            {state.worldState.player_x},{state.worldState.player_y}
          </span>
        </div>
      </div>

      <div className="scene-shell">
        <div ref={sceneHostRef} className={`scene-surface interior-surface ${variant === "vault" ? "is-vault" : "is-location"}`} />
      </div>

      <div className="detail-grid scene-detail-grid">
        <div>
          <h3>NPCs</h3>
          {map.npcs.length === 0 ? <p className="subtle">No NPCs placed yet.</p> : null}
          {map.npcs.map((npc) => (
            <p key={npc.id}>
              {npc.name} · {npc.disposition}
            </p>
          ))}
        </div>
        <div>
          <h3>Interactables</h3>
          {map.interactables.length === 0 ? <p className="subtle">No interactables placed yet.</p> : null}
          {map.interactables.map((item) => (
            <p key={item.id}>
              {item.label} · {item.type}
            </p>
          ))}
        </div>
      </div>

      <div className="detail-grid scene-detail-grid">
        <div>
          <h3>Loot</h3>
          {map.loot.length === 0 ? <p className="subtle">No loot placed yet.</p> : null}
          {map.loot.map((loot) => (
            <p key={loot.id}>{loot.label}</p>
          ))}
        </div>
        <div>
          <h3>Exit hooks</h3>
          <div className="location-actions">
            {map.exits.map((exit) => (
              <button key={exit.id} className="primary-button" type="button" onClick={() => onExit(exit.id)}>
                Leave via {exit.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
