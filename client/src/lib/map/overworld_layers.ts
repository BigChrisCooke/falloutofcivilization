import { Container, Graphics } from "pixi.js";

import { OVERWORLD_ISO_METRICS } from "../iso.js";
import { createCourierToken, createLocationMarker, createQuestMarker, drawHexSurface, TERRAIN_VISUALS } from "../scene_visuals.js";

import { flattenPolygon } from "./hex_geometry.js";
import type { OverworldLocationNode, OverworldQuestMarkerNode, OverworldSceneModel, OverworldTileNode } from "./types.js";

export interface OverworldLayerContainers {
  terrain: Container;
  fog: Container;
  feedback: Container;
  props: Container;
  actors: Container;
}

export interface OverworldRetainedNodes {
  terrainByKey: Map<string, Graphics>;
  fogByKey: Map<string, Graphics>;
  feedbackByKey: Map<string, Graphics>;
  markerById: Map<string, Container>;
  questMarkerById: Map<string, Container>;
  mist: Graphics | null;
  courier: Container | null;
}

export function createOverworldLayerContainers(): OverworldLayerContainers {
  const terrain = new Container();
  const fog = new Container();
  const feedback = new Container();
  const props = new Container();
  const actors = new Container();

  terrain.sortableChildren = true;
  fog.sortableChildren = true;
  feedback.sortableChildren = true;
  props.sortableChildren = true;
  actors.sortableChildren = true;

  return { terrain, fog, feedback, props, actors };
}

export function createOverworldRetainedNodes(): OverworldRetainedNodes {
  return {
    terrainByKey: new Map(),
    fogByKey: new Map(),
    feedbackByKey: new Map(),
    markerById: new Map(),
    questMarkerById: new Map(),
    mist: null,
    courier: null
  };
}

function syncTerrainNode(graphic: Graphics, tile: OverworldTileNode): void {
  const tileVisual = TERRAIN_VISUALS[tile.terrain] ?? TERRAIN_VISUALS.sand;

  drawHexSurface(graphic, OVERWORLD_ISO_METRICS, tileVisual, tile.discovered);
  graphic.position.set(tile.projected.x, tile.projected.y);
  graphic.zIndex = tile.zIndex;
}

function syncTerrainLayer(
  layers: OverworldLayerContainers,
  retainedNodes: OverworldRetainedNodes,
  previousScene: OverworldSceneModel | null,
  scene: OverworldSceneModel
): void {
  const previousTiles = new Map(previousScene?.tiles.map((tile) => [tile.key, tile]) ?? []);
  const nextKeys = new Set(scene.tiles.map((tile) => tile.key));

  for (const [key, graphic] of retainedNodes.terrainByKey) {
    if (nextKeys.has(key)) {
      continue;
    }

    layers.terrain.removeChild(graphic);
    graphic.destroy();
    retainedNodes.terrainByKey.delete(key);
  }

  for (const tile of scene.tiles) {
    let graphic = retainedNodes.terrainByKey.get(tile.key);

    if (!graphic) {
      graphic = new Graphics();
      retainedNodes.terrainByKey.set(tile.key, graphic);
      layers.terrain.addChild(graphic);
      syncTerrainNode(graphic, tile);
      continue;
    }

    const previousTile = previousTiles.get(tile.key);

    if (
      !previousTile ||
      previousTile.terrain !== tile.terrain ||
      previousTile.discovered !== tile.discovered ||
      previousTile.projected.x !== tile.projected.x ||
      previousTile.projected.y !== tile.projected.y
    ) {
      syncTerrainNode(graphic, tile);
    }

    graphic.position.set(tile.projected.x, tile.projected.y);
    graphic.zIndex = tile.zIndex;
  }
}

function syncFogLayer(
  layers: OverworldLayerContainers,
  retainedNodes: OverworldRetainedNodes,
  scene: OverworldSceneModel
): void {
  const nextFogKeys = new Set(scene.tiles.filter((tile) => !tile.discovered).map((tile) => tile.key));

  for (const [key, graphic] of retainedNodes.fogByKey) {
    if (nextFogKeys.has(key)) {
      continue;
    }

    layers.fog.removeChild(graphic);
    graphic.destroy();
    retainedNodes.fogByKey.delete(key);
  }

  for (const tile of scene.tiles) {
    if (tile.discovered) {
      continue;
    }

    let shroud = retainedNodes.fogByKey.get(tile.key);

    if (!shroud) {
      shroud = new Graphics();
      retainedNodes.fogByKey.set(tile.key, shroud);
      layers.fog.addChild(shroud);
    }

    shroud
      .clear()
      .poly(flattenPolygon(tile.polygon))
      .fill({ color: 0x090706, alpha: 0.18 })
      .stroke({ color: 0x211916, width: 1, alpha: 0.2 });
    shroud.zIndex = tile.zIndex + 1;
  }

  if (!retainedNodes.mist) {
    retainedNodes.mist = new Graphics();
    layers.fog.addChild(retainedNodes.mist);
  }

  retainedNodes.mist
    .clear()
    .ellipse(scene.boardSize.width * 0.5, scene.boardSize.height * 0.5, scene.boardSize.width * 0.64, scene.boardSize.height * 0.38)
    .fill({ color: 0x0a0706, alpha: 0.16 });
  retainedNodes.mist.zIndex = -1;
}

