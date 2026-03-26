export {
  bestStepToward,
  buildExplorationRoute,
  findNearestAdjacentTile,
  findPath,
  hexNeighbors,
  type GridPoint
} from "../../../../game/src/rules/pathfinding.js";

export const STEP_DELAY_MS = 500;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
