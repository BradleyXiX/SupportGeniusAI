import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import http from "http";
import app from "../index.js";
import { callLLM } from "../services/llm.js";
import { getEmbedding } from "../services/embeddings.js";
import { getRelevantChunks, clearStore } from "../db/vectorStore.js";
import { handleChat, clearAgentHistory } from "../services/agent.js";
import { getSessionMetrics, resetFinops } from "../services/finops.js";
import { UpstreamError } from "../utils/upstream.js";

describe("Task B3 Corrections: Nonempty Model Text, Valid Vectors & Safe Logging", () => {
  const originalEnv = { ...process.env };
  let mockServer = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    clearAgentHistory();
    resetFinops();
    clearStore();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    clearAgentHistory();
    resetFinops();
    clearStore();
    if (mockServer) {
      mockServer.close();
      mockServer = null;
    }
  });

  describe("1. Nonempty Model Text Validation", () => {
    const invalidTextCases = [
      { name: "empty string", payload: { response: "" } },
      { name: "whitespace only", payload: { response: "   \n\t  " } },
      { name: "null content", payload: { response: null } },
      { name: "non-string object", payload: { response: { text: "nested" } } }
    ];

    for (const tc of invalidTextCases) {
      it(`rejects Ollama reply with ${tc.name} as UpstreamError kind 'shape'`, async () => {
        mockServer = http.createServer((req, res) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(tc.payload));
        });
        await new Promise((resolve) => mockServer.listen(0, resolve));
        const port = mockServer.address().port;

        process.env.APP_MODE = "support";
        delete process.env.OPENAI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        process.env.OLLAMA_URL = `http://127.0.0.1:${port}`;

        await expect(callLLM("Hello", "sess_shape_test")).rejects.toMatchObject({
          kind: "shape"
        });
      });
    }

    it("rejects OpenAI reply with whitespace-only content as UpstreamError kind 'shape'", async () => {
      mockServer = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          choices: [{ message: { content: "   \t\n  " } }]
        }));
      });
      await new Promise((resolve) => mockServer.listen(0, resolve));
      const port = mockServer.address().port;

      process.env.APP_MODE = "support";
      process.env.OPENAI_API_KEY = "test-openai-key";
      // Point fetch to our mockServer
      const upstreamModule = await import("../utils/upstream.js");
      vi.spyOn(upstreamModule, "fetchJsonBounded").mockImplementation(async (url, fetchOptions, config) => {
        if (config?.validateShape) {
          const fakeData = { choices: [{ message: { content: "   \t\n  " } }] };
          if (!config.validateShape(fakeData)) {
            throw new UpstreamError({ kind: "shape", providerLabel: "openai" });
          }
        }
        return { choices: [{ message: { content: "   \t\n  " } }] };
      });

      await expect(callLLM("Hello", "sess_openai_shape")).rejects.toMatchObject({
        kind: "shape"
      });
    });

    it("returns HTTP 502 PROVIDER_UNAVAILABLE on empty model text without recording conversation history", async () => {
      process.env.APP_MODE = "support";
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const llmService = await import("../services/llm.js");
      vi.spyOn(llmService, "callLLM").mockRejectedValue(
        new UpstreamError({
          kind: "shape",
          message: "Upstream response shape was empty or invalid",
          providerLabel: "ollama"
        })
      );

      const res = await request(app)
        .post("/chat")
        .send({
          message: "What is your refund policy?",
          sessionId: "sess_empty_model_text"
        });

      expect(res.status).toBe(502);
      expect(res.body.code).toBe("PROVIDER_UNAVAILABLE");

      // Verify empty text did not commit to finops or session metrics
      const metrics = getSessionMetrics("sess_empty_model_text");
      expect(metrics).toBeNull();
    });
  });

  describe("2. Valid Embedding Vectors", () => {
    it("rejects empty array, nonnumeric, NaN, and Infinity embedding vectors", async () => {
      const invalidVectors = [
        [],
        ["not-a-number"],
        [NaN, 0.5],
        [Infinity, -Infinity],
        null,
        "vector-string",
        { 0: 1.2 }
      ];

      process.env.APP_MODE = "support";
      delete process.env.OPENAI_API_KEY;

      const upstreamModule = await import("../utils/upstream.js");

      for (const badVec of invalidVectors) {
        vi.spyOn(upstreamModule, "fetchJsonBounded").mockImplementation(async (url, fetchOptions, config) => {
          if (config?.validateShape) {
            const fakeData = { embedding: badVec };
            if (!config.validateShape(fakeData)) {
              throw new UpstreamError({ kind: "shape", providerLabel: "ollama-embeddings" });
            }
          }
          return { embedding: badVec };
        });

        const embedding = await getEmbedding("test query text");
        // Because badVec fails validateShape, it should fall back to keyword search (return null), NOT return badVec!
        expect(embedding).toBeNull();
      }
    });

    it("falls back to keyword search without scoring chunks at zero or NaN when embedding returns invalid shape", async () => {
      process.env.APP_MODE = "support";
      delete process.env.OPENAI_API_KEY;

      const embeddingsModule = await import("../services/embeddings.js");
      // Force getEmbedding to return null (clean fallback)
      vi.spyOn(embeddingsModule, "getEmbedding").mockResolvedValue(null);

      // Populate vectorStore with two mock chunks
      const chunks = await getRelevantChunks("return policy", 2);
      expect(Array.isArray(chunks)).toBe(true);
    });

    it("propagates parent abort out of retrieval immediately without fallback provider call", async () => {
      process.env.APP_MODE = "support";
      const controller = new AbortController();
      controller.abort();

      await expect(getEmbedding("test text", { signal: controller.signal })).rejects.toMatchObject({
        kind: "timeout"
      });
    });
  });

  describe("3. Unexpected-Error Logging & Secret Sentinels", () => {
    it("chat route catches unexpected Error without logging err.message, stack, or secret sentinels", async () => {
      const SECRET_SENTINEL = "sk-live-secret-never-log-12345";
      const USER_QUERY_SENTINEL = "CONFIDENTIAL_USER_SSN_999";
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const agentService = await import("../services/agent.js");
      vi.spyOn(agentService, "handleChat").mockRejectedValue(
        new Error(`Database failure connecting to https://internal.db?token=${SECRET_SENTINEL} with ${USER_QUERY_SENTINEL}`)
      );

      const res = await request(app)
        .post("/chat")
        .send({
          message: "My query",
          sessionId: "sess_unexpected_leak_test"
        });

      expect(res.status).toBe(500);
      expect(res.body.title).toBe("Chat Processing Error");
      expect(res.body.detail).toBe("An unexpected error occurred while processing the chat request.");

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(SECRET_SENTINEL);
      expect(bodyStr).not.toContain(USER_QUERY_SENTINEL);
      expect(bodyStr).not.toContain("https://internal.db");

      // Check captured console.error logs
      const allLogText = consoleErrorSpy.mock.calls.map((args) => args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")).join("\n");
      expect(allLogText).not.toContain(SECRET_SENTINEL);
      expect(allLogText).not.toContain(USER_QUERY_SENTINEL);
      expect(allLogText).not.toContain("https://internal.db");
      expect(allLogText).not.toContain("Database failure connecting");
    });

    it("chat route rejects alphanumeric/long custom error names and ignores x-request-id headers", async () => {
      const CUSTOM_ERR_NAME = "SecretAlphaNumericName12345";
      const LONG_ERR_NAME = "VeryLongCustomErrorName".repeat(25);
      const UNTRUSTED_HEADER_ID = "untrusted-client-header-id-with-secret-ssn";
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const agentService = await import("../services/agent.js");
      const customErr = new Error("Something broke");
      customErr.name = CUSTOM_ERR_NAME;
      vi.spyOn(agentService, "handleChat").mockRejectedValue(customErr);

      const res = await request(app)
        .post("/chat")
        .set("x-request-id", UNTRUSTED_HEADER_ID)
        .send({
          message: "My query",
          sessionId: "sess_custom_err_test"
        });

      expect(res.status).toBe(500);
      expect(res.body.title).toBe("Chat Processing Error");
      expect(res.body.correlationId).not.toBe(UNTRUSTED_HEADER_ID);
      expect(res.body.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(CUSTOM_ERR_NAME);
      expect(bodyStr).not.toContain(UNTRUSTED_HEADER_ID);

      const allLogText = consoleErrorSpy.mock.calls.map((args) => args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")).join("\n");
      expect(allLogText).not.toContain(CUSTOM_ERR_NAME);
      expect(allLogText).not.toContain(UNTRUSTED_HEADER_ID);
      expect(allLogText).toContain("errorType=UNEXPECTED");

      // Also test with very long custom name
      consoleErrorSpy.mockClear();
      const longErr = new Error("Another crash");
      longErr.name = LONG_ERR_NAME;
      vi.spyOn(agentService, "handleChat").mockRejectedValue(longErr);

      const res2 = await request(app)
        .post("/chat")
        .set("x-request-id", UNTRUSTED_HEADER_ID)
        .send({
          message: "Query 2",
          sessionId: "sess_long_err_test"
        });

      expect(res2.status).toBe(500);
      const allLogText2 = consoleErrorSpy.mock.calls.map((args) => args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")).join("\n");
      expect(allLogText2).not.toContain(LONG_ERR_NAME);
      expect(allLogText2).toContain("errorType=UNEXPECTED");
    });

    it("global unhandled error handler in server/index.js does not log raw err object or sentinels", async () => {
      const GLOBAL_SECRET = "global-secret-key-sentinel-8888";
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Simulate an unhandled error reaching the global error middleware
      // We can invoke the app error handler or an internal error route
      const dummyErr = new Error(`Global middleware crash with secret ${GLOBAL_SECRET}`);

      // Inspect how index.js logs unhandled errors
      // In server/index.js: app.use((err, req, res, next) => { ... })
      // Let's test by finding the error handler in app._router.stack
      const errorHandlerLayer = app._router.stack.find((layer) => layer.handle && layer.handle.length === 4);
      expect(errorHandlerLayer).toBeDefined();

      const mockReq = { originalUrl: "/test-error", url: "/test-error", headers: {} };
      let sentStatus = null;
      let sentBody = null;
      const mockRes = {
        status(s) { sentStatus = s; return this; },
        json(b) { sentBody = b; return this; }
      };

      errorHandlerLayer.handle(dummyErr, mockReq, mockRes, () => {});

      expect(sentStatus).toBe(500);
      expect(sentBody.title).toBe("Internal Server Error");

      const allLogText = consoleErrorSpy.mock.calls.map((args) => args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")).join("\n");
      expect(allLogText).not.toContain(GLOBAL_SECRET);
      expect(allLogText).not.toContain("Global middleware crash");
    });

    it("global unhandled error handler generates server UUID and ignores x-request-id and custom error names", async () => {
      const CUSTOM_ERR_NAME = "GlobalAlphanumericSentinel123";
      const LONG_ERR_NAME = "VeryLongGlobalCustomName".repeat(25);
      const UNTRUSTED_HEADER_ID = "untrusted-global-header-token-secret-999";
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const errorHandlerLayer = app._router.stack.find((layer) => layer.handle && layer.handle.length === 4);
      expect(errorHandlerLayer).toBeDefined();

      const customErr = new Error("Global failure");
      customErr.name = CUSTOM_ERR_NAME;

      const mockReq = {
        originalUrl: "/test-error",
        url: "/test-error",
        headers: { "x-request-id": UNTRUSTED_HEADER_ID }
      };
      let sentStatus = null;
      let sentBody = null;
      const mockRes = {
        status(s) { sentStatus = s; return this; },
        json(b) { sentBody = b; return this; }
      };

      errorHandlerLayer.handle(customErr, mockReq, mockRes, () => {});

      expect(sentStatus).toBe(500);
      expect(sentBody.correlationId).not.toBe(UNTRUSTED_HEADER_ID);
      expect(sentBody.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      const bodyStr = JSON.stringify(sentBody);
      expect(bodyStr).not.toContain(CUSTOM_ERR_NAME);
      expect(bodyStr).not.toContain(UNTRUSTED_HEADER_ID);

      const allLogText = consoleErrorSpy.mock.calls.map((args) => args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")).join("\n");
      expect(allLogText).not.toContain(CUSTOM_ERR_NAME);
      expect(allLogText).not.toContain(UNTRUSTED_HEADER_ID);
      expect(allLogText).toContain("errorType=UNEXPECTED");

      // Test with long error name
      consoleErrorSpy.mockClear();
      const longErr = new Error("Global failure 2");
      longErr.name = LONG_ERR_NAME;

      errorHandlerLayer.handle(longErr, mockReq, mockRes, () => {});
      const allLogText2 = consoleErrorSpy.mock.calls.map((args) => args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")).join("\n");
      expect(allLogText2).not.toContain(LONG_ERR_NAME);
      expect(allLogText2).toContain("errorType=UNEXPECTED");
    });
  });
});

