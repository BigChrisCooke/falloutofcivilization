import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/authenticate.js";
import { AuthService } from "../services/auth_service.js";
import { SaveService } from "../services/save_service.js";

const createSaveSchema = z.object({
  name: z.string().min(1).max(40)
});

export function createSaveRouter(authService: AuthService, saveService: SaveService): Router {
  const router = Router();

  router.use(requireAuth);

  router.get("/", (request, response) => {
    const saves = saveService.listSaves(request.authUser!.id);
    response.json({ saves });
  });

  router.post("/", (request, response) => {
    try {
      const payload = createSaveSchema.parse(request.body);
      const save = saveService.createSave(request.authUser!.id, payload.name);
      authService.updateCurrentSave(request.sessionId!, save.id);

      response.status(201).json({ save });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create save.";
      response.status(400).json({ error: message });
    }
  });

  router.post("/:saveId/load", (request, response) => {
    const save = saveService.getSave(request.params.saveId);

    if (!save || save.user_id !== request.authUser!.id) {
      response.status(404).json({ error: "Save not found." });
      return;
    }

    authService.updateCurrentSave(request.sessionId!, save.id);
    response.json({ save });
  });

  return router;
}