function getFeedbackState(tile: OverworldTileNode, scene: OverworldSceneModel) {
  const fillAlpha = tile.isCurrent ? 0.18 : scene.hoverTileKey === tile.key ? 0.2 : tile.isReachable ? 0.11 : 0;
  const strokeWidth = tile.isCurrent || scene.hoverTileKey === tile.key || tile.isReachable ? 2 : 0;
  const strokeAlpha = tile.isCurrent ? 0.58 : scene.hoverTileKey === tile.key ? 0.42 : 0.28;

  return {
    fillAlpha,
    strokeWidth,
    strokeAlpha
  };
}

function syncFeedbackLayer(
  layers: OverworldLayerContainers,
  retainedNodes: OverworldRetainedNodes,
  scene: OverworldSceneModel
): void {
  const activeKeys = new Set<string>();

  for (const tile of scene.tiles) {
    const feedback = getFeedbackState(tile, scene);

    if (feedback.fillAlpha === 0 && feedback.strokeWidth === 0) {
      continue;
    }

    activeKeys.add(tile.key);
    let overlay = retainedNodes.feedbackByKey.get(tile.key);

    if (!overlay) {
      overlay = new Graphics();
      retainedNodes.feedbackByKey.set(tile.key, overlay);
      layers.feedback.addChild(overlay);
    }

    overlay
      .clear()
      .poly(flattenPolygon(tile.polygon))
      .fill({
        color: tile.isCurrent ? 0xf6d18f : 0xf0bf5d,
        alpha: feedback.fillAlpha
      })
      .stroke({
        color: tile.isCurrent ? 0xfff0cf : 0xf0bf5d,
        width: feedback.strokeWidth,
        alpha: feedback.strokeAlpha
      });
    overlay.zIndex = tile.zIndex + 2;
  }

  for (const [key, overlay] of retainedNodes.feedbackByKey) {
    if (activeKeys.has(key)) {
      continue;
    }

    layers.feedback.removeChild(overlay);
    overlay.destroy();
    retainedNodes.feedbackByKey.delete(key);
  }
}

function syncMarkerNode(marker: Container, location: OverworldLocationNode): void {
  marker.position.set(location.markerPosition.x, location.markerPosition.y);
  marker.zIndex = location.zIndex;
}

function syncPropLayer(
  layers: OverworldLayerContainers,
  retainedNodes: OverworldRetainedNodes,
  previousScene: OverworldSceneModel | null,
  scene: OverworldSceneModel
): void {
  const previousLocations = new Map(previousScene?.locations.map((location) => [location.id, location]) ?? []);
  const nextIds = new Set(scene.locations.map((location) => location.id));

  for (const [id, marker] of retainedNodes.markerById) {
    if (nextIds.has(id)) {
      continue;
    }

    layers.props.removeChild(marker);
    marker.destroy({ children: true });
    retainedNodes.markerById.delete(id);
  }

  for (const location of scene.locations) {
    const previousLocation = previousLocations.get(location.id);
    let marker = retainedNodes.markerById.get(location.id);

    if (!marker || previousLocation?.type !== location.type) {
      if (marker) {
        layers.props.removeChild(marker);
        marker.destroy({ children: true });
      }

      marker = createLocationMarker(location.type);
      retainedNodes.markerById.set(location.id, marker);
      layers.props.addChild(marker);
    }

    syncMarkerNode(marker, location);
  }
}

function syncQuestMarkerLayer(
  layers: OverworldLayerContainers,
  retainedNodes: OverworldRetainedNodes,
  scene: OverworldSceneModel
): void {
  const nextIds = new Set(scene.questMarkers.map((m) => m.id));

  for (const [id, marker] of retainedNodes.questMarkerById) {
    if (nextIds.has(id)) {
      continue;
    }

    layers.props.removeChild(marker);
    marker.destroy({ children: true });
    retainedNodes.questMarkerById.delete(id);
  }

  for (const questMarker of scene.questMarkers) {
    let marker = retainedNodes.questMarkerById.get(questMarker.id);

    if (!marker) {
      marker = createQuestMarker();
      retainedNodes.questMarkerById.set(questMarker.id, marker);
      layers.props.addChild(marker);
    }

    marker.position.set(questMarker.markerPosition.x, questMarker.markerPosition.y);
    marker.zIndex = questMarker.zIndex;
  }
}

function syncActorLayer(
  layers: OverworldLayerContainers,
  retainedNodes: OverworldRetainedNodes,
  scene: OverworldSceneModel
): void {
  if (!retainedNodes.courier) {
    retainedNodes.courier = createCourierToken();
    layers.actors.addChild(retainedNodes.courier);
  }

  retainedNodes.courier.position.set(scene.courier.anchor.x, scene.courier.anchor.y);
  retainedNodes.courier.zIndex = scene.courier.zIndex;
}

export function syncOverworldScene(
  layers: OverworldLayerContainers,
  retainedNodes: OverworldRetainedNodes | null,
  previousScene: OverworldSceneModel | null,
  scene: OverworldSceneModel
): OverworldRetainedNodes {
  const nextRetainedNodes = retainedNodes ?? createOverworldRetainedNodes();

  syncTerrainLayer(layers, nextRetainedNodes, previousScene, scene);
  syncFogLayer(layers, nextRetainedNodes, scene);
  syncPropLayer(layers, nextRetainedNodes, previousScene, scene);
  syncQuestMarkerLayer(layers, nextRetainedNodes, scene);
  syncFeedbackLayer(layers, nextRetainedNodes, scene);
  syncActorLayer(layers, nextRetainedNodes, scene);

  return nextRetainedNodes;
}
