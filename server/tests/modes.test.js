import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock node-fetch at the module boundary to count and intercept all outbound fetch calls
const fetchSpy = vi.fn((url, options) => {
  throw new Error(`Unexpected outbound network fetch call to: ${url}`);
});

vi.mock("node-fetch", () => {
  return {
    default: (...args) => fetchSpy(...args)
  };
});

import app from "../index.js";
import { getCapabilities } from "../services/capabilities.js";
import {
  unavailableActionReply,
  handleChat,
  callWebhook,
  checkOrderStatus,
  updateAddress,
  bookAppointment,
  clearAgentHistory
} from "../services/agent.js";
import { callLLM } from "../services/llm.js";
import { getEmbedding } from "../services/embeddings.js";
import { getSessionMetrics, getSessionCost, resetFinops } from "../services/finops.js";
import { initializeStore, clearStore } from "../db/vectorStore.js";

const EXPECTED_REFUSAL =
  "Automated actions are unavailable in this deployment. No order lookup, booking, address change or notification has been performed.";

describe("Task B2: Explicit Modes & Action Gate Contracts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy.mockReset();
    fetchSpy.mockImplementation((url) => {
      throw new Error(`Unexpected outbound network fetch call to: ${url}`);
    });
    process.env = { ...originalEnv };
    clearAgentHistory();
    resetFinops();
    clearStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    clearAgentHistory();
    resetFinops();
    clearStore();
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
      process.env.CLIENT_WEBHOOK_URL = "http://localhost:3899/webhook";
      const result = await callWebhook("checkOrderStatus", { orderId: "123" });
      expect(fetchSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeNull();
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

      expect(fetchSpy).toHaveBeenCalledTimes(0);
    });

    it("handleChat returns deterministic refusal on model ACTION output without re-prompting or dispatching", async () => {
      const llmModule = await import("../services/llm.js");
      const llmSpy = vi.spyOn(llmModule, "callLLM").mockResolvedValue(
        'ACTION: checkOrderStatus\nPARAMS: { "orderId": "ORD-12345" }'
      );

      const { reply } = await handleChat("Where is my order?", { mode: "support" });
      expect(reply).toBe(EXPECTED_REFUSAL);
      expect(llmSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(0);
    });

    it("handleChat returns safe refusal on unknown or malformed ACTION/PARAMS", async () => {
      const llmModule = await import("../services/llm.js");
      vi.spyOn(llmModule, "callLLM").mockResolvedValue(
        'ACTION: unknownDangerousAction\nPARAMS: { malformed JSON'
      );

      const { reply } = await handleChat("do something bad", { mode: "support" });
      expect(reply).toBe(EXPECTED_REFUSAL);
      expect(fetchSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("Explicit Demo Mode (APP_MODE=demo)", () => {
    it("accumulates zero inference cost and zero displayed /chat cost across repeated demo queries in one session", async () => {
      process.env.APP_MODE = "demo";
      process.env.OPENAI_API_KEY = "dummy-openai-key";
      process.env.GEMINI_API_KEY = "dummy-gemini-key";
      process.env.OLLAMA_URL = "http://localhost:11434";
      process.env.CLIENT_WEBHOOK_URL = "http://localhost:3889/webhook";

      const sessionId = "sess-demo-zero-cost";
      resetFinops();
      clearAgentHistory();
      fetchSpy.mockClear();

      // Bootstrap session with approved Origin
      const initRes = await request(app)
        .post("/session")
        .set("Origin", "http://localhost:3000")
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      // First demo query
      const res1 = await request(app)
        .post("/chat")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", cookie)
        .send({ message: "What is your return policy?", sessionId });

      expect(res1.status).toBe(200);
      expect(res1.body.reply).toMatch(/^(?:\[Demo\]|Demo:)/i);
      expect(res1.body.cost).toBe("0.0000");

      // Second demo query in the same session
      const res2 = await request(app)
        .post("/chat")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", cookie)
        .send({ message: "What are your support hours?", sessionId });

      expect(res2.status).toBe(200);
      expect(res2.body.reply).toMatch(/^(?:\[Demo\]|Demo:)/i);
      expect(res2.body.cost).toBe("0.0000");

      expect(fetchSpy).toHaveBeenCalledTimes(0);
    });

    it("enforces zero network fetch calls across demo generation, embedding, handleChat, and uncached store initialization", async () => {
      process.env.APP_MODE = "demo";
      process.env.OPENAI_API_KEY = "dummy-openai-key";
      process.env.GEMINI_API_KEY = "dummy-gemini-key";
      process.env.OLLAMA_URL = "http://localhost:11434";
      process.env.CLIENT_WEBHOOK_URL = "http://localhost:3889/webhook";

      fetchSpy.mockClear();

      // 1. Demo generation (callLLM)
      const llmResult = await callLLM("What is your return policy?", { mode: "demo" });
      expect(llmResult).toMatch(/^(?:\[Demo\]|Demo:)/i);
      expect(fetchSpy).toHaveBeenCalledTimes(0);

      // 2. Demo embedding (getEmbedding)
      const embeddingResult = await getEmbedding("some uncached query text for embedding");
      expect(embeddingResult).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(0);

      // 3. Demo handleChat
      const chatResult = await handleChat("Tell me your warranty terms", { mode: "demo" });
      expect(chatResult.reply).toMatch(/^(?:\[Demo\]|Demo:)/i);
      expect(fetchSpy).toHaveBeenCalledTimes(0);

      // 4. Controlled document fixture with uncached chunks for store initialization
      const testDocPath = path.join(__dirname, "../data/docs/temp_uncached_fixture.txt");
      try {
        fs.writeFileSync(
          testDocPath,
          "Unique test document text for uncached chunk initialization testing that does not exist in any cache file.",
          "utf-8"
        );
        clearStore();
        await initializeStore();
        expect(fetchSpy).toHaveBeenCalledTimes(0);
      } finally {
        if (fs.existsSync(testDocPath)) {
          fs.unlinkSync(testDocPath);
        }
        clearStore();
      }

      // Assert total fetch calls across all demo paths is exactly zero
      expect(fetchSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("Explicit Support Mode (APP_MODE=support)", () => {
    it("throws gateway error on provider failure and never falls back to simulateLLM", async () => {
      process.env.APP_MODE = "support";
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      process.env.OLLAMA_URL = "http://127.0.0.1:54321";

      fetchSpy.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:54321"));

      await expect(callLLM("Hello support", "sess-support-fail")).rejects.toThrow();
    });
  });
});
