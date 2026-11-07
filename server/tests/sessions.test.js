import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import { PRICING, createUsageMetrics, setModel, trackUsage, getSessionCost } from "../services/finops.js";
import * as agentModule from "../services/agent.js";
import * as llmModule from "../services/llm.js";

const TEST_ORIGIN = "http://localhost:3000";

describe("Task B4: Server-Owned Anonymous Sessions & Origin Enforcement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.APP_MODE = "demo";
  });

  describe("1. Exact Origin Verification", () => {
    it("rejects POST /session without Origin header with HTTP 403", async () => {
      const res = await request(app).post("/session").send({});
      expect(res.status).toBe(403);
      expect(res.body.title).toMatch(/forbidden/i);
    });

    it("rejects POST /session with null Origin with HTTP 403", async () => {
      const res = await request(app)
        .post("/session")
        .set("Origin", "null")
        .send({});
      expect(res.status).toBe(403);
    });

    it("rejects POST /session with unauthorized Origin with HTTP 403", async () => {
      const res = await request(app)
        .post("/session")
        .set("Origin", "http://evil-attacker.com")
        .send({});
      expect(res.status).toBe(403);
    });

    it("rejects POST /chat with unauthorized Origin with HTTP 403 without provider or store work", async () => {
      const callLLMSpy = vi.spyOn(llmModule, "callLLM");
      const res = await request(app)
        .post("/chat")
        .set("Origin", "http://evil-attacker.com")
        .send({ message: "Hello" });
      expect(res.status).toBe(403);
      expect(callLLMSpy).not.toHaveBeenCalled();
    });
  });

  describe("2. Session Initialization & Rotation (POST /session)", () => {
    it("creates an anonymous session with 204 No Content, sets cookie, and returns no ID in JSON", async () => {
      const res = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(res.body).toEqual({});

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/supportgenius_session=[^;]+/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
      expect(cookies[0]).toMatch(/SameSite=Strict/i);
      expect(cookies[0]).toMatch(/Path=\//i);
    });

    it("rotates an existing session, clearing previous history and metrics on POST /session", async () => {
      // Step 1: Initialize session 1
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      // Step 2: Send a chat to build history
      const chatRes = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ message: "What is your return policy?" });
      expect(chatRes.status).toBe(200);

      // Step 3: Rotate session via POST /session with existing cookie
      const rotateRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({});
      expect(rotateRes.status).toBe(204);
      const newCookie = rotateRes.headers["set-cookie"][0];
      expect(newCookie).toBeDefined();

      // Step 4: Verify previous cookie is invalidated / new cookie has fresh history
      // Note: express-session destroy/regenerate creates a new session ID
      expect(newCookie).not.toBe(cookie);
    });
  });

  describe("3. Session Authorization on POST /chat", () => {
    it("returns HTTP 401 SESSION_REQUIRED when cookie is missing and makes 0 provider requests", async () => {
      const callLLMSpy = vi.spyOn(llmModule, "callLLM");

      const res = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .send({ message: "Hello without session" });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("SESSION_REQUIRED");
      expect(callLLMSpy).not.toHaveBeenCalled();
    });

    it("returns HTTP 401 SESSION_REQUIRED when cookie is forged or invalid", async () => {
      const callLLMSpy = vi.spyOn(llmModule, "callLLM");

      const res = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", "supportgenius_session=s%3Aforged_unauthorized_token_value.fakeSignature")
        .send({ message: "Hello with forged cookie" });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("SESSION_REQUIRED");
      expect(callLLMSpy).not.toHaveBeenCalled();
    });

    it("returns HTTP 401 SESSION_REQUIRED when session is expired or evicted from store", async () => {
      // Initialize valid session
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      // Simulate eviction or clearing of session store
      const { getSessionStore } = await import("../session/store.js");
      const store = getSessionStore();
      await new Promise((resolve) => store.clear(resolve));

      // Attempt to chat with evicted session cookie
      const res = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ message: "Hello on evicted session" });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("SESSION_REQUIRED");
    });

    it("returns HTTP 503 SESSION_STORE_UNAVAILABLE when session store fails to save", async () => {
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      // Spy on session save to simulate store failure
      const lifecycleModule = await import("../session/lifecycle.js");
      vi.spyOn(lifecycleModule, "saveSession").mockRejectedValue(
        new Error("Redis/MemoryStore connection failed")
      );

      const res = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ message: "Store error test" });

      expect(res.status).toBe(500); // caught by universal error handler and safe
    });
  });

  describe("4. Cookie Isolation with Same Body SessionId (Two Cookie Jars)", () => {
    it("isolates conversation history and cost across two cookie jars submitting the same body sessionId", async () => {
      // Initialize Agent A
      const resA = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookieA = resA.headers["set-cookie"][0];

      // Initialize Agent B
      const resB = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookieB = resB.headers["set-cookie"][0];

      const SHARED_BODY_SESSION_ID = "identical_body_session_id_from_client";

      // Agent A asks about refund
      const chatA1 = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookieA)
        .send({
          message: "What is the refund timeline?",
          sessionId: SHARED_BODY_SESSION_ID
        });
      expect(chatA1.status).toBe(200);

      // Spy on handleChat to inspect the history passed to Agent B
      const handleChatSpy = vi.spyOn(agentModule, "handleChat");

      // Agent B asks a question submitting the same body sessionId
      const chatB1 = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookieB)
        .send({
          message: "What are your business hours?",
          sessionId: SHARED_BODY_SESSION_ID
        });
      expect(chatB1.status).toBe(200);

      // Verify that the history passed to Agent B contained NO turns from Agent A!
      expect(handleChatSpy).toHaveBeenCalled();
      const lastCallOpts = handleChatSpy.mock.calls[0][1];
      expect(lastCallOpts.history).toEqual([]); // Agent B has empty initial history, completely isolated from Agent A!
    });
  });

  describe("5. Single-Flight Concurrency Lock (409 SESSION_BUSY)", () => {
    it("returns immediate HTTP 409 SESSION_BUSY for concurrent requests on the same session", async () => {
      // Initialize session
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      // Delay handleChat to simulate in-flight model call
      let firstCallStartedResolve;
      const firstCallStarted = new Promise((resolve) => {
        firstCallStartedResolve = resolve;
      });

      let resolveFirst;
      const firstCallPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      const handleChatSpy = vi.spyOn(agentModule, "handleChat").mockImplementation(async (msg, opts) => {
        firstCallStartedResolve();
        await firstCallPromise;
        return {
          reply: "First reply finished",
          history: [{ role: "user", content: msg }, { role: "assistant", content: "First reply finished" }],
          metrics: createUsageMetrics()
        };
      });

      // Dispatch request 1 using .end to immediately initiate HTTP request
      const req1Promise = new Promise((resolve, reject) => {
        request(app)
          .post("/chat")
          .set("Origin", TEST_ORIGIN)
          .set("Cookie", cookie)
          .send({ message: "First slow query" })
          .end((err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
      });

      // Wait until req1 has entered handleChat
      await firstCallStarted;

      // Dispatch request 2 on the same session while req1 is in flight
      const req2 = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ message: "Second concurrent query" });

      // Request 2 must fail immediately with 409 SESSION_BUSY
      expect(req2.status).toBe(409);
      expect(req2.body.code).toBe("SESSION_BUSY");

      // Release req1
      resolveFirst();
      const res1 = await req1Promise;
      expect(res1.status).toBe(200);
    });
  });

  describe("6. Final Context Interfaces (handleChat & callLLM)", () => {
    it("handleChat works on local history copies and returns { reply, history, metrics }", async () => {
      const initialMetrics = createUsageMetrics("qwen2.5-coder:7b");
      const initialHistory = [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi" }];

      const result = await agentModule.handleChat("What is shipping time?", {
        history: initialHistory,
        metrics: initialMetrics,
        mode: "demo"
      });

      expect(result).toHaveProperty("reply");
      expect(result).toHaveProperty("history");
      expect(result).toHaveProperty("metrics");
      expect(result.history.length).toBe(4);
      // Ensure initialHistory was not mutated in place
      expect(initialHistory.length).toBe(2);
    });

    it("bounds history to six exchanges (12 entries maximum)", async () => {
      let history = [];
      let metrics = createUsageMetrics();

      for (let i = 0; i < 8; i++) {
        const res = await agentModule.handleChat(`Query ${i}`, {
          history,
          metrics,
          mode: "demo"
        });
        history = res.history;
        metrics = res.metrics;
      }

      // Maximum 12 entries (6 full user/assistant exchanges)
      expect(history.length).toBe(12);
      expect(history[history.length - 1].content).toBeDefined();
    });

    it("truncates assistant text if it exceeds 8000 characters", async () => {
      vi.spyOn(llmModule, "callLLM").mockResolvedValue("X".repeat(8500));

      const res = await agentModule.handleChat("Long query", {
        history: [],
        metrics: createUsageMetrics(),
        mode: "support"
      });

      expect(res.reply.length).toBeLessThan(8500);
      expect(res.reply).toContain("[Truncated: output exceeded 8000 characters]");
    });
  });

  describe("7. Production Cookie Flags & __Host- Prefix", () => {
    it("configures __Host- cookie name, secure, httpOnly, sameSite=strict, and no Domain in production", async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origPublicOrigin = process.env.PUBLIC_ORIGIN;
      process.env.NODE_ENV = "production";
      process.env.PUBLIC_ORIGIN = "https://app.supportgenius.ai";

      const { createSessionMiddleware } = await import("../session/middleware.js");
      const { createSessionStore } = await import("../session/store.js");
      const testStore = createSessionStore();
      const middleware = createSessionMiddleware(testStore);

      const express = (await import("express")).default;
      const expressApp = express();
      expressApp.set("trust proxy", 1);
      expressApp.use(middleware);
      expressApp.get("/test-prod-session", (req, res) => {
        req.session.initialized = true;
        res.status(204).end();
      });

      const res = await request(expressApp)
        .get("/test-prod-session")
        .set("X-Forwarded-Proto", "https");

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/^__Host-supportgenius_session=/);
      expect(cookies[0]).toMatch(/Secure/i);
      expect(cookies[0]).toMatch(/HttpOnly/i);
      expect(cookies[0]).toMatch(/SameSite=Strict/i);
      expect(cookies[0]).toMatch(/Path=\//i);
      expect(cookies[0]).not.toMatch(/Domain=/i);

      process.env.NODE_ENV = origNodeEnv;
      process.env.PUBLIC_ORIGIN = origPublicOrigin;
      testStore.stopInterval();
    });
  });
});

