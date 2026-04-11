import { AnimatedSprite, Container, Graphics, Sprite, Text } from "pixi.js";

import { INTERIOR_ISO_METRICS } from "../iso.js";
import { createCompanionToken, createCourierSprite, createCourierToken, createInteriorTileSprite, createNpcSprite, createSceneMarker, drawHexSurface, hasInteriorTileImage, INTERIOR_SURFACE_VISUALS, setActorAnimation } from "../scene_visuals.js";

import { flattenPolygon } from "./hex_geometry.js";
import type { InteriorMarkerNode, InteriorSceneModel, InteriorTileNode } from "./types.js";

export interface InteriorLayerContainers {
  terrain: Container;
  feedback: Container;
  props: Container;
  actors: Container;
}

export interface InteriorRetainedNodes {
  terrainByKey: Map<string, Graphics | Sprite>;
  feedbackByKey: Map<string, Graphics>;
  markerById: Map<string, Container | AnimatedSprite>;
  glow: Graphics | null;
  courier: AnimatedSprite | Container | null;
  companionTokens: Map<string, AnimatedSprite | Container>;
  lootTooltip: Container | null;
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
    courier: null,
    companionTokens: new Map(),
    lootTooltip: null
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
    const useImage = hasInteriorTileImage(tile.terrain);
    let existing = retainedNodes.terrainByKey.get(tile.key);
    const previousTile = previousTiles.get(tile.key);

    // If the node type changed (sprite ↔ graphics), destroy and recreate
    const wasSprite = existing instanceof Sprite;
    if (existing && wasSprite !== useImage) {
      layers.terrain.removeChild(existing);
      existing.destroy();
      retainedNodes.terrainByKey.delete(tile.key);
      existing = undefined;
    }

    if (useImage) {
      if (!existing) {
        const sprite = createInteriorTileSprite(tile.terrain, tile.key, INTERIOR_ISO_METRICS);
        sprite.position.set(tile.projected.x, tile.projected.y);
        sprite.zIndex = tile.zIndex;
        retainedNodes.terrainByKey.set(tile.key, sprite);
        layers.terrain.addChild(sprite);
      } else {
        existing.position.set(tile.projected.x, tile.projected.y);
        existing.zIndex = tile.zIndex;
      }
    } else {
      if (!existing) {
        const graphic = new Graphics();
        retainedNodes.terrainByKey.set(tile.key, graphic);
        layers.terrain.addChild(graphic);
        syncTerrainNode(graphic, tile);
      } else if (
        existing instanceof Graphics && (
          !previousTile ||
          previousTile.terrain !== tile.terrain ||
          previousTile.projected.x !== tile.projected.x ||
          previousTile.projected.y !== tile.projected.y
        )
      ) {
        syncTerrainNode(existing, tile);
      } else {
        existing.position.set(tile.projected.x, tile.projected.y);
        existing.zIndex = tile.zIndex;
      }
    }
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

  if (sceneMarker.kind === "npc") {
    if (sceneMarker.dead) {
      marker.rotation = Math.PI / 2;
      marker.alpha = 0.7;
    } else {
      marker.rotation = 0;
      marker.alpha = 1;
      if (marker instanceof AnimatedSprite && sceneMarker.animState && sceneMarker.facing) {
        setActorAnimation(marker, sceneMarker.animState, sceneMarker.facing);
      }
    }
  }
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

      if (sceneMarker.kind === "npc") {
        marker = createNpcSprite() ?? createCourierToken();
        marker.scale.set(0.72);
      } else {
        const colors = getMarkerColors(sceneMarker.kind);
        marker = createSceneMarker(colors.fillColor, colors.accentColor);
      }

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
    retainedNodes.courier = createCourierSprite() ?? createCourierToken();
    layers.actors.addChild(retainedNodes.courier);
  }

  retainedNodes.courier.position.set(scene.courier.anchor.x, scene.courier.anchor.y);
  retainedNodes.courier.zIndex = scene.courier.zIndex;
  if (retainedNodes.courier instanceof AnimatedSprite) {
    setActorAnimation(retainedNodes.courier, scene.courier.animState, scene.courier.facing);
  }

  // Companion tokens — sync all active companions
  const activeCompanionIds = new Set(scene.companions.map((c) => c.companionId));
  for (const [id, token] of retainedNodes.companionTokens) {
    if (!activeCompanionIds.has(id)) {
      layers.actors.removeChild(token);
      token.destroy({ children: true });
      retainedNodes.companionTokens.delete(id);
    }
  }
  for (const companion of scene.companions) {
    if (!retainedNodes.companionTokens.has(companion.companionId)) {
      const token = createNpcSprite() ?? createCompanionToken(companion.tokenColor);
      retainedNodes.companionTokens.set(companion.companionId, token);
      layers.actors.addChild(token);
    }
    const token = retainedNodes.companionTokens.get(companion.companionId)!;
    token.position.set(companion.anchor.x, companion.anchor.y);
    token.zIndex = companion.zIndex;
    if (token instanceof AnimatedSprite) {
      setActorAnimation(token, companion.animState, companion.facing);
    }
  }
}

function syncTooltipLayer(
  layers: InteriorLayerContainers,
  retainedNodes: InteriorRetainedNodes,
  scene: InteriorSceneModel
): void {
  const hoveredMarker = scene.hoveredMarkerId
    ? scene.markers.find((m) => m.id === scene.hoveredMarkerId && m.kind === "loot")
    : null;

  if (!hoveredMarker) {
    if (retainedNodes.lootTooltip) {
      layers.props.removeChild(retainedNodes.lootTooltip);
      retainedNodes.lootTooltip.destroy({ children: true });
      retainedNodes.lootTooltip = null;
    }
    return;
  }

  const isSteal = !!hoveredMarker.ownedBy;
  const labelText = isSteal ? "Steal" : "Take";
  const textColor = isSteal ? 0xe05555 : 0xf7bf67;

  if (!retainedNodes.lootTooltip) {
    retainedNodes.lootTooltip = new Container();
    layers.props.addChild(retainedNodes.lootTooltip);
  }

  // Rebuild tooltip contents
  retainedNodes.lootTooltip.removeChildren();

  const bg = new Graphics()
    .roundRect(-28, -12, 56, 24, 5)
    .fill({ color: 0x000000, alpha: 0.85 });

  const label = new Text({
    text: labelText,
    style: { fill: textColor, fontSize: 13, fontWeight: "bold", fontFamily: "inherit" }
  });
  label.anchor.set(0.5, 0.5);

  retainedNodes.lootTooltip.addChild(bg, label);
  retainedNodes.lootTooltip.position.set(hoveredMarker.markerPosition.x, hoveredMarker.markerPosition.y - 26);
  retainedNodes.lootTooltip.zIndex = hoveredMarker.zIndex + 50;
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
  syncTooltipLayer(layers, nextRetainedNodes, scene);

  return nextRetainedNodes;
}
