import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/authenticate.js";
import { GameService } from "../services/game_service.js";

const updateScreenSchema = z.object({
  screen: z.enum(["overworld", "vault"])
});

const enterLocationSchema = z.object({
  locationId: z.string().min(1)
});

export function createGameRouter(gameService: GameService): Router {
  const router = Router();

  router.use(requireAuth);

  router.get("/state", (request, response) => {
    if (!request.currentSaveId) {
      response.json({
        saveLoaded: false
      });
      return;
    }

    try {
      response.json({
        saveLoaded: true,
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load game state.";
      response.status(400).json({ error: message });
    }
  });

  router.post("/screen", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = updateScreenSchema.parse(request.body);
      gameService.updateScreen(request.currentSaveId, payload.screen);
      response.json({
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update screen.";
      response.status(400).json({ error: message });
    }
  });

  router.post("/location/enter", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = enterLocationSchema.parse(request.body);
      gameService.enterLocation(request.currentSaveId, payload.locationId);
      response.json({
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enter location.";
      response.status(400).json({ error: message });
    }
  });

  return router;
}
