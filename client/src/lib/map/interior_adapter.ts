import { Container } from "pixi.js";

import { resolveInteriorHoverTile, resolveInteriorInteractionTarget } from "./interior_input.js";
import { syncInteriorScene, createInteriorLayerContainers, type InteriorLayerContainers, type InteriorRetainedNodes } from "./interior_layers.js";
import type { InteriorSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface InteriorRuntimeHandlers {
  onMove: (x: number, y: number) => void;
  onExit: (exitId: string) => void;
}

export const interiorRuntimeAdapter: RetainedMapRuntimeAdapter<
  InteriorSceneModel,
  InteriorLayerContainers,
  InteriorRetainedNodes,
  ReturnType<typeof resolveInteriorInteractionTarget>,
  InteriorRuntimeHandlers
> = {
  createLayers: () => createInteriorLayerContainers(),
  attachLayers: (world: Container, layers) => {
    world.addChild(layers.terrain, layers.feedback, layers.props, layers.actors);
  },
  syncScene: (layers, retainedNodes, previousScene, nextScene) =>
    syncInteriorScene(layers, retainedNodes, previousScene, nextScene),
  resolveHover: (scene, worldPoint) => resolveInteriorHoverTile(scene, worldPoint),
  resolveInteraction: (scene, worldPoint) => resolveInteriorInteractionTarget(scene, worldPoint),
  applyInteraction: (target, handlers) => {
    if (target.kind === "tile") {
      handlers.onMove(target.point.x, target.point.y);
      return;
    }

    if (target.kind === "exit") {
      handlers.onExit(target.exitId);
    }
  },
  animate: (retainedNodes, scene, tick) => {
    if (!retainedNodes.courier) {
      return;
    }

    retainedNodes.courier.y = scene.courier.anchor.y + Math.sin(tick) * 3;
  },
  getCameraAnchor: (scene) => scene.courier.anchor
};
