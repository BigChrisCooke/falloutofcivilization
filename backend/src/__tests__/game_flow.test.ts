import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { cleanupTestDb, createTestConfig, resetTestDb } from "./test_utils.js";

interface HexPoint {
  x: number;
  y: number;
}

function getNeighbors(point: HexPoint, width: number, height: number): HexPoint[] {
  const deltas =
    point.y % 2 === 0
      ? [
          { x: -1, y: -1 },
          { x: 0, y: -1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: -1, y: 1 },
          { x: 0, y: 1 }
        ]
      : [
          { x: 0, y: -1 },
          { x: 1, y: -1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 }
        ];

  return deltas
    .map((delta) => ({ x: point.x + delta.x, y: point.y + delta.y }))
    .filter((candidate) => candidate.x >= 0 && candidate.y >= 0 && candidate.x < width && candidate.y < height);
}

function findPath(from: HexPoint, to: HexPoint, width: number, height: number): HexPoint[] {
  const queue: HexPoint[] = [from];
  const parents = new Map<string, string | null>([[`${from.x},${from.y}`, null]]);

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    if (current.x === to.x && current.y === to.y) {
      const path: HexPoint[] = [];
      let key: string | null = `${current.x},${current.y}`;

      while (key) {
        const [x = 0, y = 0] = key.split(",").map(Number);
        path.push({ x, y });
        key = parents.get(key) ?? null;
      }

      return path.reverse().slice(1);
    }

    for (const neighbor of getNeighbors(current, width, height)) {
      const key = `${neighbor.x},${neighbor.y}`;

      if (parents.has(key)) {
        continue;
      }

      parents.set(key, `${current.x},${current.y}`);
      queue.push(neighbor);
    }
  }

  throw new Error("No path found across the overworld.");
}

