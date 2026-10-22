import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index.js";

describe("POST /chat Route & RFC 7807 Contracts", () => {
  it("processes a valid customer question and returns 200 with reply and cost", async () => {
    const res = await request(app)
      .post("/chat")
      .send({
        message: "What is your return policy?",
        sessionId: "sess_unit_test"
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("reply");
    expect(typeof res.body.reply).toBe("string");
    expect(res.body).toHaveProperty("cost");
  });

  it("triggers agentic order status action when asked about an order", async () => {
    const res = await request(app)
      .post("/chat")
      .send({
        message: "Where is my order 12345?",
        sessionId: "sess_order_test"
      });

    expect(res.status).toBe(200);
    expect(res.body.reply.toLowerCase()).toContain("transit");
  });

  it("returns HTTP 422 RFC 7807 Problem Details for empty message", async () => {
    const res = await request(app)
      .post("/chat")
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
      .send({
        message: "Valid question",
        sessionId: "sess<invalid>$$"
      });

    expect(res.status).toBe(422);
    expect(res.body.invalidParams.some((p) => p.name === "sessionId")).toBe(true);
  });
});
