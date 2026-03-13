import { Container } from "pixi.js";

import { syncOverworldScene, createOverworldLayerContainers, type OverworldLayerContainers, type OverworldRetainedNodes } from "./overworld_layers.js";
import { resolveHoverTile, resolveInteractionTarget } from "./overworld_input.js";
import type { OverworldSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface OverworldRuntimeHandlers {
  onTravel: (x: number, y: number) => void;
  onEnterLocation: (locationId: string) => void;
}

export const overworldRuntimeAdapter: RetainedMapRuntimeAdapter<
  OverworldSceneModel,
  OverworldLayerContainers,
  OverworldRetainedNodes,
  ReturnType<typeof resolveInteractionTarget>,
  OverworldRuntimeHandlers
> = {
  createLayers: () => createOverworldLayerContainers(),
  attachLayers: (world: Container, layers) => {
    world.addChild(layers.terrain, layers.fog, layers.feedback, layers.props, layers.actors);
  },
  syncScene: (layers, retainedNodes, previousScene, nextScene) =>
    syncOverworldScene(layers, retainedNodes, previousScene, nextScene),
  resolveHover: (scene, worldPoint) => resolveHoverTile(scene, worldPoint),
  resolveInteraction: (scene, worldPoint) => resolveInteractionTarget(scene, worldPoint),
  applyInteraction: (target, handlers) => {
    if (target.kind === "tile") {
      handlers.onTravel(target.point.x, target.point.y);
      return;
    }

    if (target.kind === "location") {
      handlers.onEnterLocation(target.locationId);
    }
  },
  animate: (retainedNodes, scene, tick) => {
    if (!retainedNodes.courier) {
      return;
    }

    retainedNodes.courier.y = scene.courier.anchor.y + Math.sin(tick) * 4;
  },
  getCameraAnchor: (scene) => scene.courier.anchor
};
