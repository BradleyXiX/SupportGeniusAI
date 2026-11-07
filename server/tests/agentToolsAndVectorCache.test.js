import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "http";
import fs from "fs";
import * as embeddingsService from "../services/embeddings.js";
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
  getRelevantChunks,
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

describe("VectorStore Caching & Deterministic Chunk Reuse", () => {
  beforeEach(() => {
    clearStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearStore();
  });

  it("computes reproducible SHA-256 hash for document chunks", () => {
    const chunk = "Test knowledge base content for SupportGenius.";
    const hash1 = computeChunkHash(chunk);
    const hash2 = computeChunkHash(chunk);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("proves all-hit initialization loads exact expected chunks with zero embedding provider calls", async () => {
    const chunk1 = "Return policy allows 30 days for undamaged items.";
    const chunk2 = "Warranty covers manufacturing defects for 1 year.";
    const hash1 = computeChunkHash(chunk1);
    const hash2 = computeChunkHash(chunk2);
    const vector1 = [0.12, 0.34, 0.56];
    const vector2 = [0.78, 0.90, 0.12];

    const controlledCache = {
      [hash1]: vector1,
      [hash2]: vector2
    };

    // Scoped filesystem mocks: completely self-contained, no real disk access
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["doc1.txt", "doc2.md"]);
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      const p = String(filePath);
      if (p.includes("vector_cache.json")) {
        return JSON.stringify(controlledCache);
      }
      if (p.endsWith("doc1.txt")) {
        return chunk1;
      }
      if (p.endsWith("doc2.md")) {
        return chunk2;
      }
      throw new Error(`Unexpected readFileSync in all-hit test: ${p}`);
    });
    const writeFileSyncSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    // Stub getEmbedding unconditionally so any unexpected call fails and can never reach a real provider
    const embeddingStub = vi.spyOn(embeddingsService, "getEmbedding").mockImplementation(() => {
      throw new Error("Unexpected embedding provider call during all-hit initialization");
    });

    await initializeStore();

    // Verify zero provider calls and exact expected chunk count
    expect(embeddingStub).toHaveBeenCalledTimes(0);
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(0);

    const stats = getVectorStoreStats();
    expect(stats.isInitialized).toBe(true);
    expect(stats.chunksCount).toBe(2);

    embeddingStub.mockResolvedValue(null);
    const matchedReturn = await getRelevantChunks("Return policy", 1);
    expect(matchedReturn).toEqual([chunk1]);
    const matchedWarranty = await getRelevantChunks("Warranty defects", 1);
    expect(matchedWarranty).toEqual([chunk2]);
  });

  it("proves mixed hit/miss embeds ONLY the specific missing chunk, persists result, and reuses cached content", async () => {
    const cachedChunk = "Standard shipping takes 3 to 5 business days.";
    const missingChunk = "Express shipping arrives next day before noon.";
    const cachedHash = computeChunkHash(cachedChunk);
    const missingHash = computeChunkHash(missingChunk);
    const cachedVector = [0.15, 0.25, 0.35];
    const generatedVector = [0.85, 0.75, 0.65];

    // Cache only contains cachedChunk (missingChunk is a miss)
    const initialCache = {
      [cachedHash]: cachedVector
    };

    let persistedCacheData = null;

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["shipping-standard.txt", "shipping-express.txt"]);
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      const p = String(filePath);
      if (p.includes("vector_cache.json")) {
        return JSON.stringify(initialCache);
      }
      if (p.endsWith("shipping-standard.txt")) {
        return cachedChunk;
      }
      if (p.endsWith("shipping-express.txt")) {
        return missingChunk;
      }
      throw new Error(`Unexpected readFileSync in mixed hit/miss test: ${p}`);
    });
    vi.spyOn(fs, "writeFileSync").mockImplementation((filePath, data) => {
      if (String(filePath).includes("vector_cache.json")) {
        persistedCacheData = JSON.parse(data);
      }
    });

    // Stub getEmbedding: only permitted for missingChunk, fails on any other call
    const embeddingStub = vi.spyOn(embeddingsService, "getEmbedding").mockImplementation(async (text) => {
      if (text === missingChunk) {
        return generatedVector;
      }
      throw new Error(`Unexpected embedding provider call for text: ${text}`);
    });

    await initializeStore();

    // Verify ONLY the missing chunk was embedded (exactly 1 call)
    expect(embeddingStub).toHaveBeenCalledTimes(1);
    expect(embeddingStub).toHaveBeenCalledWith(missingChunk);

    // Verify stats report exact chunk count
    const stats = getVectorStoreStats();
    expect(stats.isInitialized).toBe(true);
    expect(stats.chunksCount).toBe(2);

    // Verify persistence: cached content was preserved and new embedding was added
    expect(persistedCacheData).not.toBeNull();
    expect(persistedCacheData[cachedHash]).toEqual(cachedVector); // Reused cached vector
    expect(persistedCacheData[missingHash]).toEqual(generatedVector); // Newly computed vector

    // Verify observable content retrieval
    embeddingStub.mockResolvedValue(null);
    const matchedStandard = await getRelevantChunks("Standard shipping", 1);
    expect(matchedStandard).toEqual([cachedChunk]);
    const matchedExpress = await getRelevantChunks("Express shipping", 1);
    expect(matchedExpress).toEqual([missingChunk]);
  });
});

