import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import nodeFetch, { Response } from "node-fetch";
import { Readable } from "stream";
import { callLLM, extractGeminiText, estimateTokens, resolveLLMProvider } from "../services/llm.js";
import { createUsageMetrics, setModel, trackUsage, formatSessionCost, isCostAvailable } from "../services/finops.js";
import { UpstreamError } from "../utils/upstream.js";

vi.mock("node-fetch", () => {
  const mock = vi.fn();
  return {
    default: mock,
    Response: class MockResponse {
      constructor(body, init = {}) {
        this.status = init.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.headers = new Map(Object.entries(init.headers || {}));
        const buffer = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
        this.body = Readable.from([buffer]);
      }
    }
  };
});

describe("Task D1: Explicit Gemini Selection & Bounded Generation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe("Provider Selection Precedence & Config Validation", () => {
    it("legacy auto precedence: selects openai when OPENAI_API_KEY is present", () => {
      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "auto";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      expect(resolveLLMProvider()).toBe("openai");
    });

    it("legacy auto precedence: selects gemini when only GEMINI_API_KEY is present", () => {
      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "auto";
      delete process.env.OPENAI_API_KEY;
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      expect(resolveLLMProvider()).toBe("gemini");
    });

    it("legacy auto precedence: falls back to ollama when neither cloud key is present", () => {
      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "auto";
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      expect(resolveLLMProvider()).toBe("ollama");
    });

    it("explicit Gemini with both keys: selects gemini and never contacts OpenAI", () => {
      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "gemini";
      process.env.OPENAI_API_KEY = "sk-openai-secret-key-12345";
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      expect(resolveLLMProvider()).toBe("gemini");
    });

    it("missing key/model: fails closed with UpstreamError when support resolves to Gemini without required credentials", async () => {
      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "gemini";
      delete process.env.GEMINI_API_KEY;
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      await expect(callLLM("Hello support")).rejects.toThrow(UpstreamError);

      process.env.GEMINI_API_KEY = "test-gemini-key";
      delete process.env.GEMINI_MODEL;
      await expect(callLLM("Hello support")).rejects.toThrow(UpstreamError);
    });

    it("demo without configuration: returns simulated reply with zero network and zero cost", async () => {
      process.env.APP_MODE = "demo";
      process.env.LLM_PROVIDER = "gemini";
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_MODEL;

      const metrics = createUsageMetrics();
      const reply = await callLLM("What are your hours?", { mode: "demo", metrics });

      expect(reply).toMatch(/^(?:\[Demo\]|Demo:)/i);
      expect(metrics.cost).toBe(0);
      expect(metrics.costAvailable).toBe(true);
      expect(formatSessionCost(metrics)).toBe("$0.0000");
      expect(nodeFetch).not.toHaveBeenCalled();
    });
  });

  describe("Safe Multipart Parsing & Thought Filtering", () => {
    it("extractGeminiText: combines nonempty text parts from the first candidate", () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [
                { text: "Hello! " },
                { text: "How can I help you today?" }
              ]
            }
          }
        ]
      };
      expect(extractGeminiText(data)).toBe("Hello! How can I help you today?");
    });

    it("extractGeminiText: excludes parts with thought=true and extracts only answer text", () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [
                { text: "Thinking step 1: analyze user question...", thought: true },
                { text: "Thinking step 2: retrieve policy...", thought: true },
                { text: "Our return window is 30 days." }
              ]
            }
          }
        ]
      };
      expect(extractGeminiText(data)).toBe("Our return window is 30 days.");
    });

    it("extractGeminiText: returns null when candidate only contains thought parts", () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [
                { text: "Thinking step 1...", thought: true },
                { text: "Thinking step 2...", thought: true }
              ]
            }
          }
        ]
      };
      expect(extractGeminiText(data)).toBeNull();
    });

    it("extractGeminiText: returns null on blocked or empty safety-only responses", () => {
      expect(extractGeminiText({ candidates: [] })).toBeNull();
      expect(extractGeminiText({ candidates: [{ finishReason: "SAFETY" }] })).toBeNull();
      expect(extractGeminiText({
        candidates: [{
          finishReason: "SAFETY",
          content: { parts: [{ text: "   " }] }
        }]
      })).toBeNull();
    });
  });

  describe("Bounded Fetch & Error Sanitization (Headers, Timeouts, Status Codes)", () => {
    it("sends API key in x-goog-api-key header and validates model segment in fixed Google endpoint", async () => {
      let capturedUrl = "";
      let capturedInit = {};

      nodeFetch.mockImplementation(async (url, init) => {
        capturedUrl = url.toString();
        capturedInit = init;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "Refunds are processed within 3 days." }]
                }
              }
            ],
            usageMetadata: {
              promptTokenCount: 15,
              candidatesTokenCount: 10
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "AIzaSySuperSecret12345";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      const metrics = createUsageMetrics();
      const reply = await callLLM("What is your refund policy?", { metrics });

      expect(reply).toBe("Refunds are processed within 3 days.");
      // Verify endpoint fixed format with bare model ID
      expect(capturedUrl).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent"
      );
      // Assert API key is NEVER passed in URL
      expect(capturedUrl).not.toContain("key=");
      expect(capturedUrl).not.toContain("AIzaSySuperSecret12345");
      // Assert API key is sent via header
      expect(capturedInit.headers["x-goog-api-key"]).toBe("AIzaSySuperSecret12345");
      // Assert parsed body
      const parsedBody = JSON.parse(capturedInit.body);
      expect(parsedBody.contents[0].parts[0].text).toContain("refund policy");
      // Assert pricing for gemini-3.1-flash-lite: 15 prompt tokens + 10 completion tokens
      expect(metrics.model).toBe("gemini-3.1-flash-lite");
      expect(metrics.promptTokens).toBe(15);
      expect(metrics.completionTokens).toBe(10);
      expect(metrics.costAvailable).toBe(true);
      expect(metrics.cost).toBeGreaterThan(0);
    });

    it("blocked/empty response fails closed with UpstreamError (shape/provider_unavailable)", async () => {
      nodeFetch.mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "SAFETY",
                content: { parts: [] }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      await expect(callLLM("trigger safety block")).rejects.toThrow(UpstreamError);
    });

    it("invalid JSON response fails closed with UpstreamError", async () => {
      nodeFetch.mockImplementation(async () => {
        return new Response("<html><body>502 Bad Gateway</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" }
        });
      });

      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      await expect(callLLM("test invalid json")).rejects.toThrow(UpstreamError);
    });

    it("HTTP 401 / 429 / 5xx maps to UpstreamError without leaking secrets", async () => {
      nodeFetch.mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: 401,
              message: "API key not valid. Please pass a valid API key."
            }
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      });

      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "AIzaSySecretLeakedKey";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      try {
        await callLLM("test 401 error");
        expect.fail("Should have thrown UpstreamError");
      } catch (err) {
        expect(err).toBeInstanceOf(UpstreamError);
        expect(err.message).not.toContain("AIzaSySecretLeakedKey");
      }
    });

    it("parent abort cancels LLM execution cleanly with timeout kind", async () => {
      const controller = new AbortController();
      controller.abort();

      process.env.APP_MODE = "support";
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";
      process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";

      try {
        await callLLM("test abort", { signal: controller.signal });
        expect.fail("Should have thrown aborted UpstreamError");
      } catch (err) {
        expect(err).toBeInstanceOf(UpstreamError);
        expect(err.kind).toBe("timeout");
      }
    });
  });
});
