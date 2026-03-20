import { Container } from "pixi.js";

import { syncOverworldScene, createOverworldLayerContainers, type OverworldLayerContainers, type OverworldRetainedNodes } from "./overworld_layers.js";
import { resolveHoverTile, resolveInteractionTarget } from "./overworld_input.js";
import { findPath, delay, STEP_DELAY_MS, type GridPoint } from "./hex_pathfinding.js";
import type { OverworldSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface OverworldRuntimeHandlers {
  onTravel: (x: number, y: number) => Promise<void>;
  onEnterLocation: (locationId: string) => void;
}

/** Incremented each time a new walk begins; older walks check this to self-cancel. */
let walkGeneration = 0;

function buildPassableSet(scene: OverworldSceneModel): Set<string> {
  const set = new Set<string>();
  for (const tile of scene.tiles) {
    if (tile.discovered) {
      set.add(`${tile.point.x},${tile.point.y}`);
    }
  }
  return set;
}

async function walkPath(
  path: GridPoint[],
  generation: number,
  handlers: OverworldRuntimeHandlers
): Promise<boolean> {
  for (const step of path) {
    if (walkGeneration !== generation) return false;

    await handlers.onTravel(step.x, step.y);

    if (walkGeneration !== generation) return false;

    if (step !== path[path.length - 1]) {
      await delay(STEP_DELAY_MS);
    }
  }
  return true;
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
    if (target.kind === "tile") {
      const myGeneration = ++walkGeneration;
      const from: GridPoint = scene.courier.point;
      const passableSet = buildPassableSet(scene);
      const path = findPath(from, target.point, passableSet);
      if (!path || path.length === 0) return;

      void walkPath(path, myGeneration, handlers);
      return;
    }

    if (target.kind === "location") {
      // Cancel any in-progress walk, then walk to location tile and enter
      const myGeneration = ++walkGeneration;
      const from: GridPoint = scene.courier.point;
      const location = scene.locations.find((l) => l.id === target.locationId);
      if (!location) return;

      const locPoint: GridPoint = location.point;
      const fromKey = `${from.x},${from.y}`;
      const locKey = `${locPoint.x},${locPoint.y}`;

      if (fromKey === locKey) {
        // Already on the tile — enter immediately
        handlers.onEnterLocation(target.locationId);
        return;
      }

      // Walk to the location tile first, then enter
      const passableSet = buildPassableSet(scene);
      const path = findPath(from, locPoint, passableSet);
      if (!path || path.length === 0) return;

      void (async () => {
        const arrived = await walkPath(path, myGeneration, handlers);
        if (arrived && walkGeneration === myGeneration) {
          handlers.onEnterLocation(target.locationId);
        }
      })();
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
