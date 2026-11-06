import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "http";
import { fetchJsonBounded, UpstreamError, sanitizeUrlForLogging } from "../utils/upstream.js";

describe("Task B3: Upstream Fetch & Deadline Helper (fetchJsonBounded)", () => {
  let server = null;
  let serverUrl = "";

  afterEach(() => {
    if (server) {
      server.close();
      server = null;
    }
  });

  it("sanitizes API keys from URLs for logging and error reporting", () => {
    const rawUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini?key=AIzaSySecretKey123&other=val";
    const sanitized = sanitizeUrlForLogging(rawUrl);
    expect(sanitized).not.toContain("AIzaSySecretKey123");
    expect(sanitized).toContain("key=[REDACTED]");
  });

  it("parses valid JSON response within deadline and size limit", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result: "success", count: 42 }));
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    const data = await fetchJsonBounded(serverUrl, { method: "GET" }, {
      timeoutMs: 1000,
      providerLabel: "test-provider"
    });

    expect(data).toEqual({ result: "success", count: 42 });
  });

  it("aborts when headers arrive immediately but 200 body stalls", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      // Send partial body and stall indefinitely without closing
      res.write('{"partial":');
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    const start = Date.now();
    await expect(
      fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 150,
        providerLabel: "stalled-200"
      })
    ).rejects.toThrow(UpstreamError);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(140);
    expect(elapsed).toBeLessThan(1000);
  });

  it("aborts when headers arrive immediately but non-2xx body stalls", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.write("Error occurred: ");
      // stall
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    await expect(
      fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 150,
        providerLabel: "stalled-500"
      })
    ).rejects.toMatchObject({
      kind: "timeout"
    });
  });

  it("throws UpstreamError with kind 'http' for non-2xx completed response without leaking body secrets", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Secret internal upstream cluster error sk-secret-12345" }));
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    let caughtErr = null;
    try {
      await fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 1000,
        providerLabel: "failing-upstream"
      });
    } catch (err) {
      caughtErr = err;
    }

    expect(caughtErr).toBeInstanceOf(UpstreamError);
    expect(caughtErr.kind).toBe("http");
    expect(caughtErr.status).toBe(503);
    // Crucial: raw upstream error body containing secrets must not leak in error message
    expect(caughtErr.message).not.toContain("sk-secret-12345");
  });

  it("throws UpstreamError with kind 'parse' for malformed JSON response", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("<html><body>Bad Gateway from Cloudflare</body></html>");
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    await expect(
      fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 1000,
        providerLabel: "html-error"
      })
    ).rejects.toMatchObject({
      kind: "parse"
    });
  });

  it("aborts and throws kind 'size' when upstream response exceeds maxBytes limit (1 MiB)", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      // Stream chunks exceeding 100 bytes
      const chunk = Buffer.alloc(50, "a");
      res.write(chunk);
      res.write(chunk);
      res.write(chunk); // 150 bytes total
      res.end();
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    await expect(
      fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 1000,
        maxBytes: 100, // custom small limit for test
        providerLabel: "oversized-test"
      })
    ).rejects.toMatchObject({
      kind: "size"
    });
  });

  it("throws kind 'shape' when expected provider structure is missing or empty", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ unexpectedField: "empty content" }));
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    await expect(
      fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 1000,
        providerLabel: "shape-test",
        validateShape: (data) => typeof data.choices?.[0]?.message?.content === "string"
      })
    ).rejects.toMatchObject({
      kind: "shape"
    });
  });

  it("immediately rejects when signal is already aborted prior to call without network hit", async () => {
    let serverHit = false;
    server = http.createServer((req, res) => {
      serverHit = true;
      res.writeHead(200);
      res.end("{}");
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 1000,
        signal: controller.signal,
        providerLabel: "pre-aborted"
      })
    ).rejects.toMatchObject({
      kind: "timeout"
    });

    expect(serverHit).toBe(false);
  });

  it("propagates parent signal abort during active body read", async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write('{"data":');
      // hold open
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 80);

    await expect(
      fetchJsonBounded(serverUrl, { method: "GET" }, {
        timeoutMs: 5000,
        signal: controller.signal,
        providerLabel: "parent-abort"
      })
    ).rejects.toMatchObject({
      kind: "timeout"
    });
  });

  it("isolates independent concurrent requests with distinct controllers", async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/fast") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ speed: "fast" }));
      } else {
        // slow request stalls
        res.writeHead(200, { "Content-Type": "application/json" });
      }
    });
    await new Promise((resolve) => server.listen(0, resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}`;

    const slowPromise = fetchJsonBounded(`${serverUrl}/slow`, { method: "GET" }, {
      timeoutMs: 100,
      providerLabel: "slow-req"
    });

    const fastPromise = fetchJsonBounded(`${serverUrl}/fast`, { method: "GET" }, {
      timeoutMs: 1000,
      providerLabel: "fast-req"
    });

    const [slowResult, fastResult] = await Promise.allSettled([slowPromise, fastPromise]);

    expect(slowResult.status).toBe("rejected");
    expect(slowResult.reason.kind).toBe("timeout");

    expect(fastResult.status).toBe("fulfilled");
    expect(fastResult.value).toEqual({ speed: "fast" });
  });
});

