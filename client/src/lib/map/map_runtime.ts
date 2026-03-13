import { useEffect, useLayoutEffect, useRef } from "react";
import { Application, Container, Graphics, Rectangle } from "pixi.js";

import { getCenteredWorldPosition, toWorldPoint, type PointerPosition } from "./hex_geometry.js";
import { observeMapViewport, type MapViewport } from "./map_viewport.js";
import {
  clearPointerGesture,
  createPointerGesture,
  getDraggedWorldPosition,
  startPointerGesture,
  updatePointerGesture,
  type MapPointerGesture
} from "./pointer_gesture.js";
import type { ProjectedPoint } from "../iso.js";
import type { WorldPoint } from "./types.js";

interface RuntimeScene {
  mapId: string;
  hoverTileKey: string | null;
}

export interface RetainedMapRuntimeAdapter<Scene extends RuntimeScene, Layers, RetainedNodes, InteractionTarget, Handlers> {
  createLayers: () => Layers;
  attachLayers: (world: Container, layers: Layers) => void;
  syncScene: (
    layers: Layers,
    retainedNodes: RetainedNodes | null,
    previousScene: Scene | null,
    nextScene: Scene
  ) => RetainedNodes;
  resolveHover: (scene: Scene, worldPoint: WorldPoint) => string | null;
  resolveInteraction: (scene: Scene, worldPoint: WorldPoint) => InteractionTarget;
  applyInteraction: (target: InteractionTarget, handlers: Handlers) => void;
  animate: (retainedNodes: RetainedNodes, scene: Scene, tick: number) => void;
  getCameraAnchor: (scene: Scene) => ProjectedPoint;
}

class RetainedMapRuntime<Scene extends RuntimeScene, Layers, RetainedNodes, InteractionTarget, Handlers> {
  private readonly world = new Container();
  private readonly stageBackdrop = new Graphics()
    .rect(-2400, -2400, 7200, 7200)
    .fill({ color: 0xffffff, alpha: 0.001 });
  private readonly pointerGesture = createPointerGesture();
  private readonly canvasPointerLeave = () => {
    this.setHoverTile(null);
  };

  private app: Application | null = null;
  private layers: Layers | null = null;
  private retainedNodes: RetainedNodes | null = null;
  private scene: Scene | null = null;
  private hoverTileKey: string | null = null;
  private cameraInitialized = false;
  private pointerState: MapPointerGesture = createPointerGesture();
  private detachViewportObserver: (() => void) | null = null;
  private canvasHost: HTMLElement | null = null;

  public constructor(
    private readonly host: HTMLDivElement,
    private readonly adapter: RetainedMapRuntimeAdapter<Scene, Layers, RetainedNodes, InteractionTarget, Handlers>,
    private readonly handlersRef: { current: Handlers }
  ) {
    this.world.sortableChildren = true;
    this.stageBackdrop.eventMode = "none";
  }

  public async init(): Promise<void> {
    const nextApp = new Application();
    const initialViewport = {
      width: Math.max(Math.floor(this.host.clientWidth), 1),
      height: Math.max(Math.floor(this.host.clientHeight), 1)
    };

    await nextApp.init({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      preference: "webgl",
      resolution: Math.max(window.devicePixelRatio || 1, 1),
      width: initialViewport.width,
      height: initialViewport.height
    });

    this.app = nextApp;
    this.layers = this.adapter.createLayers();
    this.host.replaceChildren(nextApp.canvas);
    this.canvasHost = nextApp.canvas;
    nextApp.canvas.style.touchAction = "none";
    nextApp.stage.sortableChildren = true;
    nextApp.stage.eventMode = "static";
    nextApp.stage.hitArea = new Rectangle(-2400, -2400, 7200, 7200);
    this.adapter.attachLayers(this.world, this.layers);
    nextApp.stage.addChild(this.stageBackdrop, this.world);
    this.bindPointerEvents(nextApp);
    this.detachViewportObserver = observeMapViewport(this.host, (viewport) => {
      this.resize(viewport);
    });

    let tick = 0;
    nextApp.ticker.add(() => {
      if (!this.retainedNodes || !this.scene) {
        return;
      }

      tick += 0.06;
      this.adapter.animate(this.retainedNodes, this.getRenderedScene(this.scene), tick);
    });
  }

  public destroy(): void {
    this.detachViewportObserver?.();

    if (this.canvasHost) {
      this.canvasHost.removeEventListener("pointerleave", this.canvasPointerLeave);
    }

    if (this.app) {
      this.app.destroy(true, { children: true });
    }

    this.app = null;
    this.layers = null;
    this.retainedNodes = null;
    this.scene = null;
    this.canvasHost = null;
    this.detachViewportObserver = null;
    this.hoverTileKey = null;
    this.cameraInitialized = false;
    this.pointerState = clearPointerGesture();
    this.host.replaceChildren();
  }

