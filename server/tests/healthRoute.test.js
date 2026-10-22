import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index.js";

describe("GET /health Endpoint", () => {
  it("returns HTTP 200 with operational metrics", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body).toHaveProperty("uptimeSeconds");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("environment");
    expect(res.body).toHaveProperty("vectorStore");
    expect(res.body).toHaveProperty("memory");
  });

  it("sets security headers on health probe response", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
