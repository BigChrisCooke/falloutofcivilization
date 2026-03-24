import { Container, Graphics } from "pixi.js";

import type { IsoMetrics } from "./iso.js";

export interface HexTerrainVisual {
  fillColor: number;
  shadeColor: number;
  ridgeColor: number;
  edgeColor: number;
  fogTint: number;
}

export interface TileVisual {
  topColor: number;
  leftColor: number;
  rightColor: number;
  edgeColor: number;
  fogTint: number;
}

export interface MarkerVisual {
  fillColor: number;
  accentColor: number;
}

export const TERRAIN_VISUALS: Record<string, HexTerrainVisual> = {
  sand: { fillColor: 0xbd8753, shadeColor: 0x7f5735, ridgeColor: 0xf3d2a5, edgeColor: 0x5f4028, fogTint: 0x181411 },
  scrub: { fillColor: 0x7b8a4a, shadeColor: 0x44512a, ridgeColor: 0xdce59f, edgeColor: 0x313a20, fogTint: 0x14160f },
  road: { fillColor: 0x837264, shadeColor: 0x54453c, ridgeColor: 0xd9c3af, edgeColor: 0x3a302a, fogTint: 0x171413 },
  rock: { fillColor: 0x818087, shadeColor: 0x505058, ridgeColor: 0xd6d7dd, edgeColor: 0x383941, fogTint: 0x141417 },
  mesa: { fillColor: 0xa46348, shadeColor: 0x6e3c2d, ridgeColor: 0xf0b89e, edgeColor: 0x4e291f, fogTint: 0x171312 },
  ridge: { fillColor: 0x8b5d69, shadeColor: 0x5a3b46, ridgeColor: 0xf0c2ce, edgeColor: 0x3c2630, fogTint: 0x161214 },
  vault: { fillColor: 0x6e93b2, shadeColor: 0x44657f, ridgeColor: 0xd3ebff, edgeColor: 0x31475d, fogTint: 0x11151a },
  cave: { fillColor: 0x876f59, shadeColor: 0x5c4a39, ridgeColor: 0xe8cfb3, edgeColor: 0x403327, fogTint: 0x171410 }
};

export const LOCATION_MARKERS: Record<string, MarkerVisual> = {
  vault: { fillColor: 0x9ed8ff, accentColor: 0x1b2731 },
  tavern: { fillColor: 0xffc576, accentColor: 0x402410 },
  cave: { fillColor: 0xc5b69e, accentColor: 0x261d17 },
  landmark: { fillColor: 0xf0a4a4, accentColor: 0x311a1a }
};

export const INTERIOR_TILE_VISUALS: Record<string, TileVisual> = {
  wall: { topColor: 0x72625b, leftColor: 0x514640, rightColor: 0x3a332f, edgeColor: 0xe6d7cf, fogTint: 0x171312 },
  floor: { topColor: 0x8d7f72, leftColor: 0x645a52, rightColor: 0x4a433d, edgeColor: 0xeedfd4, fogTint: 0x171312 },
  stash: { topColor: 0x99633f, leftColor: 0x6d442a, rightColor: 0x4f311f, edgeColor: 0xf3cfb0, fogTint: 0x171312 },
  terminal: { topColor: 0x4d8b96, leftColor: 0x315862, rightColor: 0x223c43, edgeColor: 0xc6f0f8, fogTint: 0x171312 },
  medbay: { topColor: 0x74a08a, leftColor: 0x4c6e5d, rightColor: 0x365044, edgeColor: 0xd8f1e5, fogTint: 0x171312 },
  bar: { topColor: 0xb17248, leftColor: 0x774a30, rightColor: 0x532f20, edgeColor: 0xf8d4bc, fogTint: 0x171312 },
  table: { topColor: 0xa06d4d, leftColor: 0x744c38, rightColor: 0x55372a, edgeColor: 0xf3d7c7, fogTint: 0x171312 },
  stage: { topColor: 0x935c51, leftColor: 0x663f38, rightColor: 0x462b27, edgeColor: 0xf0ccc7, fogTint: 0x171312 },
  exit: { topColor: 0xe3b85c, leftColor: 0x9f7a2a, rightColor: 0x705517, edgeColor: 0xfff0c6, fogTint: 0x171312 },
  rock: { topColor: 0x66615d, leftColor: 0x46423f, rightColor: 0x312e2c, edgeColor: 0xdddad7, fogTint: 0x171312 },
  trap: { topColor: 0x924949, leftColor: 0x622e2e, rightColor: 0x431f1f, edgeColor: 0xf4c7c7, fogTint: 0x171312 },
  cache: { topColor: 0x9f6e4b, leftColor: 0x6f4a32, rightColor: 0x4f3424, edgeColor: 0xf4dac7, fogTint: 0x171312 },
  metal: { topColor: 0x6b7783, leftColor: 0x47515a, rightColor: 0x343b42, edgeColor: 0xd9e0e5, fogTint: 0x171312 },
  console: { topColor: 0x5a8ea1, leftColor: 0x386071, rightColor: 0x26424f, edgeColor: 0xcceefa, fogTint: 0x171312 },
  relay: { topColor: 0x6582a5, leftColor: 0x3c536d, rightColor: 0x29394c, edgeColor: 0xd9e8ff, fogTint: 0x171312 }
};

