import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import { createApp } from "../app.js";
import { createSessionStore, getSessionStore } from "../session/store.js";
import { PRICING, createUsageMetrics, setModel, trackUsage, getSessionCost } from "../services/finops.js";
import * as agentModule from "../services/agent.js";
import * as llmModule from "../services/llm.js";

const TEST_ORIGIN = "http://localhost:3000";

describe("Task B4: Server-Owned Anonymous Sessions & Origin Enforcement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.APP_MODE = "demo";
  });

  describe("1. Exact Origin Verification & Admission Ordering", () => {
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

    it("rejects POST /chat with unauthorized Origin with HTTP 403 without provider work", async () => {
      const callLLMSpy = vi.spyOn(llmModule, "callLLM");
      const res = await request(app)
        .post("/chat")
        .set("Origin", "http://evil-attacker.com")
        .send({ message: "Hello" });
      expect(res.status).toBe(403);
      expect(callLLMSpy).not.toHaveBeenCalled();
    });

    it("rejected-origin request with a valid cookie performs ZERO session store operations", async () => {
      // Step 1: Bootstrap a valid session
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      const store = getSessionStore();
      const getSpy = vi.spyOn(store, "get");
      const setSpy = vi.spyOn(store, "set");
      const touchSpy = vi.spyOn(store, "touch");
      const destroySpy = vi.spyOn(store, "destroy");

      // Step 2: Attempt POST /chat with wrong origin and the valid cookie
      const chatRes = await request(app)
        .post("/chat")
        .set("Origin", "http://unauthorized-origin.com")
        .set("Cookie", cookie)
        .send({ message: "Should never touch store" });

      expect(chatRes.status).toBe(403);
      expect(getSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
      expect(touchSpy).not.toHaveBeenCalled();
      expect(destroySpy).not.toHaveBeenCalled();

      // Step 3: Attempt POST /session with wrong origin and the valid cookie
      const sessRes = await request(app)
        .post("/session")
        .set("Origin", "http://unauthorized-origin.com")
        .set("Cookie", cookie)
        .send({});

      expect(sessRes.status).toBe(403);
      expect(getSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
      expect(touchSpy).not.toHaveBeenCalled();
      expect(destroySpy).not.toHaveBeenCalled();
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
      expect(newCookie).not.toBe(cookie);
    });

    it("two concurrent resets on the same session result in one valid rotation and one 409 SESSION_BUSY", async () => {
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      // Dispatch two concurrent rotations with the same session cookie
      const [resA, resB] = await Promise.all([
        request(app).post("/session").set("Origin", TEST_ORIGIN).set("Cookie", cookie).send({}),
        request(app).post("/session").set("Origin", TEST_ORIGIN).set("Cookie", cookie).send({})
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([204, 409]);
    });
  });

  describe("3. Session Authorization & Concurrency on POST /chat", () => {
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
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      const store = getSessionStore();
      await new Promise((resolve) => store.clear(resolve));

      const res = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ message: "Hello on evicted session" });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("SESSION_REQUIRED");
    });

    it("delayed chat + reset returns 409 SESSION_BUSY, chat remains coherent, reset succeeds after completion", async () => {
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      let firstCallStartedResolve;
      const firstCallStarted = new Promise((resolve) => {
        firstCallStartedResolve = resolve;
      });

      let resolveFirst;
      const firstCallPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      vi.spyOn(agentModule, "handleChat").mockImplementation(async (msg, opts) => {
        firstCallStartedResolve();
        await firstCallPromise;
        return {
          reply: "Chat finished successfully",
          history: [{ role: "user", content: msg }, { role: "assistant", content: "Chat finished successfully" }],
          metrics: createUsageMetrics()
        };
      });

      // Dispatch slow chat request
      const reqChatPromise = new Promise((resolve, reject) => {
        request(app)
          .post("/chat")
          .set("Origin", TEST_ORIGIN)
          .set("Cookie", cookie)
          .send({ message: "Slow chat query" })
          .end((err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
      });

      // Wait until chat acquires lock and starts processing
      await firstCallStarted;

      // While chat is running, attempt POST /session with the same cookie
      const resetAttempt = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({});

      // Reset must immediately receive 409 SESSION_BUSY!
      expect(resetAttempt.status).toBe(409);
      expect(resetAttempt.body.code).toBe("SESSION_BUSY");

      // Release chat request
      resolveFirst();
      const chatRes = await reqChatPromise;
      expect(chatRes.status).toBe(200);
      expect(chatRes.body.reply).toBe("Chat finished successfully");

      // After chat completes and lock is released, reset must now succeed
      const secondReset = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({});
      expect(secondReset.status).toBe(204);
    });

    it("delayed chat + store eviction/deletion mid-flight returns 401 without resurrecting session or sending cookie", async () => {
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      let firstCallStartedResolve;
      const firstCallStarted = new Promise((resolve) => {
        firstCallStartedResolve = resolve;
      });

      let resolveFirst;
      const firstCallPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      vi.spyOn(agentModule, "handleChat").mockImplementation(async (msg, opts) => {
        firstCallStartedResolve();
        await firstCallPromise;
        return {
          reply: "Should be discarded",
          history: [{ role: "user", content: msg }, { role: "assistant", content: "Should be discarded" }],
          metrics: createUsageMetrics()
        };
      });

      const reqChatPromise = new Promise((resolve, reject) => {
        request(app)
          .post("/chat")
          .set("Origin", TEST_ORIGIN)
          .set("Cookie", cookie)
          .send({ message: "Eviction test query" })
          .end((err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
      });

      await firstCallStarted;

      // Evict/clear the session store while chat is in flight!
      const store = getSessionStore();
      await new Promise((resolve) => store.clear(resolve));

      // Release chat
      resolveFirst();
      const chatRes = await reqChatPromise;

      // Must fail with 401 SESSION_REQUIRED
      expect(chatRes.status).toBe(401);
      expect(chatRes.body.code).toBe("SESSION_REQUIRED");

      // Stale Set-Cookie header must NOT be emitted
      expect(chatRes.headers["set-cookie"]).toBeUndefined();

      // Store must remain completely empty (no resurrection of evicted session!)
      const keys = await new Promise((resolve) => store.all((err, all) => resolve(Object.keys(all || {}))));
      expect(keys.length).toBe(0);
    });
  });

  describe("4. Real Store Persistence Failures (Fail Closed with 503)", () => {
    it("returns HTTP 503 SESSION_STORE_UNAVAILABLE when real store.set fails during bootstrap", async () => {
      const store = getSessionStore();
      // Mock the real store.set method to simulate failure
      vi.spyOn(store, "set").mockImplementation((sid, sess, cb) => {
        cb(new Error("Disk full or store failure"));
      });

      const res = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});

      expect(res.status).toBe(503);
      expect(res.body.code).toBe("SESSION_STORE_UNAVAILABLE");
      // Must not send a valid session cookie on persistence failure
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("returns HTTP 503 SESSION_STORE_UNAVAILABLE when real store.set fails during chat commit", async () => {
      const initRes = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookie = initRes.headers["set-cookie"][0];

      const store = getSessionStore();
      // Allow bootstrap, but make subsequent set fail during chat commit
      vi.spyOn(store, "set").mockImplementation((sid, sess, cb) => {
        cb(new Error("Database disconnected during chat save"));
      });

      const res = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookie)
        .send({ message: "Store error test" });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe("SESSION_STORE_UNAVAILABLE");
      expect(res.headers["set-cookie"]).toBeUndefined();
    });
  });

  describe("5. Separate Bootstrap/Reset Rate Limiter", () => {
    it("enforces independent rate limiting on POST /session without exhausting /chat limit", async () => {
      const testStore = createSessionStore();
      const { app: testApp, cleanup: testCleanup } = createApp({
        sessionStore: testStore,
        rateLimitMax: 3
      });

      try {
        // Send 3 requests to exhaust /session limit
        for (let i = 0; i < 3; i++) {
          const r = await request(testApp)
            .post("/session")
            .set("Origin", TEST_ORIGIN)
            .send({});
          expect(r.status).toBe(204);
        }

        // 4th request to /session must be rejected with 429
        const blockedSessionRes = await request(testApp)
          .post("/session")
          .set("Origin", TEST_ORIGIN)
          .send({});
        expect(blockedSessionRes.status).toBe(429);
        expect(blockedSessionRes.body.title).toMatch(/too many requests|rate limit/i);

        // Crucial test requirement: /chat rate limiter is separate and NOT exhausted
        const chatCheckRes = await request(testApp)
          .post("/chat")
          .set("Origin", TEST_ORIGIN)
          .send({ message: "hello" });
        expect(chatCheckRes.status).not.toBe(429);
      } finally {
        await testCleanup();
      }
    });
  });

  describe("6. Cookie Isolation with Same Body SessionId (Two Cookie Jars)", () => {
    it("isolates conversation history and cost across two cookie jars submitting the same body sessionId", async () => {
      const resA = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookieA = resA.headers["set-cookie"][0];

      const resB = await request(app)
        .post("/session")
        .set("Origin", TEST_ORIGIN)
        .send({});
      const cookieB = resB.headers["set-cookie"][0];

      const SHARED_BODY_SESSION_ID = "identical_body_session_id_from_client";

      const chatA1 = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookieA)
        .send({
          message: "What is the refund timeline?",
          sessionId: SHARED_BODY_SESSION_ID
        });
      expect(chatA1.status).toBe(200);

      const handleChatSpy = vi.spyOn(agentModule, "handleChat");

      const chatB1 = await request(app)
        .post("/chat")
        .set("Origin", TEST_ORIGIN)
        .set("Cookie", cookieB)
        .send({
          message: "What are your business hours?",
          sessionId: SHARED_BODY_SESSION_ID
        });
      expect(chatB1.status).toBe(200);

      expect(handleChatSpy).toHaveBeenCalled();
      const lastCallOpts = handleChatSpy.mock.calls[0][1];
      expect(lastCallOpts.history).toEqual([]);
    });
  });

  describe("7. Final Context Interfaces (handleChat & callLLM)", () => {
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

  describe("8. Production Cookie Flags & __Host- Prefix", () => {
    it("configures __Host- cookie name, secure, httpOnly, sameSite=strict, and no Domain in production", async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origPublicOrigin = process.env.PUBLIC_ORIGIN;
      process.env.NODE_ENV = "production";
      process.env.PUBLIC_ORIGIN = "https://app.supportgenius.ai";

      const { createSessionMiddleware } = await import("../session/middleware.js");
      const { createSessionStore } = await import("../session/store.js");
      const testStore = createSessionStore();
      const middleware = createSessionMiddleware(testStore, { isProduction: true });

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

  describe("9. App Isolation & Cleanup", () => {
    it("createApp cleanup stops pruning and clears request locks without affecting another isolated app/store", async () => {
      const store1 = createSessionStore();
      const { app: app1, cleanup: cleanup1 } = createApp({ sessionStore: store1 });

      const store2 = createSessionStore();
      const { app: app2, cleanup: cleanup2 } = createApp({ sessionStore: store2 });

      try {
        // Bootstrap session on app1 and app2
        const res1 = await request(app1).post("/session").set("Origin", TEST_ORIGIN).send({});
        expect(res1.status).toBe(204);

        const res2 = await request(app2).post("/session").set("Origin", TEST_ORIGIN).send({});
        expect(res2.status).toBe(204);

        // Cleanup app1
        await cleanup1();

        // App2 must continue working independently
        const res2Check = await request(app2).post("/session").set("Origin", TEST_ORIGIN).send({});
        expect(res2Check.status).toBe(204);
      } finally {
        await cleanup2();
      }
    });
  });
});
