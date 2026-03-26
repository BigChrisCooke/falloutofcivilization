import { existsSync } from "node:fs";
import path from "node:path";

import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";

import { createAuthRouter } from "./controllers/auth_controller.js";
import { createGameRouter } from "./controllers/game_controller.js";
import { createSaveRouter } from "./controllers/save_controller.js";
import { attachAuth } from "./middleware/authenticate.js";
import { AuthService } from "./services/auth_service.js";
import { getGameContent } from "./services/content_service.js";
import { DialogueService } from "./services/dialogue_service.js";
import { GameService } from "./services/game_service.js";
import { InventoryService } from "./services/inventory_service.js";
import { SaveService } from "./services/save_service.js";
import type { AppConfig } from "./shared/config.js";

export function createApp(config: AppConfig) {
  getGameContent();

  const authService = new AuthService(config);
  const saveService = new SaveService();
  const gameService = new GameService();
  const dialogueService = new DialogueService();
  const inventoryService = new InventoryService();
  const app = express();
  const clientIndexPath = path.join(config.clientDistPath, "index.html");

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(
    cors({
      origin: config.clientOrigin,
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
  app.use("/api/game", createGameRouter(gameService, dialogueService, inventoryService));

  if (existsSync(clientIndexPath)) {
    app.use(express.static(config.clientDistPath));
    app.get(/^(?!\/api(?:\/|$)).*/u, (_request, response) => {
      response.sendFile(clientIndexPath);
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Invalid request body." });
      return;
    }

    console.error("Unhandled error:", error);
    response.status(500).json({ error: "Internal server error." });
  });

  return app;
}
