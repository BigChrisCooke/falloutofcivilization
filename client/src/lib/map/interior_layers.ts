import { Container, Graphics } from "pixi.js";

import { INTERIOR_ISO_METRICS } from "../iso.js";
import { createCourierToken, createSceneMarker, drawHexSurface, INTERIOR_SURFACE_VISUALS } from "../scene_visuals.js";

import { flattenPolygon } from "./hex_geometry.js";
import type { InteriorSceneModel } from "./types.js";

export interface InteriorLayerContainers {
  terrain: Container;
  feedback: Container;
  props: Container;
  actors: Container;
}

function clearLayer(container: Container): void {
  container.removeChildren().forEach((child) => child.destroy());
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

export function renderInteriorTerrainLayer(container: Container, scene: InteriorSceneModel): void {
  clearLayer(container);

  for (const tile of scene.tiles) {
    const graphic = new Graphics();
    const tileVisual = INTERIOR_SURFACE_VISUALS[tile.terrain] ?? INTERIOR_SURFACE_VISUALS.floor;

    drawHexSurface(graphic, INTERIOR_ISO_METRICS, tileVisual, true);
    graphic.position.set(tile.projected.x, tile.projected.y);
    graphic.zIndex = tile.zIndex;
    container.addChild(graphic);
  }

  const glow = new Graphics()
    .ellipse(scene.boardSize.width * 0.45, scene.boardSize.height * 0.62, scene.boardSize.width * 0.38, scene.boardSize.height * 0.16)
    .fill({ color: 0x221612, alpha: 0.12 });

  glow.zIndex = -1;
  container.addChild(glow);
}

export function renderInteriorFeedbackLayer(container: Container, scene: InteriorSceneModel): void {
  clearLayer(container);

  for (const tile of scene.tiles) {
    const fillAlpha = tile.isCurrent ? 0.18 : scene.hoverTileKey === tile.key ? 0.18 : tile.isReachable ? 0.1 : 0;
    const strokeWidth = tile.isCurrent || scene.hoverTileKey === tile.key || tile.isReachable ? 2 : 0;

    if (fillAlpha === 0 && strokeWidth === 0) {
      continue;
    }

    const color = tile.isCurrent && tile.exitId ? 0xf1c768 : tile.isCurrent ? 0xc9f3ff : 0xf1c768;
    const overlay = new Graphics()
      .poly(flattenPolygon(tile.polygon))
      .fill({ color, alpha: fillAlpha })
      .stroke({
        color: tile.isCurrent && tile.exitId ? 0xfff0c6 : 0xf7f2eb,
        width: strokeWidth,
        alpha: tile.isCurrent ? 0.56 : 0.34
      });

    overlay.zIndex = tile.zIndex + 2;
    container.addChild(overlay);
  }
}

export function renderInteriorPropLayer(container: Container, scene: InteriorSceneModel): void {
  clearLayer(container);

  for (const marker of scene.markers) {
    const colors = getMarkerColors(marker.kind);
    const badge = createSceneMarker(colors.fillColor, colors.accentColor);

    badge.position.set(marker.markerPosition.x, marker.markerPosition.y);
    badge.zIndex = marker.zIndex;
    container.addChild(badge);
  }
}

export function renderInteriorActorLayer(container: Container, scene: InteriorSceneModel): Container {
  clearLayer(container);

  const courier = createCourierToken();

  courier.position.set(scene.courier.anchor.x, scene.courier.anchor.y);
  courier.zIndex = scene.courier.zIndex;
  container.addChild(courier);

  return courier;
}

export function renderInteriorStaticLayers(
  layers: InteriorLayerContainers,
  scene: InteriorSceneModel
): { courier: Container } {
  renderInteriorTerrainLayer(layers.terrain, scene);
  renderInteriorPropLayer(layers.props, scene);

  return {
    courier: renderInteriorActorLayer(layers.actors, scene)
  };
}
