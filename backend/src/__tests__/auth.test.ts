import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { cleanupTestDb, createTestConfig, resetTestDb } from "./test_utils.js";

describe("auth flow", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it("registers a user and restores the session", async () => {
    const app = createApp(createTestConfig());
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      username: "chris",
      password: "vaultdoor123"
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.username).toBe("chris");

    const sessionResponse = await agent.get("/api/auth/session");

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.authenticated).toBe(true);
    expect(sessionResponse.body.user.username).toBe("chris");
  });

  it("logs an existing user in and rejects invalid credentials", async () => {
    const app = createApp(createTestConfig());
    const registerAgent = request.agent(app);

    await registerAgent.post("/api/auth/register").send({
      username: "courier",
      password: "desertwind42"
    });

    const loginAgent = request.agent(app);
    const loginResponse = await loginAgent.post("/api/auth/login").send({
      username: "courier",
      password: "desertwind42"
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.username).toBe("courier");

    const invalidResponse = await request(app).post("/api/auth/login").send({
      username: "courier",
      password: "wrong-password"
    });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error).toContain("Invalid username or password");
  });
});
