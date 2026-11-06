import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "http";
import fs from "fs";
import {
  checkOrderStatus,
  updateAddress,
  bookAppointment,
  handleChat,
  clearAgentHistory,
  unavailableActionReply
} from "../services/agent.js";
import {
  initializeStore,
  clearStore,
  getVectorStoreStats,
  computeChunkHash,
  CACHE_FILE
} from "../db/vectorStore.js";

describe("Agent Tools & CLIENT_WEBHOOK_URL Integration", () => {
  let webhookServer = null;
  let receivedWebhookCalls = [];
  const PORT = 3889;
  const WEBHOOK_URL = `http://localhost:${PORT}/webhook`;

  beforeEach(() => {
    receivedWebhookCalls = [];
    clearAgentHistory();
  });

  afterEach(() => {
    delete process.env.CLIENT_WEBHOOK_URL;
    if (webhookServer) {
      webhookServer.close();
      webhookServer = null;
    }
  });

  it("checkOrderStatus fails closed and returns deterministic action refusal", async () => {
    delete process.env.CLIENT_WEBHOOK_URL;
    const res = await checkOrderStatus({ orderId: "ORD-999" });

    expect(res).toBe(unavailableActionReply());
    expect(res).not.toContain("in transit");
  });

  it("updateAddress fails closed and returns deterministic action refusal", async () => {
    delete process.env.CLIENT_WEBHOOK_URL;
    const res = await updateAddress({ address: "742 Evergreen Terrace" });

    expect(res).toBe(unavailableActionReply());
    expect(res).not.toContain("updated");
  });

  it("bookAppointment fails closed and returns deterministic action refusal without inventing IDs or SMS", async () => {
    delete process.env.CLIENT_WEBHOOK_URL;
    const res = await bookAppointment({
      name: "Sophia Martinez",
      service: "HydraFacial Deluxe",
      date: "tomorrow",
      time: "3:30 PM"
    });

    expect(res).toBe(unavailableActionReply());
    expect(res).not.toContain("confirmed");
    expect(res).not.toContain("SMS");
  });

  it("makes zero outbound requests to CLIENT_WEBHOOK_URL when configured and fails closed", async () => {
    webhookServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        receivedWebhookCalls.push(JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result: "OK" }));
      });
    });

    await new Promise((resolve) => webhookServer.listen(PORT, resolve));
    process.env.CLIENT_WEBHOOK_URL = WEBHOOK_URL;

    const orderRes = await checkOrderStatus({ orderId: "LIVE-101" });
    expect(orderRes).toBe(unavailableActionReply());

    const addrRes = await updateAddress({ address: "500 Madison Ave" });
    expect(addrRes).toBe(unavailableActionReply());

    const apptRes = await bookAppointment({ name: "Emma", service: "Botox Consultation" });
    expect(apptRes).toBe(unavailableActionReply());

    expect(receivedWebhookCalls.length).toBe(0);
  });

  it("returns deterministic action refusal without dispatching when CLIENT_WEBHOOK_URL is set", async () => {
    process.env.CLIENT_WEBHOOK_URL = WEBHOOK_URL;

    const res = await bookAppointment({ name: "Fallback Test", service: "Chemical Peel" });
    expect(res).toBe(unavailableActionReply());
    expect(res).not.toContain("confirmed");
  });
});

describe("VectorStore Caching & Sub-50ms Initialization", () => {
  beforeEach(() => {
    clearStore();
  });

  it("computes reproducible SHA-256 hash for document chunks", () => {
    const chunk = "Test knowledge base content for SupportGenius.";
    const hash1 = computeChunkHash(chunk);
    const hash2 = computeChunkHash(chunk);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("has vector_cache.json persisted and loads into memory in <50ms", async () => {
    expect(fs.existsSync(CACHE_FILE)).toBe(true);

    const start = performance.now();
    await initializeStore();
    const elapsed = performance.now() - start;

    const stats = getVectorStoreStats();
    expect(stats.isInitialized).toBe(true);
    expect(stats.chunksCount).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });
});

