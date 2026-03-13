import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";
import { ZodError } from "zod";

import {
  interiorMapSchema,
  locationSchema,
  overworldMapSchema,
  regionSchema,
  type InteriorMapDefinition,
  type LocationDefinition,
  type OverworldMapDefinition,
  type RegionDefinition
} from "../schemas/content.js";

export interface GameContentBundle {
  contentRoot: string;
  regions: RegionDefinition[];
  locations: LocationDefinition[];
  overworldMaps: OverworldMapDefinition[];
  interiorMaps: InteriorMapDefinition[];
}

function loadYamlFile<T>(filePath: string, parser: { parse: (value: unknown) => T }): T {
  const raw = readFileSync(filePath, "utf8");
  const parsed = yaml.load(raw);

  try {
    return parser.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid content file ${filePath}: ${issues}`);
    }

    throw error;
  }
}

function loadDirectory<T>(directoryPath: string, parser: { parse: (value: unknown) => T }): T[] {
  return readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith(".yaml"))
    .sort()
    .map((fileName) => loadYamlFile(path.join(directoryPath, fileName), parser));
}

export function getDefaultContentRoot(): string {
  return path.resolve(import.meta.dirname, "..", "..", "content");
}

export function loadGameContent(contentRoot = getDefaultContentRoot()): GameContentBundle {
  const regions = loadDirectory(path.join(contentRoot, "world"), regionSchema);
  const locations = loadDirectory(path.join(contentRoot, "locations"), locationSchema);
  const overworldMaps = loadDirectory(path.join(contentRoot, "maps", "overworld"), overworldMapSchema);
  const interiorMaps = loadDirectory(path.join(contentRoot, "maps", "interiors"), interiorMapSchema);

  const regionIds = new Set(regions.map((region) => region.id));
  const interiorMapIds = new Set(interiorMaps.map((map) => map.id));
  const overworldMapIds = new Set(overworldMaps.map((map) => map.id));
  const locationIds = new Set(locations.map((location) => location.id));
  const overworldMapsById = new Map(overworldMaps.map((map) => [map.id, map]));

  for (const region of regions) {
    if (!overworldMapIds.has(region.mapId)) {
      throw new Error(`Region ${region.id} references missing overworld map ${region.mapId}`);
    }

    if (!locationIds.has(region.startingLocationId)) {
      throw new Error(`Region ${region.id} references missing starting location ${region.startingLocationId}`);
    }
  }

  for (const overworldMap of overworldMaps) {
    if (overworldMap.layout.length !== overworldMap.height) {
      throw new Error(
        `Overworld map ${overworldMap.id} has height ${overworldMap.height} but ${overworldMap.layout.length} layout rows`
      );
    }

    for (const row of overworldMap.layout) {
      if (row.length !== overworldMap.width) {
        throw new Error(
          `Overworld map ${overworldMap.id} has width ${overworldMap.width} but found a row with ${row.length} tiles`
        );
      }
    }
  }

  for (const location of locations) {
    if (!regionIds.has(location.regionId)) {
      throw new Error(`Location ${location.id} references missing region ${location.regionId}`);
    }

    if (location.interiorMapId && !interiorMapIds.has(location.interiorMapId)) {
      throw new Error(`Location ${location.id} references missing interior map ${location.interiorMapId}`);
    }

    const region = regions.find((candidate) => candidate.id === location.regionId);
    const overworldMap = region ? overworldMapsById.get(region.mapId) : null;

    if (!region || !overworldMap) {
      continue;
    }

    if (
      location.position.x < 0 ||
      location.position.y < 0 ||
      location.position.x >= overworldMap.width ||
      location.position.y >= overworldMap.height
    ) {
      throw new Error(
        `Location ${location.id} position (${location.position.x}, ${location.position.y}) is outside overworld map ${overworldMap.id}`
      );
    }
  }

  for (const region of regions) {
    const startingLocation = locations.find((location) => location.id === region.startingLocationId);

    if (!startingLocation) {
      continue;
    }

    if (startingLocation.regionId !== region.id) {
      throw new Error(
        `Region ${region.id} starting location ${startingLocation.id} belongs to region ${startingLocation.regionId}`
      );
    }
  }

  for (const overworldMap of overworldMaps) {
    for (const pointOfInterestId of overworldMap.pointsOfInterest) {
      if (!locationIds.has(pointOfInterestId)) {
        throw new Error(`Overworld map ${overworldMap.id} references missing point of interest ${pointOfInterestId}`);
      }
    }
  }

  return {
    contentRoot,
    regions,
    locations,
    overworldMaps,
    interiorMaps
  };
}

export function validateGameContent(contentRoot = getDefaultContentRoot()): GameContentBundle {
  return loadGameContent(contentRoot);
}
