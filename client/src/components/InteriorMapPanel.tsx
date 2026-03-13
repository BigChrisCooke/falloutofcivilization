import { useEffect, useEffectEvent, useRef } from "react";
import { Application, Container, Graphics, Rectangle } from "pixi.js";

import type { GameState } from "../lib/api.js";
import { buildInteriorSceneModel } from "../lib/map/interior_scene_model.js";
import { resolveInteriorHoverTile, resolveInteriorInteractionTarget } from "../lib/map/interior_input.js";
import { createInteriorLayerContainers, renderInteriorFeedbackLayer, renderInteriorStaticLayers } from "../lib/map/interior_layers.js";
import { getCenteredWorldPosition, toWorldPoint } from "../lib/map/hex_geometry.js";
import {
  clearPointerGesture,
  createPointerGesture,
  getDraggedWorldPosition,
  startPointerGesture,
  updatePointerGesture,
  type MapPointerGesture
} from "../lib/map/pointer_gesture.js";

interface InteriorMapPanelProps {
  state: GameState;
  variant: "vault" | "location";
  onMove: (x: number, y: number) => void;
  onExit: (exitId: string) => void;
}

export function InteriorMapPanel({ state, variant, onMove, onExit }: InteriorMapPanelProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const onMoveEvent = useEffectEvent(onMove);
  const onExitEvent = useEffectEvent(onExit);

  useEffect(() => {
    const host = sceneHostRef.current;
    const scene = buildInteriorSceneModel(state);

    if (!host || !scene) {
      return undefined;
    }

    let cancelled = false;
    let app: Application | null = null;
    let detachCanvasEvents: (() => void) | null = null;

    async function mountScene() {
      const nextApp = new Application();

      await nextApp.init({
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        preference: "webgl",
        resolution: Math.max(window.devicePixelRatio || 1, 1),
        resizeTo: host
      });

      if (cancelled) {
        nextApp.destroy(true, { children: true });
        return;
      }

      app = nextApp;
      host.replaceChildren(nextApp.canvas);
      nextApp.stage.sortableChildren = true;
      nextApp.canvas.style.touchAction = "none";

      const stageBackdrop = new Graphics()
        .rect(-scene.boardSize.width, -scene.boardSize.height, scene.boardSize.width * 3, scene.boardSize.height * 3)
        .fill({ color: 0xffffff, alpha: 0.001 });
      const world = new Container();
      const layers = createInteriorLayerContainers();
      let pointerGesture: MapPointerGesture = createPointerGesture();
      let sceneModel = scene;
      let courier = renderInteriorStaticLayers(layers, sceneModel).courier;

      world.sortableChildren = true;
      stageBackdrop.eventMode = "none";
      world.addChild(layers.terrain, layers.feedback, layers.props, layers.actors);
      nextApp.stage.eventMode = "static";
      nextApp.stage.hitArea = new Rectangle(
        -scene.boardSize.width,
        -scene.boardSize.height,
        scene.boardSize.width * 3,
        scene.boardSize.height * 3
      );
      nextApp.stage.addChild(stageBackdrop, world);

      const renderFeedback = () => {
        renderInteriorFeedbackLayer(layers.feedback, sceneModel);
      };

      const setHoverTile = (hoverTileKey: string | null) => {
        if (sceneModel.hoverTileKey === hoverTileKey) {
          return;
        }

        sceneModel = {
          ...sceneModel,
          hoverTileKey
        };
        renderFeedback();
      };

      const recenterWorld = () => {
        const centered = getCenteredWorldPosition(
          {
            width: nextApp.screen.width,
            height: nextApp.screen.height
          },
          sceneModel.courier.anchor
        );

        world.position.set(centered.x, centered.y);
      };

      const refreshHover = (screenX: number, screenY: number) => {
        const worldPoint = toWorldPoint({ x: screenX, y: screenY }, { x: world.x, y: world.y });
        setHoverTile(resolveInteriorHoverTile(sceneModel, worldPoint));
      };

      const clearHover = () => {
        setHoverTile(null);
      };

      nextApp.stage.on("pointerdown", (event) => {
        pointerGesture = startPointerGesture(
          { x: event.global.x, y: event.global.y },
          { x: world.x, y: world.y }
        );
      });

      nextApp.stage.on("pointermove", (event) => {
        if (!pointerGesture.active) {
          refreshHover(event.global.x, event.global.y);
          return;
        }

        pointerGesture = updatePointerGesture(pointerGesture, {
          x: event.global.x,
          y: event.global.y
        });

        if (!pointerGesture.moved) {
          refreshHover(event.global.x, event.global.y);
          return;
        }

        clearHover();
        const draggedWorldPosition = getDraggedWorldPosition(pointerGesture, {
          x: event.global.x,
          y: event.global.y
        });

        world.position.set(draggedWorldPosition.x, draggedWorldPosition.y);
      });

      const completeClick = (screenX: number, screenY: number) => {
        const worldPoint = toWorldPoint({ x: screenX, y: screenY }, { x: world.x, y: world.y });
        const target = resolveInteriorInteractionTarget(sceneModel, worldPoint);

        if (target.kind === "tile") {
          onMoveEvent(target.point.x, target.point.y);
          return;
        }

        if (target.kind === "exit") {
          onExitEvent(target.exitId);
        }
      };

      const stopPointer = (screenX?: number, screenY?: number) => {
        const gesture = screenX !== undefined && screenY !== undefined
          ? updatePointerGesture(pointerGesture, { x: screenX, y: screenY })
          : pointerGesture;

        pointerGesture = clearPointerGesture();

        if (!gesture.active || gesture.moved || screenX === undefined || screenY === undefined) {
          return;
        }

        completeClick(screenX, screenY);
      };

      nextApp.stage.on("pointerup", (event) => {
        stopPointer(event.global.x, event.global.y);
      });
      nextApp.stage.on("pointerupoutside", () => {
        stopPointer();
      });
      nextApp.stage.on("pointercancel", () => {
        stopPointer();
      });

      const handlePointerLeave = () => {
        clearHover();
      };

      nextApp.canvas.addEventListener("pointerleave", handlePointerLeave);
      detachCanvasEvents = () => {
        nextApp.canvas.removeEventListener("pointerleave", handlePointerLeave);
      };

      renderFeedback();
      recenterWorld();
      let tick = 0;
      nextApp.ticker.add(() => {
        tick += 0.06;
        courier.y = sceneModel.courier.anchor.y + Math.sin(tick) * 3;
      });
    }

    void mountScene();

    return () => {
      cancelled = true;

      if (app) {
        detachCanvasEvents?.();
        app.destroy(true, { children: true });
      }

      host.replaceChildren();
    };
  }, [state, variant, onExitEvent, onMoveEvent]);

  const map = state.currentInteriorMap;

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
