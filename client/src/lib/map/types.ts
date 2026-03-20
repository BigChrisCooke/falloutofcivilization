import type { GameState } from "../api.js";
import type { GridPoint, ProjectedPoint } from "../iso.js";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface MapSize {
  width: number;
  height: number;
}

export interface OverworldTileNode {
  key: string;
  point: GridPoint;
  terrain: string;
  projected: ProjectedPoint;
  polygon: WorldPoint[];
  discovered: boolean;
  isCurrent: boolean;
  isReachable: boolean;
  zIndex: number;
  locationId: string | null;
  enterableLocationId: string | null;
}

export interface OverworldLocationNode {
  id: string;
  tileKey: string;
  name: string;
  type: string;
  point: GridPoint;
  markerPosition: ProjectedPoint;
  hitRadius: number;
  interiorMapId: string | null;
  discovered: boolean;
  isCurrent: boolean;
  zIndex: number;
}

export interface OverworldActorNode {
  id: "courier";
  point: GridPoint;
  anchor: ProjectedPoint;
  zIndex: number;
}

export interface InteriorTileNode {
  key: string;
  point: GridPoint;
  terrain: string;
  projected: ProjectedPoint;
  polygon: WorldPoint[];
  isCurrent: boolean;
  isReachable: boolean;
  isPassable: boolean;
  exitId: string | null;
  zIndex: number;
}

export interface InteriorMarkerNode {
  id: string;
  kind: "exit" | "interactable" | "npc" | "loot";
  point: GridPoint;
  label: string;
  markerPosition: ProjectedPoint;
  hitRadius: number;
  isActionable: boolean;
  zIndex: number;
  ownedBy?: string;
}

export interface InteriorActorNode {
  id: "courier";
  point: GridPoint;
  anchor: ProjectedPoint;
  zIndex: number;
}

export interface OverworldQuestMarkerNode {
  id: string;
  questId: string;
  label: string;
  point: GridPoint;
  markerPosition: ProjectedPoint;
  zIndex: number;
  isSelected: boolean;
}

export interface OverworldSceneModel {
  mapId: string;
  mapName: string;
  mapTheme: string;
  boardSize: MapSize;
  currentTileKey: string;
  hoverTileKey: string | null;
  tiles: OverworldTileNode[];
  locations: OverworldLocationNode[];
  courier: OverworldActorNode;
  routes: Array<{ id: string }>;
  terrainFeatures: Array<{ id: string }>;
  questMarkers: OverworldQuestMarkerNode[];
  factionMarkers: Array<{ id: string }>;
  borders: Array<{ id: string }>;
  encounterMarkers: Array<{ id: string }>;
  ambientOverlays: Array<{ id: string }>;
}

export interface InteriorSceneModel {
  mapId: string;
  mapName: string;
  mapTheme: string;
  boardSize: MapSize;
  currentTileKey: string;
  hoverTileKey: string | null;
  hoveredMarkerId: string | null;
  tiles: InteriorTileNode[];
  markers: InteriorMarkerNode[];
  courier: InteriorActorNode;
}

export type MapInteractionTarget =
  | { kind: "none" }
  | { kind: "tile"; point: GridPoint; tileKey: string }
  | { kind: "location"; locationId: string; tileKey: string };

export type InteriorInteractionTarget =
  | { kind: "none" }
  | { kind: "tile"; point: GridPoint; tileKey: string }
  | { kind: "exit"; exitId: string; tileKey: string }
  | { kind: "npc"; npcId: string }
  | { kind: "loot"; lootId: string }
  | { kind: "interactable"; interactableId: string }
  | { kind: "player" };

export type OverworldState = GameState;
