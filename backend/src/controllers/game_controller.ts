import { Router } from "express";
import { z, ZodError } from "zod";

import { requireAuth } from "../middleware/authenticate.js";
import { DialogueService } from "../services/dialogue_service.js";
import { GameService } from "../services/game_service.js";
import { InventoryService } from "../services/inventory_service.js";

const updateScreenSchema = z.object({
  screen: z.enum(["overworld", "vault"])
});

const enterLocationSchema = z.object({
  locationId: z.string().min(1)
});

const travelSchema = z.object({
  x: z.number().int(),
  y: z.number().int()
});

const interiorExitSchema = z.object({
  exitId: z.string().min(1)
});

const dialogueNpcSchema = z.object({
  npcId: z.string().min(1)
});

const dialogueSelectSchema = z.object({
  npcId: z.string().min(1),
  optionId: z.string().min(1)
});

const collectItemSchema = z.object({
  itemId: z.string().min(1),
  label: z.string().min(1),
  ownedBy: z.string().nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  description: z.string().nullable().optional(),
  actionId: z.string().min(1).optional()
});

const recruitCompanionSchema = z.object({
  companionId: z.string().min(1)
});

const specialSchema = z.object({
  str: z.number().int().min(1).max(10),
  per: z.number().int().min(1).max(10),
  end: z.number().int().min(1).max(10),
  cha: z.number().int().min(1).max(10),
  int: z.number().int().min(1).max(10),
  agl: z.number().int().min(1).max(10),
  lck: z.number().int().min(1).max(10)
});

function formatErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
  }

  return error instanceof Error ? error.message : fallback;
}

export function createGameRouter(gameService: GameService, dialogueService: DialogueService, inventoryService: InventoryService): Router {
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
      const message = formatErrorMessage(error, "Failed to load game state.");
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
      const message = formatErrorMessage(error, "Failed to update screen.");
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
      const message = formatErrorMessage(error, "Failed to enter location.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/travel", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = travelSchema.parse(request.body);
      gameService.travel(request.currentSaveId, payload.x, payload.y);
      response.json({
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to travel.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/interior/move", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = travelSchema.parse(request.body);
      gameService.moveInterior(request.currentSaveId, payload.x, payload.y);
      response.json({
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to move inside the current area.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/interior/exit", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = interiorExitSchema.parse(request.body);
      gameService.exitInterior(request.currentSaveId, payload.exitId);
      response.json({
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to leave the current area.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/character/special", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = specialSchema.parse(request.body);
      const total = Object.values(payload).reduce((a, b) => a + b, 0);
      if (total !== 30) {
        response.status(400).json({ error: "SPECIAL points must total 30." });
        return;
      }
      gameService.savePlayerSpecial(request.currentSaveId, payload);
      response.json({ state: gameService.getState(request.currentSaveId) });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to save character.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/inventory/collect", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = collectItemSchema.parse(request.body);
      const result = inventoryService.collectItem(
        request.currentSaveId,
        payload.itemId,
        payload.label,
        payload.ownedBy ?? null,
        payload.quantity ?? 1,
        payload.description ?? null
      );

      if (payload.actionId) {
        gameService.recordCollectedAction(request.currentSaveId, payload.actionId);
      }

      response.json({
        result,
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to collect item.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/companion/recruit", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = recruitCompanionSchema.parse(request.body);
      gameService.recruitCompanion(request.currentSaveId, payload.companionId);
      response.json({
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to recruit companion.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/dialogue/node", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = dialogueNpcSchema.parse(request.body);
      const node = dialogueService.getDialogueNode(request.currentSaveId, payload.npcId);
      response.json({ node });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to load dialogue.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/dialogue/select", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = dialogueSelectSchema.parse(request.body);
      const result = dialogueService.selectOption(request.currentSaveId, payload.npcId, payload.optionId);
      response.json({
        result,
        state: gameService.getState(request.currentSaveId)
      });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to select dialogue option.");
      response.status(400).json({ error: message });
    }
  });

  router.post("/dialogue/reset", (request, response) => {
    if (!request.currentSaveId) {
      response.status(400).json({ error: "No active save loaded." });
      return;
    }

    try {
      const payload = dialogueNpcSchema.parse(request.body);
      const node = dialogueService.resetDialogue(request.currentSaveId, payload.npcId);
      response.json({ node });
    } catch (error) {
      const message = formatErrorMessage(error, "Failed to reset dialogue.");
      response.status(400).json({ error: message });
    }
  });

  return router;
}
