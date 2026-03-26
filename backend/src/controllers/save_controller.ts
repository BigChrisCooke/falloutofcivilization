import { Router } from "express";
import { z, ZodError } from "zod";

import { requireAuth } from "../middleware/authenticate.js";
import { AuthService } from "../services/auth_service.js";
import { SaveService } from "../services/save_service.js";

const createSaveSchema = z.object({
  name: z.string().trim().min(1).max(40)
});

export function createSaveRouter(authService: AuthService, saveService: SaveService): Router {
  const router = Router();

  router.use(requireAuth);

  router.get("/", async (request, response) => {
    const saves = await saveService.listSaves(request.authUser!.id);
    response.json({ saves });
  });

  router.post("/", async (request, response) => {
    try {
      const payload = createSaveSchema.parse(request.body);
      const save = await saveService.createSave(request.authUser!.id, payload.name);
      await authService.updateCurrentSave(request.sessionId!, save.id);

      response.status(201).json({ save });
    } catch (error) {
      const message =
        error instanceof ZodError
          ? error.issues.map((issue) => issue.message).join(", ")
          : error instanceof Error
            ? error.message
            : "Failed to create save.";
      response.status(400).json({ error: message });
    }
  });

  router.post("/:saveId/save", async (request, response) => {
    const save = await saveService.getSave(request.params.saveId);

    if (!save || save.user_id !== request.authUser!.id) {
      response.status(404).json({ error: "Save not found." });
      return;
    }

    await saveService.touchSave(save.id);
    response.json({ save: { ...save, updated_at: Date.now() }, message: "Game saved." });
  });

  router.delete("/:saveId", async (request, response) => {
    const deleted = await saveService.deleteSave(request.authUser!.id, request.params.saveId);

    if (!deleted) {
      response.status(404).json({ error: "Save not found." });
      return;
    }

    response.json({ deleted: true });
  });

  router.post("/:saveId/load", async (request, response) => {
    const save = await saveService.getSave(request.params.saveId);

    if (!save || save.user_id !== request.authUser!.id) {
      response.status(404).json({ error: "Save not found." });
      return;
    }

    await authService.updateCurrentSave(request.sessionId!, save.id);
    response.json({ save });
  });

  return router;
}
