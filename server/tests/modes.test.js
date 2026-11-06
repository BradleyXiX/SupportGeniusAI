import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import http from "http";
import app from "../index.js";
import { getCapabilities } from "../services/capabilities.js";
import {
  unavailableActionReply,
  handleChat,
  callWebhook,
  checkOrderStatus,
  updateAddress,
  bookAppointment
} from "../services/agent.js";
import { callLLM } from "../services/llm.js";
import { getEmbedding } from "../services/embeddings.js";

const EXPECTED_REFUSAL =
  "Automated actions are unavailable in this deployment. No order lookup, booking, address change or notification has been performed.";

describe("Task B2: Explicit Modes & Action Gate Contracts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("GET /capabilities and getCapabilities()", () => {
    it("returns exact expected capability schema with no secret exposure", async () => {
      process.env.APP_MODE = "support";
      process.env.OPENAI_API_KEY = "super-secret-key-that-must-not-leak";
      process.env.CLIENT_WEBHOOK_URL = "https://internal.corp/webhook";

      const res = await request(app).get("/capabilities");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        mode: "support",
        actionsEnabled: false,
        sessionRequired: true
      });

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain("super-secret-key");
      expect(bodyStr).not.toContain("internal.corp");
    });

    it("reflects demo mode when APP_MODE=demo", async () => {
      process.env.APP_MODE = "demo";
      const caps = getCapabilities("demo");
      expect(caps).toEqual({
        mode: "demo",
        actionsEnabled: false,
        sessionRequired: true
      });

      const res = await request(app).get("/capabilities");
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe("demo");
    });
  });

  describe("Unconditional Action Refusal & Zero Live Action Dispatch", () => {
    it("unavailableActionReply returns the exact specification string", () => {
      expect(unavailableActionReply()).toBe(EXPECTED_REFUSAL);
    });

    it("callWebhook makes zero outbound requests even when CLIENT_WEBHOOK_URL is configured", async () => {
      let networkHit = false;
      const testServer = http.createServer((req, res) => {
        networkHit = true;
        res.writeHead(200);
        res.end("OK");
      });
      await new Promise((resolve) => testServer.listen(3899, resolve));

      try {
        process.env.CLIENT_WEBHOOK_URL = "http://localhost:3899/webhook";
        const result = await callWebhook("checkOrderStatus", { orderId: "123" });
        expect(networkHit).toBe(false);
        expect(result).toBeNull();
      } finally {
        await new Promise((resolve) => testServer.close(resolve));
      }
    });

    it("direct tool helpers fail closed and return the deterministic refusal without inventing data", async () => {
      process.env.CLIENT_WEBHOOK_URL = "http://localhost:3899/webhook";

      const orderRes = await checkOrderStatus({ orderId: "999" });
      expect(orderRes).toBe(EXPECTED_REFUSAL);
      expect(orderRes).not.toContain("in transit");

      const addrRes = await updateAddress({ address: "123 Elm St" });
      expect(addrRes).toBe(EXPECTED_REFUSAL);
      expect(addrRes).not.toContain("verified");

      const apptRes = await bookAppointment({ name: "Alice" });
      expect(apptRes).toBe(EXPECTED_REFUSAL);
      expect(apptRes).not.toContain("confirmed");
      expect(apptRes).not.toContain("SMS");
    });

    it("handleChat returns deterministic refusal on model ACTION output without re-prompting or dispatching", async () => {
      // Mock callLLM to return ACTION text
      const llmModule = await import("../services/llm.js");
      const llmSpy = vi.spyOn(llmModule, "callLLM").mockResolvedValue(
        'ACTION: checkOrderStatus\nPARAMS: { "orderId": "ORD-12345" }'
      );

      const reply = await handleChat("Where is my order?", "session-action-test");
      expect(reply).toBe(EXPECTED_REFUSAL);
      // Ensure LLM was called only once (not re-prompted with tool results)
      expect(llmSpy).toHaveBeenCalledTimes(1);
    });

    it("handleChat returns safe refusal on unknown or malformed ACTION/PARAMS", async () => {
      const llmModule = await import("../services/llm.js");
      vi.spyOn(llmModule, "callLLM").mockResolvedValue(
        'ACTION: unknownDangerousAction\nPARAMS: { malformed JSON'
      );

      const reply = await handleChat("do something bad", "session-malformed-test");
      expect(reply).toBe(EXPECTED_REFUSAL);
    });
  });

  describe("Explicit Demo Mode (APP_MODE=demo)", () => {
    it("makes zero provider or embedding requests and prefixes chat answers with Demo", async () => {
      process.env.APP_MODE = "demo";

      // getEmbedding should return null or demo vectors with zero network calls
      const embedding = await getEmbedding("test text");
      expect(embedding).toBeNull();

      const response = await callLLM("What is your refund policy?", "sess-demo");
      expect(response).toMatch(/^(?:\[Demo\]|Demo:)/i);
      expect(response.toLowerCase()).toContain("refund");
    });
  });

  describe("Explicit Support Mode (APP_MODE=support)", () => {
    it("throws gateway error on provider failure and never falls back to simulateLLM", async () => {
      process.env.APP_MODE = "support";
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      // Point Ollama to an unreachable port to guarantee immediate connection failure
      process.env.OLLAMA_URL = "http://127.0.0.1:54321";

      await expect(callLLM("Hello support", "sess-support-fail")).rejects.toThrow();
    });
  });
});

