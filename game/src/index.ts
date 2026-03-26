export {
  getDefaultContentRoot,
  loadGameContent,
  validateGameContent,
  type GameContentBundle
} from "./content/load_game_content.js";
export {
  companionSchema,
  damageTypeEnum,
  dialogueNodeSchema,
  dialogueOptionSchema,
  dialogueTreeSchema,
  interiorMapSchema,
  locationSchema,
  overworldMapSchema,
  questObjectiveSchema,
  questSchema,
  rarityEnum,
  regionSchema,
  specialGateSchema,
  specialStatEnum,
  specialStatNames,
  type CompanionDefinition,
  type CompanionReactionLine,
  type CompanionStoryStage,
  weaponCategoryEnum,
  weaponDefinitionSchema,
  type DamageType,
  type DialogueNode,
  type DialogueOption,
  type DialogueTree,
  type InteriorMapDefinition,
  type LocationDefinition,
  type OverworldMapDefinition,
  type QuestDefinition,
  type QuestObjective,
  type Rarity,
  type RegionDefinition,
  type SpecialGate,
  type SpecialStat,
  type WeaponCategory,
  type WeaponDefinition
} from "./schemas/content.js";
export { getHexesInRadius, hexDistance, toTileKey, type HexPoint } from "./rules/hex.js";
export { isPassableTile } from "./tiles.js";
export {
  SKILL_DEFINITIONS,
  SKILL_IDS,
  getSkillPointCost,
  skillPointsPerLevel,
  computeSkillValue,
  computeAllSkillValues,
  type SkillDefinition
} from "./skills.js";
