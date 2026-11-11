import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  initializeStore,
  getRelevantChunks,
  clearStore,
  getVectorStoreStats,
  CACHE_FILE
} from "../db/vectorStore.js";
import * as embeddingModule from "../services/embeddings.js";
import { handleChat } from "../services/agent.js";
import { UpstreamError } from "../utils/upstream.js";
import nodeFetch, { Response } from "node-fetch";

vi.mock("node-fetch", () => {
  const mock = vi.fn();
  return {
    default: mock,
    Response: class MockResponse {
      constructor(body, init = {}) {
        this.status = init.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.headers = new Map(Object.entries(init.headers || {}));
        const { Readable } = require("stream");
        const buffer = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
        this.body = Readable.from([buffer]);
      }
    }
  };
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "../data/docs");

describe("Task D2: Explicit Keyword Retrieval Mode (RETRIEVAL_MODE=keyword)", () => {
  const originalEnv = { ...process.env };
  let embeddingSpy;

  beforeEach(() => {
    clearStore();
    process.env = { ...originalEnv };
    embeddingSpy = vi.spyOn(embeddingModule, "getEmbedding");
  });

  afterEach(() => {
    clearStore();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("keyword startup: loads local chunks without reading/writing cache or calling getEmbedding", async () => {
    process.env.APP_MODE = "support";
    process.env.RETRIEVAL_MODE = "keyword";
    process.env.OPENAI_API_KEY = "sk-mock-key-that-must-not-be-used";
    process.env.OLLAMA_URL = "http://127.0.0.1:54321";

    const cacheReadSpy = vi.spyOn(fs, "readFileSync");
    const cacheWriteSpy = vi.spyOn(fs, "writeFileSync");

    await initializeStore();

    const stats = getVectorStoreStats();
    expect(stats.isInitialized).toBe(true);
    expect(stats.chunksCount).toBeGreaterThan(0);

    // Assert getEmbedding was NEVER called
    expect(embeddingSpy).toHaveBeenCalledTimes(0);

    // Assert vector_cache.json was not read or written
    const cacheReadCalls = cacheReadSpy.mock.calls.filter(([p]) =>
      typeof p === "string" && p.includes("vector_cache.json")
    );
    const cacheWriteCalls = cacheWriteSpy.mock.calls.filter(([p]) =>
      typeof p === "string" && p.includes("vector_cache.json")
    );
    expect(cacheReadCalls.length).toBe(0);
    expect(cacheWriteCalls.length).toBe(0);
  });

  it("stale or malformed cache: keyword initialization succeeds without reading or failing on corrupt cache", async () => {
    process.env.RETRIEVAL_MODE = "keyword";

    // Spy on fs.readFileSync to throw on cache read
    const originalRead = fs.readFileSync;
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath, encoding) => {
      if (typeof filePath === "string" && filePath.includes("vector_cache.json")) {
        throw new Error("CORRUPT_OR_MALFORMED_CACHE_JSON");
      }
      return originalRead(filePath, encoding);
    });

    await initializeStore();

    const stats = getVectorStoreStats();
    expect(stats.isInitialized).toBe(true);
    expect(stats.chunksCount).toBeGreaterThan(0);
    expect(embeddingSpy).toHaveBeenCalledTimes(0);
  });

  it("deterministic keyword ranking: queries return exact relevant chunks without getEmbedding calls", async () => {
    process.env.RETRIEVAL_MODE = "keyword";
    process.env.OPENAI_API_KEY = "sk-must-not-call-openai";

    await initializeStore();
    embeddingSpy.mockClear();

    const chunks = await getRelevantChunks("What is the return and refund policy?", 2);

    expect(chunks.length).toBe(2);
    // Highest ranked chunk must contain refund/return keywords
    expect(chunks[0].toLowerCase()).toMatch(/(?:return|refund|policy)/);
    // Assert zero calls to embedding provider during query
    expect(embeddingSpy).toHaveBeenCalledTimes(0);
  });

  it("parent cancellation: aborted signal throws UpstreamError with kind=timeout", async () => {
    process.env.RETRIEVAL_MODE = "keyword";
    await initializeStore();

    const controller = new AbortController();
    controller.abort();

    try {
      await getRelevantChunks("return policy", 3, { signal: controller.signal });
      expect.fail("Should have thrown UpstreamError on aborted signal");
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamError);
      expect(err.kind).toBe("timeout");
    }
  });

  it("empty docs handling: returns empty results when vector store has no chunks", async () => {
    process.env.RETRIEVAL_MODE = "keyword";
    clearStore();

    const results = await getRelevantChunks("anything", 3);
    expect(results).toEqual([]);
    expect(embeddingSpy).toHaveBeenCalledTimes(0);
  });

  it("support + Gemini + keyword end-to-end: requires no OpenAI key or running Ollama instance", async () => {
    process.env.APP_MODE = "support";
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";
    process.env.RETRIEVAL_MODE = "keyword";
    delete process.env.OPENAI_API_KEY;
    process.env.OLLAMA_URL = "http://127.0.0.1:54321"; // Intentionally unreachable loopback port

    // Mock Gemini response
    nodeFetch.mockImplementation(async (url) => {
      if (url.toString().includes("generativelanguage.googleapis.com")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "You can return items within 14 days in original packaging." }]
                }
              }
            ],
            usageMetadata: {
              promptTokenCount: 25,
              candidatesTokenCount: 15
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected network call to ${url}`);
    });

    await initializeStore();
    embeddingSpy.mockClear();

    const { reply } = await handleChat("How many days do I have to return an item?");

    expect(reply).toBe("You can return items within 14 days in original packaging.");
    expect(reply).not.toContain("Automated actions are unavailable");
    // Embedding service was NEVER contacted
    expect(embeddingSpy).toHaveBeenCalledTimes(0);
  });

  it("vector mode preservation: default vector mode still reads cache and retains vector contract", async () => {
    delete process.env.RETRIEVAL_MODE; // Default to vector

    const cacheReadSpy = vi.spyOn(fs, "readFileSync");
    await initializeStore();

    const cacheReadCalls = cacheReadSpy.mock.calls.filter(([p]) =>
      typeof p === "string" && p.includes("vector_cache.json")
    );
    // In vector mode, cache file IS read
    expect(cacheReadCalls.length).toBeGreaterThan(0);
  });
});
