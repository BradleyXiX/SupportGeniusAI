import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import http from "http";
import app from "../index.js";
import { UpstreamError } from "../utils/upstream.js";

const TEST_ORIGIN = "http://localhost:3000";

describe("Task B3: Safe Upstream Errors & Chat Route Gateway Guarantees", () => {
  const originalEnv = { ...process.env };
  let mockServer = null;
  let sessionCookie;

  beforeEach(async () => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };

    const initRes = await request(app)
      .post("/session")
      .set("Origin", TEST_ORIGIN)
      .send({});
    sessionCookie = initRes.headers["set-cookie"][0];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (mockServer) {
      mockServer.close();
      mockServer = null;
    }
  });

  it("returns HTTP 504 RFC 7807 problem with PROVIDER_TIMEOUT code when upstream times out", async () => {
    // Mock loopback server that stalls forever
    mockServer = http.createServer((req, res) => {
      // Do not respond, let timeout trigger
    });
    await new Promise((resolve) => mockServer.listen(0, resolve));
    const port = mockServer.address().port;

    process.env.APP_MODE = "support";
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    process.env.OLLAMA_URL = `http://127.0.0.1:${port}`;

    // Mock callLLM to reject with UpstreamError(timeout) directly to test route mapping quickly
    const llmService = await import("../services/llm.js");
    vi.spyOn(llmService, "callLLM").mockRejectedValue(
      new UpstreamError({
        kind: "timeout",
        message: "Upstream request timed out after 20000ms",
        providerLabel: "ollama",
        durationMs: 20000
      })
    );

    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "Where is the policy?",
        sessionId: "sess_timeout_test"
      });

    expect(res.status).toBe(504);
    expect(res.body.code).toBe("PROVIDER_TIMEOUT");
    expect(res.body.title).toBe("Gateway Timeout");
    expect(res.body).toHaveProperty("correlationId");
    expect(typeof res.body.correlationId).toBe("string");
  });

  it("returns HTTP 502 RFC 7807 problem with PROVIDER_UNAVAILABLE code when upstream fails", async () => {
    const llmService = await import("../services/llm.js");
    vi.spyOn(llmService, "callLLM").mockRejectedValue(
      new UpstreamError({
        kind: "connection",
        message: "Connection to upstream provider failed",
        providerLabel: "ollama",
        durationMs: 50
      })
    );

    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "Tell me shipping details",
        sessionId: "sess_unavailable_test"
      });

    expect(res.status).toBe(502);
    expect(res.body.code).toBe("PROVIDER_UNAVAILABLE");
    expect(res.body.title).toBe("Gateway Unavailable");
    expect(res.body).toHaveProperty("correlationId");
  });

  it("never leaks upstream secret sentinels, provider URLs, or prompts in response or logs", async () => {
    const SECRET_SENTINEL = "sk-super-secret-token-sentinel-99999";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const llmService = await import("../services/llm.js");
    vi.spyOn(llmService, "callLLM").mockRejectedValue(
      new UpstreamError({
        kind: "http",
        message: `Upstream error with secret: ${SECRET_SENTINEL}`,
        providerLabel: "openai",
        status: 500,
        durationMs: 120
      })
    );

    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "Tell me your secret",
        sessionId: "sess_secret_test"
      });

    expect(res.status).toBe(502);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain(SECRET_SENTINEL);
    expect(bodyStr).not.toContain("api.openai.com");
    expect(bodyStr).not.toContain("Tell me your secret");

    // Check captured logs
    const loggedCalls = consoleErrorSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(loggedCalls).not.toContain(SECRET_SENTINEL);
    expect(loggedCalls).not.toContain("Tell me your secret");
  });

  it("maps malformed JSON request body to HTTP 400 Bad Request problem details", async () => {
    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .set("Content-Type", "application/json")
      .send("{\"message\": invalid_json_syntax");

    expect(res.status).toBe(400);
    expect(res.body.title).toBe("Bad Request");
    expect(res.body.status).toBe(400);
  });

  it("maps oversized request body (>1 MiB) to HTTP 413 Payload Too Large problem details", async () => {
    // Generate ~1.1 MiB payload
    const oversized = "X".repeat(1100000);

    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ message: oversized, sessionId: "sess_big" }));

    expect(res.status).toBe(413);
    expect(res.body.title).toBe("Payload Too Large");
    expect(res.body.status).toBe(413);
  });

  it("preserves RFC 7807 422 validation errors for empty message", async () => {
    const res = await request(app)
      .post("/chat")
      .set("Origin", TEST_ORIGIN)
      .set("Cookie", sessionCookie)
      .send({
        message: "   ",
        sessionId: "sess_valid_check"
      });

    expect(res.status).toBe(422);
    expect(res.body.title).toBe("Unprocessable Request Entity");
    expect(res.body).toHaveProperty("invalidParams");
  });
});
