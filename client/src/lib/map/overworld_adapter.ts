import { Container } from "pixi.js";

import type { OverworldReplayStep, TravelRouteFinalPatch } from "../api.js";
import { syncOverworldScene, createOverworldLayerContainers, type OverworldLayerContainers, type OverworldRetainedNodes } from "./overworld_layers.js";
import { resolveHoverTile, resolveInteractionTarget } from "./overworld_input.js";
import { delay, STEP_DELAY_MS } from "./hex_pathfinding.js";
import type { OverworldSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface OverworldRuntimeHandlers {
  onTravelRequest: (x: number, y: number) => Promise<{ steps: OverworldReplayStep[]; finalPatch: TravelRouteFinalPatch }>;
  onTravelStep: (step: OverworldReplayStep) => void;
  onTravelComplete: (finalPatch: TravelRouteFinalPatch) => void;
  onEnterLocation: (locationId: string) => void;
}

let stepQueue: Array<OverworldReplayStep> = [];
let walkLoopRunning = false;
let apiLocked = false;
let pendingDestination: { x: number; y: number; onArrive?: () => void } | null = null;

async function travelLoop(
  destination: { x: number; y: number },
  handlers: OverworldRuntimeHandlers,
  onArrive?: () => void
) {
  walkLoopRunning = true;
  apiLocked = true;

  let response: { steps: OverworldReplayStep[]; finalPatch: TravelRouteFinalPatch };
  try {
    response = await handlers.onTravelRequest(destination.x, destination.y);
  } finally {
    apiLocked = false;
  }

  // New click arrived during API call — apply committed path state and switch to new destination
  if (pendingDestination) {
    handlers.onTravelComplete(response.finalPatch);
    const next = pendingDestination;
    pendingDestination = null;
    void travelLoop(next, handlers, next.onArrive);
    return;
  }

  stepQueue = response.steps;

  while (stepQueue.length > 0) {
    if (pendingDestination) {
      break;
    }

    const step = stepQueue.shift()!;
    handlers.onTravelStep(step);

    if (stepQueue.length > 0 && !pendingDestination) {
      await delay(STEP_DELAY_MS);
    }
  }

  handlers.onTravelComplete(response.finalPatch);

  if (pendingDestination) {
    const next = pendingDestination;
    pendingDestination = null;
    void travelLoop(next, handlers, next.onArrive);
  } else {
    onArrive?.();
    walkLoopRunning = false;
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
    if (target.kind === "tile" || target.kind === "fog") {
      if (walkLoopRunning || apiLocked) {
        pendingDestination = { x: target.point.x, y: target.point.y };
      } else {
        void travelLoop(target.point, handlers);
      }

      return;
    }

    if (target.kind === "location") {
      const location = scene.locations.find((candidate) => candidate.id === target.locationId);

      if (!location) {
        return;
      }

      if (location.isCurrent) {
        if (!walkLoopRunning && !apiLocked) {
          handlers.onEnterLocation(target.locationId);
        }

        return;
      }

      if (walkLoopRunning || apiLocked) {
        pendingDestination = {
          x: location.point.x,
          y: location.point.y,
          onArrive: () => handlers.onEnterLocation(target.locationId)
        };
        return;
      }

      void travelLoop(
        { x: location.point.x, y: location.point.y },
        handlers,
        () => handlers.onEnterLocation(target.locationId)
      );
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
