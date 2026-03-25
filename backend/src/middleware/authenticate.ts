import type { NextFunction, Request, Response } from "express";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";

import { AuthService } from "../services/auth_service.js";
import type { AppConfig } from "../shared/config.js";

export function attachAuth(authService: AuthService, config: AppConfig) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    void (async () => {
      const cookies = parseCookie(request.headers.cookie ?? "");
      const sessionId = cookies[config.cookieName];

      if (!sessionId) {
        next();
        return;
      }

      const sessionState = await authService.getSession(sessionId);
      if (!sessionState) {
        request.sessionId = undefined;
        request.authUser = undefined;
        request.currentSaveId = null;
        next();
        return;
      }

      request.sessionId = sessionState.session.id;
      request.authUser = sessionState.user;
      request.currentSaveId = sessionState.session.current_save_id;
      next();
    })().catch(next);
  };
}

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  if (!request.authUser || !request.sessionId) {
    response.status(401).json({
      error: "Authentication required."
    });
    return;
  }

  next();
}

export function createSessionCookie(config: AppConfig, sessionId: string, maxAgeMs: number): string {
  return serializeCookie(config.cookieName, sessionId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: Math.floor(maxAgeMs / 1000)
  });
}

export function clearSessionCookie(config: AppConfig): string {
  return serializeCookie(config.cookieName, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 0
  });
}
