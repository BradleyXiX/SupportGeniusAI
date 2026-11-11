import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import { unavailableActionReply } from "../services/agent.js";
import * as llmService from "../services/llm.js";

const TEST_ORIGIN = "http://localhost:3000";

describe("POST /chat Route & RFC 7807 Contracts", () => {
  const originalEnv = { ...process.env };
  let sessionCookie;

  beforeEach(async () => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "demo";

    const initRes = await request(app)
      .post("/session")
      .set("Origin", TEST_ORIGIN)
      .send({});
    sessionCookie = initRes.headers["set-cookie"][0];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("processes a valid customer question and returns 200 with reply and cost", async () => {
    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "What is your return policy?",
        sessionId: "sess_unit_test"
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("reply");
    expect(typeof res.body.reply).toBe("string");
    expect(res.body.reply).toContain("[Demo]");
    expect(res.body).toHaveProperty("cost");
    expect(res.body.costAvailable).toBe(true);
  });

  it("serializes cost: null and costAvailable: false when session metrics have unpriced model usage", async () => {
    vi.spyOn(llmService, "callLLM").mockImplementation(async (prompt, options) => {
      if (options?.metrics) {
        options.metrics.model = "unpriced-custom-model";
        options.metrics.costAvailable = false;
      }
      return "Here is your unpriced answer";
    });

    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "Tell me something",
        sessionId: "sess_unpriced_test"
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Here is your unpriced answer");
    expect(res.body.cost).toBeNull();
    expect(res.body.costAvailable).toBe(false);
  });

  it("returns safe deterministic refusal when model output contains an action attempt", async () => {
    vi.spyOn(llmService, "callLLM").mockResolvedValue(
      'ACTION: checkOrderStatus\nPARAMS: { "orderId": "12345" }'
    );

    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "Where is my order 12345?",
        sessionId: "sess_order_test"
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe(unavailableActionReply());
  });

  it("returns HTTP 422 RFC 7807 Problem Details for empty message", async () => {
    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "   ",
        sessionId: "sess_test"
      });

    expect(res.status).toBe(422);
    expect(res.body.type).toBe("https://supportgenius.ai/errors/validation-failed");
    expect(res.body.title).toBe("Unprocessable Request Entity");
    expect(res.body.status).toBe(422);
    expect(res.body).toHaveProperty("invalidParams");
    expect(res.body.invalidParams.some((p) => p.name === "message")).toBe(true);
  });

  it("returns HTTP 422 RFC 7807 Problem Details for oversized message (>2000 chars)", async () => {
    const oversizedMessage = "A".repeat(2001);
    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: oversizedMessage,
        sessionId: "sess_test"
      });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
    expect(res.body.invalidParams.some((p) => p.name === "message")).toBe(true);
  });

  it("returns HTTP 422 RFC 7807 for invalid sessionId characters", async () => {
    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "Valid question",
        sessionId: "sess<invalid>$$"
      });

    expect(res.status).toBe(422);
    expect(res.body.invalidParams.some((p) => p.name === "sessionId")).toBe(true);
  });
});
