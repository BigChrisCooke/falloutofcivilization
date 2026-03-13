import { Router } from "express";
import { z } from "zod";

import { clearSessionCookie, createSessionCookie, requireAuth } from "../middleware/authenticate.js";
import { AuthService } from "../services/auth_service.js";
import type { AppConfig } from "../shared/config.js";

const credentialsSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128)
});

export function createAuthRouter(authService: AuthService, config: AppConfig): Router {
  const router = Router();

  router.post("/register", async (request, response) => {
    try {
      const credentials = credentialsSchema.parse(request.body);
      const user = await authService.register(credentials.username, credentials.password);
      const session = authService.createSession(user.id);

      response.setHeader("Set-Cookie", createSessionCookie(config, session.id, session.expires_at - Date.now()));
      response.status(201).json({
        user
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      response.status(400).json({ error: message });
    }
  });

  router.post("/login", async (request, response) => {
    try {
      const credentials = credentialsSchema.parse(request.body);
      const user = await authService.login(credentials.username, credentials.password);
      const session = authService.createSession(user.id);

      response.setHeader("Set-Cookie", createSessionCookie(config, session.id, session.expires_at - Date.now()));
      response.json({
        user
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      response.status(400).json({ error: message });
    }
  });

  router.post("/logout", requireAuth, (request, response) => {
    authService.logout(request.sessionId!);
    response.setHeader("Set-Cookie", clearSessionCookie(config));
    response.status(204).send();
  });

  router.get("/session", (request, response) => {
    response.json({
      authenticated: Boolean(request.authUser),
      user: request.authUser ?? null,
      currentSaveId: request.currentSaveId ?? null
    });
  });

  return router;
}
