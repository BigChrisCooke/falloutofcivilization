import { Container } from "pixi.js";

import { syncOverworldScene, createOverworldLayerContainers, type OverworldLayerContainers, type OverworldRetainedNodes } from "./overworld_layers.js";
import { resolveHoverTile, resolveInteractionTarget } from "./overworld_input.js";
import type { OverworldSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface OverworldRuntimeHandlers {
  onTravel: (x: number, y: number) => Promise<boolean>;
  onEnterLocation: (locationId: string) => void;
}

let walkGeneration = 0;
let walkLocked = false;

async function runTravel(
  destination: { x: number; y: number },
  generation: number,
  handlers: OverworldRuntimeHandlers,
  onArrive?: () => void
) {
  if (walkLocked) {
    return;
  }

  walkLocked = true;

  try {
    const arrived = await handlers.onTravel(destination.x, destination.y);

    if (walkGeneration !== generation) {
      return;
    }

    if (arrived) {
      onArrive?.();
    }
  } finally {
    if (walkGeneration === generation) {
      walkLocked = false;
    }
  }
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
  applyInteraction: (target, handlers, scene) => {
    if (walkLocked) {
      return;
    }

    if (target.kind === "tile" || target.kind === "fog") {
      const myGeneration = ++walkGeneration;
      void runTravel(target.point, myGeneration, handlers);
      return;
    }

    if (target.kind === "location") {
      const location = scene.locations.find((candidate) => candidate.id === target.locationId);

      if (!location) {
        return;
      }

      if (location.isCurrent) {
        handlers.onEnterLocation(target.locationId);
        return;
      }

      const myGeneration = ++walkGeneration;
      void runTravel(location.point, myGeneration, handlers, () => {
        handlers.onEnterLocation(target.locationId);
      });
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
