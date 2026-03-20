import { Container } from "pixi.js";

import { hexDistance } from "../iso.js";
import { resolveInteriorHover, resolveInteriorInteractionTarget } from "./interior_input.js";
import { syncInteriorScene, createInteriorLayerContainers, type InteriorLayerContainers, type InteriorRetainedNodes } from "./interior_layers.js";
import { findPath, findNearestAdjacentTile, delay, STEP_DELAY_MS, type GridPoint } from "./hex_pathfinding.js";
import type { InteriorSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface InteriorRuntimeHandlers {
  onMove: (x: number, y: number) => Promise<void>;
  onExit: (exitId: string) => void;
  onNpcClick: (npcId: string) => void;
  onLootClick: (lootId: string) => void;
  onInteractableClick: (interactableId: string) => void;
  onPlayerClick: () => void;
}

const MAX_INTERACT_DISTANCE = 2;

/** Incremented each time a new walk begins; older walks check this to self-cancel. */
let walkGeneration = 0;

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

async function walkPath(
  path: GridPoint[],
  generation: number,
  handlers: InteriorRuntimeHandlers
): Promise<boolean> {
  for (const step of path) {
    if (walkGeneration !== generation) return false;

    await handlers.onMove(step.x, step.y);

    if (walkGeneration !== generation) return false;

    if (step !== path[path.length - 1]) {
      await delay(STEP_DELAY_MS);
    }
  }
  return true;
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
    const from: GridPoint = scene.courier.point;
    const passableSet = buildPassableSet(scene);
    const npcBlocked = buildNpcBlockedSet(scene);

    if (target.kind === "tile") {
      const myGeneration = ++walkGeneration;
      const path = findPath(from, target.point, passableSet, npcBlocked);
      if (!path || path.length === 0) return;

      void walkPath(path, myGeneration, handlers);
      return;
    }

    // Any non-tile interaction cancels walking
    walkGeneration++;

    if (target.kind === "exit") {
      const dist = hexDistance(from, { x: Number(target.tileKey.split(",")[0]), y: Number(target.tileKey.split(",")[1]) });
      if (dist <= MAX_INTERACT_DISTANCE) {
        handlers.onExit(target.exitId);
      }
      return;
    }

    if (target.kind === "npc") {
      const marker = scene.markers.find((m) => m.kind === "npc" && m.id === target.npcId);
      if (!marker) return;

      const dist = hexDistance(from, marker.point);
      if (dist <= MAX_INTERACT_DISTANCE) {
        // Already close enough — open dialogue
        handlers.onNpcClick(target.npcId);
        return;
      }

      // Walk to nearest tile adjacent to NPC, then interact
      const myGeneration = ++walkGeneration;
      const adj = findNearestAdjacentTile(from, marker.point, passableSet, npcBlocked);
      if (!adj) return;

      const path = findPath(from, adj, passableSet, npcBlocked);
      if (!path || path.length === 0) return;

      void (async () => {
        const arrived = await walkPath(path, myGeneration, handlers);
        if (arrived && walkGeneration === myGeneration) {
          handlers.onNpcClick(target.npcId);
        }
      })();
      return;
    }

    if (target.kind === "loot") {
      const marker = scene.markers.find((m) => m.kind === "loot" && m.id === target.lootId);
      if (!marker) return;

      const dist = hexDistance(from, marker.point);
      if (dist <= MAX_INTERACT_DISTANCE) {
        handlers.onLootClick(target.lootId);
        return;
      }

      // Walk to nearest adjacent tile, then interact
      const myGeneration = ++walkGeneration;
      const adj = findNearestAdjacentTile(from, marker.point, passableSet, npcBlocked);
      if (!adj) return;

      const path = findPath(from, adj, passableSet, npcBlocked);
      if (!path || path.length === 0) return;

      void (async () => {
        const arrived = await walkPath(path, myGeneration, handlers);
        if (arrived && walkGeneration === myGeneration) {
          handlers.onLootClick(target.lootId);
        }
      })();
      return;
    }

    if (target.kind === "interactable") {
      const marker = scene.markers.find((m) => m.kind === "interactable" && m.id === target.interactableId);
      if (!marker) return;

      const dist = hexDistance(from, marker.point);
      if (dist <= MAX_INTERACT_DISTANCE) {
        handlers.onInteractableClick(target.interactableId);
        return;
      }

      // Walk to nearest adjacent tile, then interact
      const myGeneration = ++walkGeneration;
      const adj = findNearestAdjacentTile(from, marker.point, passableSet, npcBlocked);
      if (!adj) return;

      const path = findPath(from, adj, passableSet, npcBlocked);
      if (!path || path.length === 0) return;

      void (async () => {
        const arrived = await walkPath(path, myGeneration, handlers);
        if (arrived && walkGeneration === myGeneration) {
          handlers.onInteractableClick(target.interactableId);
        }
      })();
      return;
    }

    if (target.kind === "player") {
      handlers.onPlayerClick();
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
