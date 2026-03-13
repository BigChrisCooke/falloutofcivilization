import { Container, Graphics } from "pixi.js";

import { OVERWORLD_ISO_METRICS } from "../iso.js";
import { createCourierToken, createLocationMarker, drawHexSurface, TERRAIN_VISUALS } from "../scene_visuals.js";

import { flattenPolygon, getHexLocalPolygon } from "./hex_geometry.js";
import type { OverworldSceneModel } from "./types.js";

export interface OverworldLayerContainers {
  terrain: Container;
  fog: Container;
  feedback: Container;
  props: Container;
  actors: Container;
}

function clearLayer(container: Container): void {
  container.removeChildren().forEach((child) => child.destroy());
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

export function renderTerrainLayer(container: Container, scene: OverworldSceneModel): void {
  clearLayer(container);

  for (const tile of scene.tiles) {
    const graphic = new Graphics();
    const tileVisual = TERRAIN_VISUALS[tile.terrain] ?? TERRAIN_VISUALS.sand;

    drawHexSurface(graphic, OVERWORLD_ISO_METRICS, tileVisual, tile.discovered);
    graphic.position.set(tile.projected.x, tile.projected.y);
    graphic.zIndex = tile.zIndex;
    container.addChild(graphic);
  }
}

export function renderFogLayer(container: Container, scene: OverworldSceneModel): void {
  clearLayer(container);

  for (const tile of scene.tiles) {
    if (tile.discovered) {
      continue;
    }

    const shroud = new Graphics()
      .poly(flattenPolygon(tile.polygon))
      .fill({ color: 0x090706, alpha: 0.18 })
      .stroke({ color: 0x211916, width: 1, alpha: 0.2 });

    shroud.zIndex = tile.zIndex + 1;
    container.addChild(shroud);
  }

  const mist = new Graphics()
    .ellipse(scene.boardSize.width * 0.5, scene.boardSize.height * 0.5, scene.boardSize.width * 0.64, scene.boardSize.height * 0.38)
    .fill({ color: 0x0a0706, alpha: 0.16 });

  mist.zIndex = -1;
  container.addChild(mist);
}

export function renderFeedbackLayer(container: Container, scene: OverworldSceneModel): void {
  clearLayer(container);

  for (const tile of scene.tiles) {
    const fillAlpha = tile.isCurrent ? 0.18 : scene.hoverTileKey === tile.key ? 0.2 : tile.isReachable ? 0.11 : 0;
    const strokeWidth = tile.isCurrent || scene.hoverTileKey === tile.key || tile.isReachable ? 2 : 0;
    const strokeAlpha = tile.isCurrent ? 0.58 : scene.hoverTileKey === tile.key ? 0.42 : 0.28;

    if (fillAlpha === 0 && strokeWidth === 0) {
      continue;
    }

    const overlay = new Graphics()
      .poly(flattenPolygon(tile.polygon))
      .fill({
        color: tile.isCurrent ? 0xf6d18f : 0xf0bf5d,
        alpha: fillAlpha
      })
      .stroke({
        color: tile.isCurrent ? 0xfff0cf : 0xf0bf5d,
        width: strokeWidth,
        alpha: strokeAlpha
      });

    overlay.zIndex = tile.zIndex + 2;
    container.addChild(overlay);
  }
}

export function renderPropLayer(container: Container, scene: OverworldSceneModel): void {
  clearLayer(container);

  for (const location of scene.locations) {
    const marker = createLocationMarker(location.type);

    marker.position.set(location.markerPosition.x, location.markerPosition.y);
    marker.zIndex = location.zIndex;
    container.addChild(marker);
  }
}

export function renderActorLayer(container: Container, scene: OverworldSceneModel): Container {
  clearLayer(container);

  const courier = createCourierToken();

  courier.position.set(scene.courier.anchor.x, scene.courier.anchor.y);
  courier.zIndex = scene.courier.zIndex;
  container.addChild(courier);

  return courier;
}

export function renderOverworldStaticLayers(
  layers: OverworldLayerContainers,
  scene: OverworldSceneModel
): { courier: Container } {
  renderTerrainLayer(layers.terrain, scene);
  renderFogLayer(layers.fog, scene);
  renderPropLayer(layers.props, scene);

  return {
    courier: renderActorLayer(layers.actors, scene)
  };
}

export function getHexOverlayPoints(): number[] {
  return flattenPolygon(getHexLocalPolygon(OVERWORLD_ISO_METRICS));
}
