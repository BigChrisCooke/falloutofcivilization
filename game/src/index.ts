export {
  getDefaultContentRoot,
  loadGameContent,
  validateGameContent,
  type GameContentBundle
} from "./content/load_game_content.js";
export {
  dialogueNodeSchema,
  dialogueOptionSchema,
  dialogueTreeSchema,
  interiorMapSchema,
  locationSchema,
  overworldMapSchema,
  questObjectiveSchema,
  questSchema,
  regionSchema,
  specialGateSchema,
  specialStatEnum,
  specialStatNames,
  type DialogueNode,
  type DialogueOption,
  type DialogueTree,
  type InteriorMapDefinition,
  type LocationDefinition,
  type OverworldMapDefinition,
  type QuestDefinition,
  type QuestObjective,
  type RegionDefinition,
  type SpecialGate,
  type SpecialStat
} from "./schemas/content.js";
export { getHexesInRadius, hexDistance, toTileKey, type HexPoint } from "./rules/hex.js";
export { isPassableTile } from "./tiles.js";
