import { Container, Graphics } from "pixi.js";

import { INTERIOR_ISO_METRICS } from "../iso.js";
import { createCourierToken, createSceneMarker, drawHexSurface, INTERIOR_SURFACE_VISUALS } from "../scene_visuals.js";

import { flattenPolygon } from "./hex_geometry.js";
import type { InteriorMarkerNode, InteriorSceneModel, InteriorTileNode } from "./types.js";

export interface InteriorLayerContainers {
  terrain: Container;
  feedback: Container;
  props: Container;
  actors: Container;
}

export interface InteriorRetainedNodes {
  terrainByKey: Map<string, Graphics>;
  feedbackByKey: Map<string, Graphics>;
  markerById: Map<string, Container>;
  glow: Graphics | null;
  courier: Container | null;
}

function getMarkerColors(kind: string): { fillColor: number; accentColor: number } {
  switch (kind) {
    case "exit":
      return { fillColor: 0xf1c768, accentColor: 0x3c250f };
    case "interactable":
      return { fillColor: 0x79c3cb, accentColor: 0x19363d };
    case "npc":
      return { fillColor: 0xe2a57f, accentColor: 0x392117 };
    case "loot":
      return { fillColor: 0xcbd8ff, accentColor: 0x202739 };
    default:
      return { fillColor: 0xe7d3bc, accentColor: 0x2b1e16 };
  }
}

export function createInteriorLayerContainers(): InteriorLayerContainers {
  const terrain = new Container();
  const feedback = new Container();
  const props = new Container();
  const actors = new Container();

  terrain.sortableChildren = true;
  feedback.sortableChildren = true;
  props.sortableChildren = true;
  actors.sortableChildren = true;

  return { terrain, feedback, props, actors };
}

export function createInteriorRetainedNodes(): InteriorRetainedNodes {
  return {
    terrainByKey: new Map(),
    feedbackByKey: new Map(),
    markerById: new Map(),
    glow: null,
    courier: null
  };
}

function syncTerrainNode(graphic: Graphics, tile: InteriorTileNode): void {
  const tileVisual = INTERIOR_SURFACE_VISUALS[tile.terrain] ?? INTERIOR_SURFACE_VISUALS.floor;

  drawHexSurface(graphic, INTERIOR_ISO_METRICS, tileVisual, true);
  graphic.position.set(tile.projected.x, tile.projected.y);
  graphic.zIndex = tile.zIndex;
}

function syncTerrainLayer(
  layers: InteriorLayerContainers,
  retainedNodes: InteriorRetainedNodes,
  previousScene: InteriorSceneModel | null,
  scene: InteriorSceneModel
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
      previousTile.projected.x !== tile.projected.x ||
      previousTile.projected.y !== tile.projected.y
    ) {
      syncTerrainNode(graphic, tile);
    }

    graphic.position.set(tile.projected.x, tile.projected.y);
    graphic.zIndex = tile.zIndex;
  }

  if (!retainedNodes.glow) {
    retainedNodes.glow = new Graphics();
    layers.terrain.addChild(retainedNodes.glow);
  }

  retainedNodes.glow
    .clear()
    .ellipse(scene.boardSize.width * 0.45, scene.boardSize.height * 0.62, scene.boardSize.width * 0.38, scene.boardSize.height * 0.16)
    .fill({ color: 0x221612, alpha: 0.12 });
  retainedNodes.glow.zIndex = -1;
}

function syncFeedbackLayer(
  layers: InteriorLayerContainers,
  retainedNodes: InteriorRetainedNodes,
  scene: InteriorSceneModel
): void {
  const activeKeys = new Set<string>();

  for (const tile of scene.tiles) {
    const fillAlpha = tile.isCurrent ? 0.18 : scene.hoverTileKey === tile.key ? 0.18 : tile.isReachable ? 0.1 : 0;
    const strokeWidth = tile.isCurrent || scene.hoverTileKey === tile.key || tile.isReachable ? 2 : 0;

    if (fillAlpha === 0 && strokeWidth === 0) {
      continue;
    }

    activeKeys.add(tile.key);
    let overlay = retainedNodes.feedbackByKey.get(tile.key);

    if (!overlay) {
      overlay = new Graphics();
      retainedNodes.feedbackByKey.set(tile.key, overlay);
      layers.feedback.addChild(overlay);
    }

    const color = tile.isCurrent && tile.exitId ? 0xf1c768 : tile.isCurrent ? 0xc9f3ff : 0xf1c768;

    overlay
      .clear()
      .poly(flattenPolygon(tile.polygon))
      .fill({ color, alpha: fillAlpha })
      .stroke({
        color: tile.isCurrent && tile.exitId ? 0xfff0c6 : 0xf7f2eb,
        width: strokeWidth,
        alpha: tile.isCurrent ? 0.56 : 0.34
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

function syncMarkerNode(marker: Container, sceneMarker: InteriorMarkerNode): void {
  marker.position.set(sceneMarker.markerPosition.x, sceneMarker.markerPosition.y);
  marker.zIndex = sceneMarker.zIndex;
}

function syncPropLayer(
  layers: InteriorLayerContainers,
  retainedNodes: InteriorRetainedNodes,
  previousScene: InteriorSceneModel | null,
  scene: InteriorSceneModel
): void {
  const previousMarkers = new Map(previousScene?.markers.map((marker) => [marker.id, marker]) ?? []);
  const nextIds = new Set(scene.markers.map((marker) => marker.id));

  for (const [id, marker] of retainedNodes.markerById) {
    if (nextIds.has(id)) {
      continue;
    }

    layers.props.removeChild(marker);
    marker.destroy({ children: true });
    retainedNodes.markerById.delete(id);
  }

  for (const sceneMarker of scene.markers) {
    const previousMarker = previousMarkers.get(sceneMarker.id);
    let marker = retainedNodes.markerById.get(sceneMarker.id);

    if (!marker || previousMarker?.kind !== sceneMarker.kind) {
      if (marker) {
        layers.props.removeChild(marker);
        marker.destroy({ children: true });
      }

      const colors = getMarkerColors(sceneMarker.kind);

      marker = createSceneMarker(colors.fillColor, colors.accentColor);
      retainedNodes.markerById.set(sceneMarker.id, marker);
      layers.props.addChild(marker);
    }

    syncMarkerNode(marker, sceneMarker);
  }
}

function syncActorLayer(
  layers: InteriorLayerContainers,
  retainedNodes: InteriorRetainedNodes,
  scene: InteriorSceneModel
): void {
  if (!retainedNodes.courier) {
    retainedNodes.courier = createCourierToken();
    layers.actors.addChild(retainedNodes.courier);
  }

  retainedNodes.courier.position.set(scene.courier.anchor.x, scene.courier.anchor.y);
  retainedNodes.courier.zIndex = scene.courier.zIndex;
}

export function syncInteriorScene(
  layers: InteriorLayerContainers,
  retainedNodes: InteriorRetainedNodes | null,
  previousScene: InteriorSceneModel | null,
  scene: InteriorSceneModel
): InteriorRetainedNodes {
  const nextRetainedNodes = retainedNodes ?? createInteriorRetainedNodes();

  syncTerrainLayer(layers, nextRetainedNodes, previousScene, scene);
  syncPropLayer(layers, nextRetainedNodes, previousScene, scene);
  syncFeedbackLayer(layers, nextRetainedNodes, scene);
  syncActorLayer(layers, nextRetainedNodes, scene);

  return nextRetainedNodes;
}
