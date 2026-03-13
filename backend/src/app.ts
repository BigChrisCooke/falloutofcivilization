import cors from "cors";
import type Database from "better-sqlite3";
import express from "express";

import { createAuthRouter } from "./controllers/auth_controller.js";
import { createGameRouter } from "./controllers/game_controller.js";
import { createSaveRouter } from "./controllers/save_controller.js";
import { attachAuth } from "./middleware/authenticate.js";
import { AuthService } from "./services/auth_service.js";
import { getGameContent } from "./services/content_service.js";
import { GameService } from "./services/game_service.js";
import { SaveService } from "./services/save_service.js";
import type { AppConfig } from "./shared/config.js";

export function createApp(db: Database.Database, config: AppConfig) {
  getGameContent();

  const authService = new AuthService(db, config);
  const saveService = new SaveService(db);
  const gameService = new GameService(db);
  const app = express();

  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(attachAuth(authService, config));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/api/auth", createAuthRouter(authService, config));
  app.use("/api/saves", createSaveRouter(authService, saveService));
  app.use("/api/game", createGameRouter(gameService));

  return app;
}
