import { Container } from "pixi.js";

import { hexDistance } from "../iso.js";
import { resolveInteriorHover, resolveInteriorInteractionTarget } from "./interior_input.js";
import { syncInteriorScene, createInteriorLayerContainers, type InteriorLayerContainers, type InteriorRetainedNodes } from "./interior_layers.js";
import { delay, findNearestAdjacentTile, findPath, STEP_DELAY_MS, type GridPoint } from "./hex_pathfinding.js";
import type { InteriorSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface InteriorRuntimeHandlers {
  onStep: (x: number, y: number) => void;
  onMoveSettled: (x: number, y: number) => void;
  onExit: (exitId: string) => void;
  onNpcClick: (npcId: string) => void;
  onLootClick: (lootId: string) => void;
  onInteractableClick: (interactableId: string) => void;
  onCompanionClick: (companionId: string) => void;
  onPlayerClick: () => void;
}

const MAX_INTERACT_DISTANCE = 2;

let stepQueue: Array<{ x: number; y: number }> = [];
let visualPos: { x: number; y: number } | null = null;
let walkLoopRunning = false;
let pendingOnArrive: (() => void) | null = null;

function buildPassableSet(scene: InteriorSceneModel): Set<string> {
  const set = new Set<string>();

  for (const tile of scene.tiles) {
    if (tile.isPassable) {
      set.add(`${tile.point.x},${tile.point.y}`);
    }
  }

  return set;
}

function buildNpcBlockedSet(scene: InteriorSceneModel): Set<string> {
  const set = new Set<string>();

  for (const marker of scene.markers) {
    if (marker.kind === "npc") {
      set.add(`${marker.point.x},${marker.point.y}`);
    }
  }

  return set;
}

async function walkLoop(handlers: InteriorRuntimeHandlers) {
  walkLoopRunning = true;

  while (stepQueue.length > 0) {
    const next = stepQueue.shift()!;
    visualPos = next;
    handlers.onStep(next.x, next.y);

    if (stepQueue.length > 0) {
      await delay(STEP_DELAY_MS);
    }
  }

  if (visualPos) {
    const settled = visualPos;
    handlers.onMoveSettled(settled.x, settled.y);
    pendingOnArrive?.();
    pendingOnArrive = null;
  }

  walkLoopRunning = false;
}

function startWalk(
  destination: GridPoint,
  scene: InteriorSceneModel,
  handlers: InteriorRuntimeHandlers,
  onArrive?: () => void
) {
  const from: GridPoint = visualPos ?? scene.courier.point;
  const passableSet = buildPassableSet(scene);
  const npcBlocked = buildNpcBlockedSet(scene);
  const path = findPath(from, destination, passableSet, npcBlocked);

  if (!path) {
    return;
  }

  stepQueue = path;
  pendingOnArrive = onArrive ?? null;

  if (!walkLoopRunning) {
    void walkLoop(handlers);
  }
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
  resolveHover: (scene, worldPoint) => resolveInteriorHover(scene, worldPoint),
  resolveInteraction: (scene, worldPoint) => resolveInteriorInteractionTarget(scene, worldPoint),
  applyInteraction: (target, handlers, scene) => {
    const passableSet = buildPassableSet(scene);
    const npcBlocked = buildNpcBlockedSet(scene);

    // Reset stale walk state when the loop is idle but visualPos doesn't match the
    // authoritative player position — this means the player entered (or re-entered)
    // the map at a new spawn point and the old visualPos is no longer valid.
    if (!walkLoopRunning && visualPos &&
        (visualPos.x !== scene.courier.point.x || visualPos.y !== scene.courier.point.y)) {
      visualPos = null;
      stepQueue = [];
      pendingOnArrive = null;
    }

    const from: GridPoint = visualPos ?? scene.courier.point;

    if (target.kind === "tile") {
      const path = findPath(from, target.point, passableSet, npcBlocked);

      if (!path) {
        return;
      }

      stepQueue = path;
      pendingOnArrive = null;

      if (!walkLoopRunning) {
        void walkLoop(handlers);
      }

      return;
    }

    if (target.kind === "exit") {
      const [x = 0, y = 0] = target.tileKey.split(",").map(Number);
      const distance = hexDistance(from, { x, y });

      if (distance <= MAX_INTERACT_DISTANCE) {
        handlers.onExit(target.exitId);
      }

      return;
    }

    if (target.kind === "npc") {
      const marker = scene.markers.find((candidate) => candidate.kind === "npc" && candidate.id === target.npcId);

      if (!marker) {
        return;
      }

      const npcRange = marker.interactRange ?? MAX_INTERACT_DISTANCE;

      if (hexDistance(from, marker.point) <= npcRange) {
        handlers.onNpcClick(target.npcId);
        return;
      }

      const adjacentTile = findNearestAdjacentTile(from, marker.point, passableSet, npcBlocked);

      if (!adjacentTile) {
        return;
      }

      startWalk(adjacentTile, scene, handlers, () => {
        handlers.onNpcClick(target.npcId);
      });

      return;
    }

    if (target.kind === "loot") {
      const marker = scene.markers.find((candidate) => candidate.kind === "loot" && candidate.id === target.lootId);

      if (!marker) {
        return;
      }

      if (hexDistance(from, marker.point) <= MAX_INTERACT_DISTANCE) {
        handlers.onLootClick(target.lootId);
        return;
      }

      const adjacentTile = findNearestAdjacentTile(from, marker.point, passableSet, npcBlocked);

      if (!adjacentTile) {
        return;
      }

      startWalk(adjacentTile, scene, handlers, () => {
        handlers.onLootClick(target.lootId);
      });

      return;
    }

    if (target.kind === "interactable") {
      const marker = scene.markers.find((candidate) => candidate.kind === "interactable" && candidate.id === target.interactableId);

      if (!marker) {
        return;
      }

      if (hexDistance(from, marker.point) <= MAX_INTERACT_DISTANCE) {
        handlers.onInteractableClick(target.interactableId);
        return;
      }

      const adjacentTile = findNearestAdjacentTile(from, marker.point, passableSet, npcBlocked);

      if (!adjacentTile) {
        return;
      }

      startWalk(adjacentTile, scene, handlers, () => {
        handlers.onInteractableClick(target.interactableId);
      });

      return;
    }

    if (target.kind === "companion") {
      handlers.onCompanionClick(target.companionId);
      return;
    }

    if (target.kind === "player") {
      handlers.onPlayerClick();
    }
  },
  animate: (_retainedNodes, _scene, _tick) => {
    // AnimatedSprite handles idle frame animation internally; no manual position bobbing needed.
  },
  getCameraAnchor: (scene) => scene.courier.anchor
};
