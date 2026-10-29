import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "http";
import fs from "fs";
import {
  checkOrderStatus,
  updateAddress,
  bookAppointment,
  handleChat,
  clearAgentHistory
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

  it("checkOrderStatus falls back to demo data when CLIENT_WEBHOOK_URL is not set", async () => {
    delete process.env.CLIENT_WEBHOOK_URL;
    const res = await checkOrderStatus({ orderId: "ORD-999" });

    expect(res).toContain("ORD-999");
    expect(res).toContain("in transit");
  });

  it("updateAddress falls back to demo data when CLIENT_WEBHOOK_URL is not set", async () => {
    delete process.env.CLIENT_WEBHOOK_URL;
    const res = await updateAddress({ address: "742 Evergreen Terrace" });

    expect(res).toContain("742 Evergreen Terrace");
    expect(res).toContain("updated");
  });

  it("bookAppointment generates confirmed clinic/medspa demo data when CLIENT_WEBHOOK_URL is not set", async () => {
    delete process.env.CLIENT_WEBHOOK_URL;
    const res = await bookAppointment({
      name: "Sophia Martinez",
      service: "HydraFacial Deluxe",
      date: "tomorrow",
      time: "3:30 PM"
    });

    expect(res).toContain("Sophia Martinez");
    expect(res).toContain("HydraFacial Deluxe");
    expect(res).toContain("tomorrow");
    expect(res).toContain("3:30 PM");
    expect(res).toContain("confirmed");
  });

  it("dispatches checkOrderStatus, updateAddress, and bookAppointment to CLIENT_WEBHOOK_URL when configured", async () => {
    webhookServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const payload = JSON.parse(body);
        receivedWebhookCalls.push(payload);

        res.writeHead(200, { "Content-Type": "application/json" });
        if (payload.action === "checkOrderStatus") {
          res.end(JSON.stringify({ result: `Custom CRM: Order ${payload.params.orderId} dispatched via FedEx express.` }));
        } else if (payload.action === "updateAddress") {
          res.end(JSON.stringify({ result: `Custom CRM: Address updated in Salesforce to ${payload.params.address}.` }));
        } else if (payload.action === "bookAppointment") {
          res.end(JSON.stringify({ result: `Clinic EHR: Appointment booked with Dr. Smith for ${payload.params.service}.` }));
        } else {
          res.end(JSON.stringify({ result: "OK" }));
        }
      });
    });

    await new Promise((resolve) => webhookServer.listen(PORT, resolve));
    process.env.CLIENT_WEBHOOK_URL = WEBHOOK_URL;

    // 1. checkOrderStatus
    const orderRes = await checkOrderStatus({ orderId: "LIVE-101" });
    expect(orderRes).toBe("Custom CRM: Order LIVE-101 dispatched via FedEx express.");

    // 2. updateAddress
    const addrRes = await updateAddress({ address: "500 Madison Ave" });
    expect(addrRes).toBe("Custom CRM: Address updated in Salesforce to 500 Madison Ave.");

    // 3. bookAppointment
    const apptRes = await bookAppointment({ name: "Emma", service: "Botox Consultation" });
    expect(apptRes).toBe("Clinic EHR: Appointment booked with Dr. Smith for Botox Consultation.");

    expect(receivedWebhookCalls.length).toBe(3);
    expect(receivedWebhookCalls[0].action).toBe("checkOrderStatus");
    expect(receivedWebhookCalls[1].action).toBe("updateAddress");
    expect(receivedWebhookCalls[2].action).toBe("bookAppointment");
  });

  it("falls back to demo data if CLIENT_WEBHOOK_URL returns HTTP error or fails", async () => {
    webhookServer = http.createServer((req, res) => {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Webhook Error");
    });

    await new Promise((resolve) => webhookServer.listen(PORT, resolve));
    process.env.CLIENT_WEBHOOK_URL = WEBHOOK_URL;

    const res = await bookAppointment({ name: "Fallback Test", service: "Chemical Peel" });
    expect(res).toContain("Fallback Test");
    expect(res).toContain("Chemical Peel");
    expect(res).toContain("confirmed");
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

