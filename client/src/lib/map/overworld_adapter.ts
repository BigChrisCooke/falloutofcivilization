import { Container } from "pixi.js";

import { syncOverworldScene, createOverworldLayerContainers, type OverworldLayerContainers, type OverworldRetainedNodes } from "./overworld_layers.js";
import { resolveHoverTile, resolveInteractionTarget } from "./overworld_input.js";
import { bestStepToward, findPath, delay, STEP_DELAY_MS, type GridPoint } from "./hex_pathfinding.js";
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

/** All valid tile coordinates on the map (discovered or not). */
function buildAllTilesSet(scene: OverworldSceneModel): Set<string> {
  const set = new Set<string>();
  for (const tile of scene.tiles) {
    set.add(`${tile.point.x},${tile.point.y}`);
  }
  return set;
}

/**
 * Find the discovered tile closest to the target that the player can reach.
 * This is the "frontier" — the edge of known territory nearest to where we want to go.
 */
function findFrontierTile(from: GridPoint, target: GridPoint, passableSet: Set<string>): GridPoint | null {
  let best: GridPoint | null = null;
  let bestPathLen = Infinity;
  let bestTargetDist = Infinity;

  for (const key of passableSet) {
    const [px, py] = key.split(",").map(Number);
    const point = { x: px, y: py };

    // Prefer discovered tiles that are close to the target
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    const targetDist = Math.abs(dx) + Math.abs(dy); // rough distance

    // Skip tiles that aren't closer to target than what we've found
    if (targetDist > bestTargetDist) continue;

    const path = findPath(from, point, passableSet);
    if (!path) continue;

    if (targetDist < bestTargetDist || (targetDist === bestTargetDist && path.length < bestPathLen)) {
      bestTargetDist = targetDist;
      bestPathLen = path.length;
      best = point;
    }
  }

  return best;
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

    if (target.kind === "fog") {
      const myGeneration = ++walkGeneration;
      const from: GridPoint = scene.courier.point;
      const passableSet = buildPassableSet(scene);
      const allTiles = buildAllTilesSet(scene);
      const targetPoint = target.point;

      // Phase 1: walk to the frontier (closest discovered tile to target)
      const frontier = findFrontierTile(from, targetPoint, passableSet);
      if (!frontier) return;

      const pathToFrontier = findPath(from, frontier, passableSet);

      void (async () => {
        // Walk the discovered path to the frontier
        if (pathToFrontier && pathToFrontier.length > 0) {
          const arrived = await walkPath(pathToFrontier, myGeneration, handlers);
          if (!arrived || walkGeneration !== myGeneration) return;
        }

        // Phase 2: step-by-step into the fog toward the target
        let current = frontier;
        const maxFogSteps = 20; // safety limit
        for (let step = 0; step < maxFogSteps; step++) {
          if (walkGeneration !== myGeneration) return;
          if (current.x === targetPoint.x && current.y === targetPoint.y) return;

          const next = bestStepToward(current, targetPoint, allTiles);
          if (!next) return;
          // Don't step backward onto current position
          if (next.x === current.x && next.y === current.y) return;

          await delay(STEP_DELAY_MS);
          if (walkGeneration !== myGeneration) return;

          try {
            await handlers.onTravel(next.x, next.y);
          } catch {
            return; // backend rejected the move (e.g. out of bounds)
          }

          current = next;
        }
      })();

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