  public setScene(scene: Scene): void {
    if (!this.layers) {
      this.scene = scene;
      return;
    }

    const previousScene = this.scene ? this.getRenderedScene(this.scene) : null;
    const mapChanged = previousScene ? previousScene.mapId !== scene.mapId : true;

    if (mapChanged) {
      this.hoverTileKey = null;
    }

    const renderedScene = this.getRenderedScene(scene);

    this.retainedNodes = this.adapter.syncScene(this.layers, this.retainedNodes, previousScene, renderedScene);
    this.scene = scene;

    if (mapChanged || !this.cameraInitialized) {
      this.recenterCamera(renderedScene);
      this.cameraInitialized = true;
    }
  }

  private bindPointerEvents(app: Application): void {
    app.stage.on("pointerdown", (event) => {
      this.pointerState = startPointerGesture(
        { x: event.global.x, y: event.global.y },
        { x: this.world.position.x, y: this.world.position.y }
      );
    });

    app.stage.on("pointermove", (event) => {
      if (!this.pointerState.active) {
        this.refreshHover({ x: event.global.x, y: event.global.y });
        return;
      }

      this.pointerState = updatePointerGesture(this.pointerState, {
        x: event.global.x,
        y: event.global.y
      });

      if (!this.pointerState.moved) {
        this.refreshHover({ x: event.global.x, y: event.global.y });
        return;
      }

      this.setHoverTile(null);
      const draggedWorldPosition = getDraggedWorldPosition(this.pointerState, {
        x: event.global.x,
        y: event.global.y
      });

      this.world.position.set(draggedWorldPosition.x, draggedWorldPosition.y);
    });

    const stopPointer = (screenX?: number, screenY?: number) => {
      const gesture = screenX !== undefined && screenY !== undefined
        ? updatePointerGesture(this.pointerState, { x: screenX, y: screenY })
        : this.pointerState;

      this.pointerState = clearPointerGesture();

      if (!gesture.active || gesture.moved || screenX === undefined || screenY === undefined || !this.scene) {
        return;
      }

      const worldPoint = toWorldPoint({ x: screenX, y: screenY }, this.world.position);
      const target = this.adapter.resolveInteraction(this.getRenderedScene(this.scene), worldPoint);

      this.adapter.applyInteraction(target, this.handlersRef.current);
    };

    app.stage.on("pointerup", (event) => {
      stopPointer(event.global.x, event.global.y);
    });
    app.stage.on("pointerupoutside", () => {
      stopPointer();
    });
    app.stage.on("pointercancel", () => {
      stopPointer();
    });

    app.canvas.addEventListener("pointerleave", this.canvasPointerLeave);
  }

  private resize(viewport: MapViewport): void {
    if (!this.app) {
      return;
    }

    this.app.renderer.resize(viewport.width, viewport.height);

    if (!this.cameraInitialized || !this.scene) {
      return;
    }

    if (this.world.position.x === 0 && this.world.position.y === 0) {
      this.recenterCamera(this.getRenderedScene(this.scene));
    }
  }

  private refreshHover(pointer: PointerPosition): void {
    if (!this.scene) {
      return;
    }

    const worldPoint = toWorldPoint(pointer, this.world.position);
    const nextHoverTileKey = this.adapter.resolveHover(this.getRenderedScene(this.scene), worldPoint);

    this.setHoverTile(nextHoverTileKey);
  }

  private setHoverTile(hoverTileKey: string | null): void {
    if (!this.scene || !this.layers || this.hoverTileKey === hoverTileKey) {
      return;
    }

    const previousScene = this.getRenderedScene(this.scene);

    this.hoverTileKey = hoverTileKey;
    const nextScene = this.getRenderedScene(this.scene);

    this.retainedNodes = this.adapter.syncScene(this.layers, this.retainedNodes, previousScene, nextScene);
  }

  private recenterCamera(scene: Scene): void {
    if (!this.app) {
      return;
    }

    const centered = getCenteredWorldPosition(
      {
        width: this.app.screen.width,
        height: this.app.screen.height
      },
      this.adapter.getCameraAnchor(scene)
    );

    this.world.position.set(centered.x, centered.y);
  }

  private getRenderedScene(scene: Scene): Scene {
    return {
      ...scene,
      hoverTileKey: this.hoverTileKey
    };
  }
}

export function useRetainedMapRuntime<Scene extends RuntimeScene, Layers, RetainedNodes, InteractionTarget, Handlers>(
  scene: Scene | null,
  adapter: RetainedMapRuntimeAdapter<Scene, Layers, RetainedNodes, InteractionTarget, Handlers>,
  handlers: Handlers
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RetainedMapRuntime<Scene, Layers, RetainedNodes, InteractionTarget, Handlers> | null>(null);
  const handlersRef = useRef(handlers);

  handlersRef.current = handlers;

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    let cancelled = false;

    async function mountRuntime() {
      const runtime = new RetainedMapRuntime(host, adapter, handlersRef);

      await runtime.init();

      if (cancelled) {
        runtime.destroy();
        return;
      }

      runtimeRef.current = runtime;

      if (scene) {
        runtime.setScene(scene);
      }
    }

    void mountRuntime();

    return () => {
      cancelled = true;
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
    };
  }, [adapter]);

  useLayoutEffect(() => {
    if (!scene) {
      return;
    }

    runtimeRef.current?.setScene(scene);
  }, [scene]);

  return hostRef;
}
