import { useEffect, useEffectEvent, useRef } from "react";
import { Application, Container, Graphics, Rectangle } from "pixi.js";

import type { GameState } from "../lib/api.js";
import { buildOverworldSceneModel } from "../lib/map/overworld_scene_model.js";
import {
  clearPointerGesture,
  createPointerGesture,
  getDraggedWorldPosition,
  resolveHoverTile,
  resolveInteractionTarget,
  startPointerGesture,
  updatePointerGesture,
  type MapPointerGesture
} from "../lib/map/overworld_input.js";
import {
  createOverworldLayerContainers,
  renderFeedbackLayer,
  renderFogLayer,
  renderOverworldStaticLayers,
  renderPropLayer
} from "../lib/map/overworld_layers.js";
import { getCenteredWorldPosition, toWorldPoint } from "../lib/map/hex_geometry.js";

interface HexOverworldProps {
  state: GameState;
  onTravel: (x: number, y: number) => void;
  onEnterLocation: (locationId: string) => void;
}

export function HexOverworld({ state, onTravel, onEnterLocation }: HexOverworldProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const layersRef = useRef<ReturnType<typeof createOverworldLayerContainers> | null>(null);
  const sceneModelRef = useRef<ReturnType<typeof buildOverworldSceneModel> | null>(null);
  const courierRef = useRef<Container | null>(null);
  const lastMapIdRef = useRef<string | null>(null);
  const lastFogSignatureRef = useRef<string>("");
  const lastLocationSignatureRef = useRef<string>("");
  const pointerGestureRef = useRef<MapPointerGesture>(createPointerGesture());
  const detachCanvasEventsRef = useRef<(() => void) | null>(null);
  const onTravelEvent = useEffectEvent(onTravel);
  const onEnterLocationEvent = useEffectEvent(onEnterLocation);

  useEffect(() => {
    const host = sceneHostRef.current;
    if (!host) {
      return undefined;
    }

    let cancelled = false;

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

      appRef.current = nextApp;
      host.replaceChildren(nextApp.canvas);
      nextApp.stage.sortableChildren = true;
      nextApp.canvas.style.touchAction = "none";

      const stageBackdrop = new Graphics()
        .rect(-2400, -2400, 7200, 7200)
        .fill({ color: 0xffffff, alpha: 0.001 });
      const world = new Container();
      const layers = createOverworldLayerContainers();

      world.sortableChildren = true;
      stageBackdrop.eventMode = "none";
      world.addChild(layers.terrain, layers.fog, layers.feedback, layers.props, layers.actors);
      nextApp.stage.eventMode = "static";
      nextApp.stage.hitArea = new Rectangle(-2400, -2400, 7200, 7200);
      nextApp.stage.addChild(stageBackdrop, world);
      worldRef.current = world;
      layersRef.current = layers;

      const renderFeedback = () => {
        const nextScene = sceneModelRef.current;

        if (!nextScene) {
          return;
        }

        renderFeedbackLayer(layers.feedback, nextScene);
      };

      const setHoverTile = (hoverTileKey: string | null) => {
        const currentScene = sceneModelRef.current;

        if (!currentScene || currentScene.hoverTileKey === hoverTileKey) {
          return;
        }

        sceneModelRef.current = {
          ...currentScene,
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
          sceneModelRef.current?.courier.anchor ?? { x: 0, y: 0 }
        );

        world.position.set(centered.x, centered.y);
      };

      const refreshHover = (screenX: number, screenY: number) => {
        const worldPoint = toWorldPoint({ x: screenX, y: screenY }, { x: world.x, y: world.y });
        const nextHoverTileKey = resolveHoverTile(sceneModel, worldPoint);

        setHoverTile(nextHoverTileKey);
      };

      const clearHover = () => {
        setHoverTile(null);
      };

      nextApp.stage.on("pointerdown", (event) => {
        pointerGestureRef.current = startPointerGesture(
          { x: event.global.x, y: event.global.y },
          { x: world.x, y: world.y }
        );
      });

      nextApp.stage.on("pointermove", (event) => {
        if (!pointerGestureRef.current.active) {
          refreshHover(event.global.x, event.global.y);
          return;
        }

        pointerGestureRef.current = updatePointerGesture(pointerGestureRef.current, {
          x: event.global.x,
          y: event.global.y
        });

        if (!pointerGestureRef.current.moved) {
          refreshHover(event.global.x, event.global.y);
          return;
        }

        clearHover();
        const draggedWorldPosition = getDraggedWorldPosition(pointerGestureRef.current, {
          x: event.global.x,
          y: event.global.y
        });

        world.position.set(draggedWorldPosition.x, draggedWorldPosition.y);
      });

      const completeClick = (screenX: number, screenY: number) => {
        const nextScene = sceneModelRef.current;

        if (!nextScene) {
          return;
        }

        const worldPoint = toWorldPoint({ x: screenX, y: screenY }, { x: world.x, y: world.y });
        const target = resolveInteractionTarget(nextScene, worldPoint);

        if (target.kind === "tile") {
          onTravelEvent(target.point.x, target.point.y);
          return;
        }

        if (target.kind === "location") {
          onEnterLocationEvent(target.locationId);
        }
      };

      const stopPointer = (screenX?: number, screenY?: number) => {
        const gesture = screenX !== undefined && screenY !== undefined
          ? updatePointerGesture(pointerGestureRef.current, { x: screenX, y: screenY })
          : pointerGestureRef.current;

        pointerGestureRef.current = clearPointerGesture();

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
      detachCanvasEventsRef.current = () => {
        nextApp.canvas.removeEventListener("pointerleave", handlePointerLeave);
      };

      const initialScene = buildOverworldSceneModel(state);

      if (initialScene) {
        sceneModelRef.current = initialScene;
        lastMapIdRef.current = initialScene.mapId;
        lastFogSignatureRef.current = initialScene.tiles.filter((tile) => !tile.discovered).map((tile) => tile.key).join("|");
        lastLocationSignatureRef.current = initialScene.locations
          .map((location) => `${location.id}:${location.markerPosition.x},${location.markerPosition.y}`)
          .join("|");
        const courier = renderOverworldStaticLayers(layers, initialScene).courier;

        courierRef.current = courier;
        renderFeedbackLayer(layers.feedback, initialScene);

        const centered = getCenteredWorldPosition(
          {
            width: nextApp.screen.width,
            height: nextApp.screen.height
          },
          initialScene.courier.anchor
        );

        world.position.set(centered.x, centered.y);
      }

      let tick = 0;
      nextApp.ticker.add(() => {
        tick += 0.06;
        const courier = courierRef.current;
        const nextScene = sceneModelRef.current;

        if (!courier || !nextScene) {
          return;
        }

        courier.y = nextScene.courier.anchor.y + Math.sin(tick) * 4;
      });
    }

    void mountScene();

    return () => {
      cancelled = true;

      if (appRef.current) {
        detachCanvasEventsRef.current?.();
        appRef.current.destroy(true, { children: true });
      }

      appRef.current = null;
      worldRef.current = null;
      layersRef.current = null;
      sceneModelRef.current = null;
      courierRef.current = null;
      lastMapIdRef.current = null;
      lastFogSignatureRef.current = "";
      lastLocationSignatureRef.current = "";
      detachCanvasEventsRef.current = null;
      host.replaceChildren();
    };
  }, [onEnterLocationEvent, onTravelEvent]);

  useEffect(() => {
    const scene = buildOverworldSceneModel(state);
    const world = worldRef.current;
    const layers = layersRef.current;
    const app = appRef.current;

    if (!scene || !world || !layers || !app) {
      return;
    }

    sceneModelRef.current = scene;
    const shouldRecenter = lastMapIdRef.current !== scene.mapId;
    const fogSignature = scene.tiles.filter((tile) => !tile.discovered).map((tile) => tile.key).join("|");
    const locationSignature = scene.locations
      .map((location) => `${location.id}:${location.markerPosition.x},${location.markerPosition.y}`)
      .join("|");

    if (shouldRecenter || !courierRef.current) {
      const courier = renderOverworldStaticLayers(layers, scene).courier;

      courierRef.current = courier;
      lastFogSignatureRef.current = fogSignature;
      lastLocationSignatureRef.current = locationSignature;
    } else {
      if (lastFogSignatureRef.current !== fogSignature) {
        renderFogLayer(layers.fog, scene);
        lastFogSignatureRef.current = fogSignature;
      }

      if (lastLocationSignatureRef.current !== locationSignature) {
        renderPropLayer(layers.props, scene);
        lastLocationSignatureRef.current = locationSignature;
      }

      courierRef.current.position.set(scene.courier.anchor.x, scene.courier.anchor.y);
      courierRef.current.zIndex = scene.courier.zIndex;
    }

    renderFeedbackLayer(layers.feedback, scene);

    if (shouldRecenter) {
      const centered = getCenteredWorldPosition(
        {
          width: app.screen.width,
          height: app.screen.height
        },
        scene.courier.anchor
      );

      world.position.set(centered.x, centered.y);
    }

    lastMapIdRef.current = scene.mapId;
  }, [state]);

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
              <span key={location.id} className={`location-chip ${location.atPlayerPosition ? "is-current" : ""}`}>
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
