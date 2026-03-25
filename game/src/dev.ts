import { validateGameContent } from "./content/load_game_content.js";

try {
  const content = validateGameContent();
  console.log(
    `[game] content valid: ${content.regions.length} regions, ${content.locations.length} locations, ${content.interiorMaps.length} interior maps, ${content.quests.length} quests, ${content.weapons.length} weapons`
  );
} catch (error) {
  console.error("[game] content validation failed");
  console.error(error);
  process.exitCode = 1;
}