export const INTERIOR_SURFACE_VISUALS: Record<string, HexTerrainVisual> = {
  wall: { fillColor: 0x72625b, shadeColor: 0x514640, ridgeColor: 0xe6d7cf, edgeColor: 0x3a332f, fogTint: 0x171312 },
  floor: { fillColor: 0x8d7f72, shadeColor: 0x645a52, ridgeColor: 0xeedfd4, edgeColor: 0x4a433d, fogTint: 0x171312 },
  stash: { fillColor: 0x99633f, shadeColor: 0x6d442a, ridgeColor: 0xf3cfb0, edgeColor: 0x4f311f, fogTint: 0x171312 },
  terminal: { fillColor: 0x4d8b96, shadeColor: 0x315862, ridgeColor: 0xc6f0f8, edgeColor: 0x223c43, fogTint: 0x171312 },
  medbay: { fillColor: 0x74a08a, shadeColor: 0x4c6e5d, ridgeColor: 0xd8f1e5, edgeColor: 0x365044, fogTint: 0x171312 },
  bar: { fillColor: 0xb17248, shadeColor: 0x774a30, ridgeColor: 0xf8d4bc, edgeColor: 0x532f20, fogTint: 0x171312 },
  table: { fillColor: 0xa06d4d, shadeColor: 0x744c38, ridgeColor: 0xf3d7c7, edgeColor: 0x55372a, fogTint: 0x171312 },
  stage: { fillColor: 0x935c51, shadeColor: 0x663f38, ridgeColor: 0xf0ccc7, edgeColor: 0x462b27, fogTint: 0x171312 },
  exit: { fillColor: 0xe3b85c, shadeColor: 0x9f7a2a, ridgeColor: 0xfff0c6, edgeColor: 0x705517, fogTint: 0x171312 },
  rock: { fillColor: 0x66615d, shadeColor: 0x46423f, ridgeColor: 0xdddad7, edgeColor: 0x312e2c, fogTint: 0x171312 },
  trap: { fillColor: 0x924949, shadeColor: 0x622e2e, ridgeColor: 0xf4c7c7, edgeColor: 0x431f1f, fogTint: 0x171312 },
  cache: { fillColor: 0x9f6e4b, shadeColor: 0x6f4a32, ridgeColor: 0xf4dac7, edgeColor: 0x4f3424, fogTint: 0x171312 },
  metal: { fillColor: 0x6b7783, shadeColor: 0x47515a, ridgeColor: 0xd9e0e5, edgeColor: 0x343b42, fogTint: 0x171312 },
  console: { fillColor: 0x5a8ea1, shadeColor: 0x386071, ridgeColor: 0xcceefa, edgeColor: 0x26424f, fogTint: 0x171312 },
  relay: { fillColor: 0x6582a5, shadeColor: 0x3c536d, ridgeColor: 0xd9e8ff, edgeColor: 0x29394c, fogTint: 0x171312 },
  rug: { fillColor: 0x8b4a3a, shadeColor: 0x5e3028, ridgeColor: 0xd4a494, edgeColor: 0x3e2019, fogTint: 0x171312 },
  pool: { fillColor: 0x2e7040, shadeColor: 0x1d4a2a, ridgeColor: 0x8fd4a0, edgeColor: 0x143620, fogTint: 0x171312 },
  desk: { fillColor: 0x7a6350, shadeColor: 0x534337, ridgeColor: 0xd4c4b4, edgeColor: 0x3a3028, fogTint: 0x171312 },
  crate: { fillColor: 0x8a7040, shadeColor: 0x5e4c2c, ridgeColor: 0xd8c898, edgeColor: 0x3e3420, fogTint: 0x171312 },
  notice: { fillColor: 0xc4a050, shadeColor: 0x8a7038, ridgeColor: 0xf0e0a0, edgeColor: 0x604e28, fogTint: 0x171312 }
};

