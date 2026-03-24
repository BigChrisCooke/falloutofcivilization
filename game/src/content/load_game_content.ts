import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";
import { ZodError } from "zod";

import {
  companionSchema,
  interiorMapSchema,
  locationSchema,
  overworldMapSchema,
  questSchema,
  regionSchema,
  type CompanionDefinition,
  type InteriorMapDefinition,
  type LocationDefinition,
  type OverworldMapDefinition,
  type QuestDefinition,
  type RegionDefinition
} from "../schemas/content.js";

export interface GameContentBundle {
  contentRoot: string;
  regions: RegionDefinition[];
  locations: LocationDefinition[];
  overworldMaps: OverworldMapDefinition[];
  interiorMaps: InteriorMapDefinition[];
  quests: QuestDefinition[];
  companions: CompanionDefinition[];
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

function loadDirectoryIfExists<T>(directoryPath: string, parser: { parse: (value: unknown) => T }): T[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return loadDirectory(directoryPath, parser);
}

export function loadGameContent(contentRoot = getDefaultContentRoot()): GameContentBundle {
  const regions = loadDirectory(path.join(contentRoot, "world"), regionSchema);
  const locations = loadDirectory(path.join(contentRoot, "locations"), locationSchema);
  const overworldMaps = loadDirectory(path.join(contentRoot, "maps", "overworld"), overworldMapSchema);
  const interiorMaps = loadDirectory(path.join(contentRoot, "maps", "interiors"), interiorMapSchema);
  const quests = loadDirectoryIfExists(path.join(contentRoot, "quests"), questSchema);
  const companions = loadDirectoryIfExists(path.join(contentRoot, "companions"), companionSchema);

  const regionIds = new Set(regions.map((region) => region.id));
  const questIds = new Set(quests.map((quest) => quest.id));
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

  for (const interiorMap of interiorMaps) {
    const mapHeight = interiorMap.layout.length;

    function isWithinLayout(label: string, x: number, y: number) {
      const rowWidth = interiorMap.layout[y]?.length ?? 0;

      if (x < 0 || y < 0 || y >= mapHeight || x >= rowWidth) {
        throw new Error(
          `Interior map ${interiorMap.id} ${label} at (${x}, ${y}) is outside layout bounds (${rowWidth}x${mapHeight})`
        );
      }
    }

    for (const spawn of interiorMap.spawnPoints) {
      isWithinLayout(`spawn "${spawn.id}"`, spawn.x, spawn.y);
    }

    for (const exit of interiorMap.exits) {
      isWithinLayout(`exit "${exit.id}"`, exit.x, exit.y);
    }

    for (const npc of interiorMap.npcs) {
      if (npc.x !== undefined && npc.y !== undefined) {
        isWithinLayout(`npc "${npc.id}"`, npc.x, npc.y);
      }
    }

    for (const loot of interiorMap.loot) {
      if (loot.x !== undefined && loot.y !== undefined) {
        isWithinLayout(`loot "${loot.id}"`, loot.x, loot.y);
      }
    }

    for (const npc of interiorMap.npcs) {
      if (!npc.dialogue) {
        continue;
      }

      const nodeIds = new Set(npc.dialogue.nodes.map((node) => node.id));

      if (!nodeIds.has(npc.dialogue.rootNodeId)) {
        throw new Error(
          `Interior map ${interiorMap.id} npc "${npc.id}" dialogue rootNodeId "${npc.dialogue.rootNodeId}" does not match any node`
        );
      }

      for (const node of npc.dialogue.nodes) {
        for (const option of node.options) {
          if (option.next && !nodeIds.has(option.next)) {
            throw new Error(
              `Interior map ${interiorMap.id} npc "${npc.id}" dialogue option "${option.id}" references missing node "${option.next}"`
            );
          }

          if (option.questGrant && !questIds.has(option.questGrant)) {
            throw new Error(
              `Interior map ${interiorMap.id} npc "${npc.id}" dialogue option "${option.id}" grants unknown quest "${option.questGrant}"`
            );
          }
        }
      }
    }
  }

  for (const quest of quests) {
    if (quest.mapMarker && !locationIds.has(quest.mapMarker.locationId)) {
      throw new Error(
        `Quest ${quest.id} mapMarker references missing location "${quest.mapMarker.locationId}"`
      );
    }
  }

  for (const companion of companions) {
    if (!locationIds.has(companion.recruitLocationId)) {
      throw new Error(
        `Companion ${companion.id} references missing recruit location "${companion.recruitLocationId}"`
      );
    }
  }

  return {
    contentRoot,
    regions,
    locations,
    overworldMaps,
    interiorMaps,
    quests,
    companions
  };
}

export function validateGameContent(contentRoot = getDefaultContentRoot()): GameContentBundle {
  return loadGameContent(contentRoot);
}
