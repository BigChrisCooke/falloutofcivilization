import { loadGameContent, type GameContentBundle } from "../../../game/src/index.js";

let cachedContent: GameContentBundle | null = null;

export function getGameContent(): GameContentBundle {
  if (!cachedContent) {
    cachedContent = loadGameContent();
  }

  return cachedContent;
}