export function getHexTopPoints(metrics: IsoMetrics): number[] {
  const halfWidth = metrics.tileWidth / 2;
  const halfHeight = metrics.tileHeight / 2;

  return [
    0,
    -halfHeight,
    halfWidth,
    -halfHeight * 0.5,
    halfWidth,
    halfHeight * 0.5,
    0,
    halfHeight,
    -halfWidth,
    halfHeight * 0.5,
    -halfWidth,
    -halfHeight * 0.5
  ];
}

export function getDiamondPoints(metrics: IsoMetrics): number[] {
  const halfWidth = metrics.tileWidth / 2;
  const halfHeight = metrics.tileHeight / 2;

  return [0, -halfHeight, halfWidth, 0, 0, halfHeight, -halfWidth, 0];
}

export function drawHexSurface(
  graphics: Graphics,
  metrics: IsoMetrics,
  visual: HexTerrainVisual,
  discovered: boolean
): void {
  const points = getHexTopPoints(metrics);
  const halfWidth = metrics.tileWidth / 2;
  const halfHeight = metrics.tileHeight / 2;
  const surfaceColor = discovered ? visual.fillColor : visual.fogTint;
  const ridgeColor = discovered ? visual.ridgeColor : 0x4a3f39;
  const shadeColor = discovered ? visual.shadeColor : 0x120d0b;
  const edgeColor = discovered ? visual.edgeColor : 0x352b27;

  graphics.clear();

  graphics
    .poly(points)
    .fill(surfaceColor)
    .stroke({ color: edgeColor, width: 1.5, alpha: discovered ? 0.48 : 0.28 });

  graphics
    .poly([
      0,
      -halfHeight,
      halfWidth,
      -halfHeight * 0.5,
      0,
      0,
      -halfWidth,
      -halfHeight * 0.5
    ])
    .fill({ color: ridgeColor, alpha: discovered ? 0.12 : 0.05 });

  graphics
    .poly([
      -halfWidth,
      -halfHeight * 0.5,
      0,
      0,
      halfWidth,
      halfHeight * 0.5,
      0,
      halfHeight
    ])
    .fill({ color: shadeColor, alpha: discovered ? 0.18 : 0.08 });
}

export function drawDiamondPrism(graphics: Graphics, metrics: IsoMetrics, visual: TileVisual): void {
  const points = getDiamondPoints(metrics);
  const depth = metrics.tileDepth;

  graphics.clear();

  graphics.poly(points).fill(visual.topColor).stroke({ color: visual.edgeColor, width: 2, alpha: 0.5 });

  graphics
    .poly([
      points[2],
      points[3],
      points[4],
      points[5],
      points[4],
      points[5] + depth,
      points[2],
      points[3] + depth
    ])
    .fill(visual.rightColor)
    .stroke({ color: visual.edgeColor, width: 1.5, alpha: 0.45 });

  graphics
    .poly([
      points[4],
      points[5],
      points[6],
      points[7],
      points[6],
      points[7] + depth,
      points[4],
      points[5] + depth
    ])
    .fill(visual.leftColor)
    .stroke({ color: visual.edgeColor, width: 1.5, alpha: 0.45 });
}