function expectContiguousRoute(steps: Array<{ position: HexPoint }>, start: HexPoint): void {
  let current = start;

  for (const step of steps) {
    const neighbors = getNeighbors(current, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    expect(neighbors).toContainEqual(step.position);
    current = step.position;
  }
}

describe("game flow", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it("creates a save, tracks exploration, switches screens, and enters a location after travel", async () => {
    const app = createApp(createTestConfig());
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      username: "wanderer",
      password: "highdesert77"
    });

    expect(registerResponse.status).toBe(201);

    const createSaveResponse = await agent.post("/api/saves").send({
      name: "Chris Test Save"
    });

    expect(createSaveResponse.status).toBe(201);
    expect(createSaveResponse.body.save.name).toBe("Chris Test Save");

    const initialStateResponse = await agent.get("/api/game/state");

    expect(initialStateResponse.status).toBe(200);
    expect(initialStateResponse.body.saveLoaded).toBe(true);
    // New saves start inside Vault 47
    expect(initialStateResponse.body.state.worldState.current_screen).toBe("location");
    expect(initialStateResponse.body.state.worldState.player_x).toBe(2);
    expect(initialStateResponse.body.state.worldState.player_y).toBe(2);
    expect(initialStateResponse.body.state.currentLocation.id).toBe("vault_47");
    expect(initialStateResponse.body.state.currentInteriorMap.id).toBe("vault_47_home");
    expect(initialStateResponse.body.state.mapDiscovery.discoveredLocationIds).toContain("vault_47");
    expect(initialStateResponse.body.state.mapDiscovery.discoveredTileKeys.length).toBeGreaterThan(1);

    const blockedVaultMoveResponse = await agent.post("/api/game/interior/move").send({
      x: 1,
      y: 3
    });

    expect(blockedVaultMoveResponse.status).toBe(400);
    expect(blockedVaultMoveResponse.body.error).toContain("reachable passable tiles");

    const vaultMoveResponse = await agent.post("/api/game/interior/move").send({
      x: 2,
      y: 3
    });

    expect(vaultMoveResponse.status).toBe(200);
    expect(vaultMoveResponse.body).not.toHaveProperty("state");
    expect(Object.keys(vaultMoveResponse.body.replay).sort()).toEqual(["finalPatch", "steps"]);
    expect(vaultMoveResponse.body.replay.steps).toEqual([{ position: { x: 2, y: 3 } }]);
    expect(vaultMoveResponse.body.replay.finalPatch.worldState.player_x).toBe(2);
    expect(vaultMoveResponse.body.replay.finalPatch.worldState.player_y).toBe(3);

    const vaultExitResponse = await agent.post("/api/game/interior/exit").send({
      exitId: "to_frontier_valley"
    });

    expect(vaultExitResponse.status).toBe(200);
    expect(vaultExitResponse.body.state.worldState.current_screen).toBe("overworld");
    expect(vaultExitResponse.body.state.worldState.player_x).toBe(4);
    expect(vaultExitResponse.body.state.worldState.player_y).toBe(5);

    const backToWorldResponse = await agent.post("/api/game/screen").send({
      screen: "overworld"
    });

    expect(backToWorldResponse.status).toBe(200);

    const dustyTavern = backToWorldResponse.body.state.locations.find(
      (location: { id: string; position: HexPoint }) => location.id === "dusty_tavern"
    );

    expect(dustyTavern).toBeTruthy();

    if (!dustyTavern) {
      throw new Error("Dusty tavern location was not returned in game state.");
    }

    const path = findPath(
      {
        x: backToWorldResponse.body.state.worldState.player_x,
        y: backToWorldResponse.body.state.worldState.player_y
      },
      dustyTavern.position,
      backToWorldResponse.body.state.overworldMap.width,
      backToWorldResponse.body.state.overworldMap.height
    );

    const travelResponse = await agent.post("/api/game/travel").send(dustyTavern.position);

    expect(travelResponse.status).toBe(200);
    expect(travelResponse.body).not.toHaveProperty("state");
    expect(Object.keys(travelResponse.body.replay).sort()).toEqual(["finalPatch", "steps"]);
    expect(Object.keys(travelResponse.body.replay.finalPatch).sort()).toEqual([
      "currentInteriorMap",
      "currentLocation",
      "mapDiscovery",
      "playerCharacter",
      "questState",
      "worldState"
    ]);
    expect(travelResponse.body.replay.finalPatch).not.toHaveProperty("weaponCatalog");
    expect(travelResponse.body.replay.finalPatch).not.toHaveProperty("locations");
    expect(travelResponse.body.replay.steps).toHaveLength(path.length);
    expect(travelResponse.body.replay.steps[path.length - 1]).toEqual({
      position: dustyTavern.position,
      revealedTileKeys: expect.any(Array),
      discoveredLocationIds: expect.any(Array)
    });
    expect(travelResponse.body.replay.finalPatch.worldState.player_x).toBe(dustyTavern.position.x);
    expect(travelResponse.body.replay.finalPatch.worldState.player_y).toBe(dustyTavern.position.y);
    expect(travelResponse.body.replay.finalPatch.mapDiscovery.discoveredLocationIds).toContain("dusty_tavern");

    const locationResponse = await agent.post("/api/game/location/enter").send({
      locationId: "dusty_tavern"
    });

    expect(locationResponse.status).toBe(200);
    expect(locationResponse.body.state.worldState.current_screen).toBe("location");
    expect(locationResponse.body.state.currentLocation.id).toBe("dusty_tavern");
    expect(locationResponse.body.state.currentInteriorMap.id).toBe("dusty_tavern_interior");
    expect(locationResponse.body.state.worldState.player_x).toBe(8);
    expect(locationResponse.body.state.worldState.player_y).toBe(10);

    const tavernMoveResponse = await agent.post("/api/game/interior/move").send({
      x: 8,
      y: 8
    });

    expect(tavernMoveResponse.status).toBe(200);
    expect(tavernMoveResponse.body).not.toHaveProperty("state");
    expect(Object.keys(tavernMoveResponse.body.replay).sort()).toEqual(["finalPatch", "steps"]);
    expect(tavernMoveResponse.body.replay.steps).toHaveLength(2);
    expectContiguousRoute(tavernMoveResponse.body.replay.steps, { x: 8, y: 10 });
    expect(tavernMoveResponse.body.replay.steps[1]).toEqual({ position: { x: 8, y: 8 } });
    expect(tavernMoveResponse.body.replay.finalPatch.worldState.player_x).toBe(8);
    expect(tavernMoveResponse.body.replay.finalPatch.worldState.player_y).toBe(8);

    const tavernExitBlockedResponse = await agent.post("/api/game/interior/exit").send({
      exitId: "to_frontier_valley"
    });

    expect(tavernExitBlockedResponse.status).toBe(400);
    expect(tavernExitBlockedResponse.body.error).toContain("Move closer to the exit");

    const tavernBackToWorldResponse = await agent.post("/api/game/screen").send({
      screen: "overworld"
    });

    expect(tavernBackToWorldResponse.status).toBe(200);
    expect(tavernBackToWorldResponse.body.state.worldState.player_x).toBe(dustyTavern.position.x);
    expect(tavernBackToWorldResponse.body.state.worldState.player_y).toBe(dustyTavern.position.y);

    const savesResponse = await agent.get("/api/saves");

    expect(savesResponse.status).toBe(200);
    expect(savesResponse.body.saves).toHaveLength(1);
  });

  it("rejects invalid route destinations without changing persisted position", async () => {
    const app = createApp(createTestConfig());
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      username: "ranger",
      password: "desertwatch11"
    });
    await agent.post("/api/saves").send({
      name: "Route Guard"
    });
    await agent.post("/api/game/interior/move").send({
      x: 2,
      y: 3
    });
    await agent.post("/api/game/interior/exit").send({
      exitId: "to_frontier_valley"
    });

    const beforeStateResponse = await agent.get("/api/game/state");

    expect(beforeStateResponse.status).toBe(200);
    expect(beforeStateResponse.body.saveLoaded).toBe(true);

    const travelResponse = await agent.post("/api/game/travel").send({
      x: 99,
      y: 99
    });

    expect(travelResponse.status).toBe(400);
    expect(travelResponse.body.error).toContain("cannot be reached");

    const afterStateResponse = await agent.get("/api/game/state");

    expect(afterStateResponse.status).toBe(200);
    expect(afterStateResponse.body.state.worldState.player_x).toBe(beforeStateResponse.body.state.worldState.player_x);
    expect(afterStateResponse.body.state.worldState.player_y).toBe(beforeStateResponse.body.state.worldState.player_y);
  });
});
