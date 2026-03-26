import { Container } from "pixi.js";

import { hexDistance } from "../iso.js";
import { resolveInteriorHover, resolveInteriorInteractionTarget } from "./interior_input.js";
import { syncInteriorScene, createInteriorLayerContainers, type InteriorLayerContainers, type InteriorRetainedNodes } from "./interior_layers.js";
import { findNearestAdjacentTile, findPath, type GridPoint } from "./hex_pathfinding.js";
import type { InteriorSceneModel } from "./types.js";
import type { RetainedMapRuntimeAdapter } from "./map_runtime.js";

export interface InteriorRuntimeHandlers {
  onMove: (x: number, y: number) => Promise<boolean>;
  onExit: (exitId: string) => void;
  onNpcClick: (npcId: string) => void;
  onLootClick: (lootId: string) => void;
  onInteractableClick: (interactableId: string) => void;
  onCompanionClick: (companionId: string) => void;
  onPlayerClick: () => void;
}

const MAX_INTERACT_DISTANCE = 2;

let walkGeneration = 0;
let walkLocked = false;

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

async function runMove(
  destination: GridPoint,
  generation: number,
  handlers: InteriorRuntimeHandlers,
  onArrive?: () => void
) {
  if (walkLocked) {
    return;
  }

  walkLocked = true;

  try {
    const arrived = await handlers.onMove(destination.x, destination.y);

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
    if (walkLocked) {
      return;
    }

    const from: GridPoint = scene.courier.point;
    const passableSet = buildPassableSet(scene);
    const npcBlocked = buildNpcBlockedSet(scene);

    if (target.kind === "tile") {
      const path = findPath(from, target.point, passableSet, npcBlocked);

      if (!path) {
        return;
      }

      const myGeneration = ++walkGeneration;
      void runMove(target.point, myGeneration, handlers);
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

      if (hexDistance(from, marker.point) <= MAX_INTERACT_DISTANCE) {
        handlers.onNpcClick(target.npcId);
        return;
      }

      const adjacentTile = findNearestAdjacentTile(from, marker.point, passableSet, npcBlocked);

      if (!adjacentTile) {
        return;
      }

      const path = findPath(from, adjacentTile, passableSet, npcBlocked);

      if (!path) {
        return;
      }

      const myGeneration = ++walkGeneration;
      void runMove(adjacentTile, myGeneration, handlers, () => {
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

      const path = findPath(from, adjacentTile, passableSet, npcBlocked);

      if (!path) {
        return;
      }

      const myGeneration = ++walkGeneration;
      void runMove(adjacentTile, myGeneration, handlers, () => {
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

      const path = findPath(from, adjacentTile, passableSet, npcBlocked);

      if (!path) {
        return;
      }

      const myGeneration = ++walkGeneration;
      void runMove(adjacentTile, myGeneration, handlers, () => {
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
  animate: (retainedNodes, scene, tick) => {
    if (!retainedNodes.courier) {
      return;
    }

    retainedNodes.courier.y = scene.courier.anchor.y + Math.sin(tick) * 3;
  },
  getCameraAnchor: (scene) => scene.courier.anchor
};