export function createCompanionToken(hexColor: string): Container {
  const tint = parseInt(hexColor.replace("#", ""), 16);
  const token = createCourierToken();
  token.scale.set(0.82);

  // Tint all graphics children to the companion's color
  for (const child of token.children) {
    if (child instanceof Graphics) {
      child.tint = tint;
    }
  }

  return token;
}

export function createCourierToken(): Container {
  const token = new Container();
  const shadow = new Graphics()
    .ellipse(0, 8, 18, 8)
    .fill({ color: 0x120d0a, alpha: 0.42 });
  const body = new Graphics()
    .poly([0, -32, 16, 6, 0, 18, -14, 6])
    .fill(0xe7d3bc)
    .stroke({ color: 0x2b1e16, width: 2, alpha: 0.6 });
  const coat = new Graphics()
    .poly([0, -8, 18, 20, 0, 44, -18, 20])
    .fill(0x8a4f39)
    .stroke({ color: 0x311b13, width: 2, alpha: 0.65 });
  const backpack = new Graphics()
    .roundRect(8, 0, 11, 18, 4)
    .fill(0x4e3528)
    .stroke({ color: 0x261912, width: 1.5, alpha: 0.6 });
  const head = new Graphics().circle(0, -26, 10).fill(0xf0d4bf).stroke({ color: 0x4c3122, width: 2, alpha: 0.55 });
  const scarf = new Graphics()
    .poly([-7, -4, 8, -4, 11, 6, -10, 6])
    .fill(0x2f5a64)
    .stroke({ color: 0x173037, width: 1.5, alpha: 0.5 });

  token.addChild(shadow, backpack, coat, body, scarf, head);

  return token;
}

export function createLocationMarker(type: string): Container {
  const visual = LOCATION_MARKERS[type] ?? { fillColor: 0xf4d5b3, accentColor: 0x23170f };
  const marker = new Container();
  const halo = new Graphics().circle(0, 0, 14).fill({ color: visual.fillColor, alpha: 0.2 });
  const badge = new Graphics();

  switch (type) {
    case "vault":
      badge.poly([0, -16, 14, -6, 14, 8, 0, 18, -14, 8, -14, -6]).fill(visual.fillColor);
      break;
    case "tavern":
      badge.poly([0, -18, 15, 0, 0, 18, -15, 0]).fill(visual.fillColor);
      break;
    case "cave":
      badge.poly([0, -16, 16, 14, -16, 14]).fill(visual.fillColor);
      break;
    case "landmark":
      badge.poly([0, -20, 11, -4, 6, 16, -6, 16, -11, -4]).fill(visual.fillColor);
      break;
    default:
      badge.circle(0, 0, 14).fill(visual.fillColor);
      break;
  }

  badge.stroke({ color: visual.accentColor, width: 3, alpha: 0.55 });
  marker.addChild(halo, badge);

  return marker;
}

export function createQuestMarker(): Container {
  const marker = new Container();
  const glow = new Graphics()
    .circle(0, 0, 18)
    .fill({ color: 0xf0c040, alpha: 0.15 });
  const pin = new Graphics()
    .poly([0, -22, 10, -6, 6, 2, 0, 18, -6, 2, -10, -6])
    .fill(0xf0c040)
    .stroke({ color: 0x5a4010, width: 2.5, alpha: 0.7 });
  const dot = new Graphics()
    .circle(0, -14, 3)
    .fill(0x5a4010);

  marker.addChild(glow, pin, dot);

  return marker;
}

export function createSceneMarker(fillColor: number, accentColor: number): Container {
  const marker = new Container();
  const halo = new Graphics().circle(0, 0, 11).fill({ color: fillColor, alpha: 0.22 });
  const badge = new Graphics()
    .circle(0, 0, 9)
    .fill(fillColor)
    .stroke({ color: accentColor, width: 2, alpha: 0.55 });

  marker.addChild(halo, badge);

  return marker;
}
