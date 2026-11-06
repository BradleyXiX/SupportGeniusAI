import fetch from "node-fetch";

/**
 * Sanitizes URLs to prevent credentials, tokens, or query keys from appearing in logs or error messages.
 */
export function sanitizeUrlForLogging(url = "") {
  if (typeof url !== "string") return "";
  return url.replace(/([?&](?:key|api_key|token|secret)=)[^&]+/gi, "$1[REDACTED]");
}

/**
 * Structured Upstream Error
 * Encapsulates safe classification without exposing raw URLs, secrets, or response bodies.
 */
export class UpstreamError extends Error {
  constructor({
    kind = "connection",
    message = "Upstream provider error",
    providerLabel = "upstream",
    status = null,
    durationMs = 0
  }) {
    super(message);
    this.name = "UpstreamError";
    this.kind = kind; // 'timeout' | 'connection' | 'http' | 'parse' | 'size' | 'shape'
    this.providerLabel = providerLabel;
    this.status = status;
    this.durationMs = durationMs;
  }
}

/**
 * Executes an HTTP fetch and reads/parses JSON under strict deadline and payload bounds.
 * Deadline covers both headers arrival AND full body stream reading/parsing.
 *
 * @param {string} url - Target upstream URL
 * @param {object} fetchOptions - Options passed to node-fetch
 * @param {object} config - Deadline, signal, provider label, and size limits
 * @returns {Promise<unknown>} Parsed JSON response
 */
export async function fetchJsonBounded(
  url,
  fetchOptions = {},
  {
    timeoutMs = 20000,
    signal = null,
    providerLabel = "upstream",
    maxBytes = 1048576, // 1 MiB default
    validateShape = null
  } = {}
) {
  const startTime = Date.now();

  // If caller signal was already aborted, fail immediately without network call
  if (signal?.aborted) {
    throw new UpstreamError({
      kind: "timeout",
      message: "Upstream request aborted prior to dispatch",
      providerLabel,
      durationMs: 0
    });
  }

  const controller = new AbortController();
  let timedOut = false;
  let parentAborted = false;

  const onParentAbort = () => {
    parentAborted = true;
    controller.abort();
  };

  if (signal) {
    signal.addEventListener("abort", onParentAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let res;
    try {
      res = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
    } catch (fetchErr) {
      const durationMs = Date.now() - startTime;
      if (timedOut || parentAborted || controller.signal.aborted) {
        throw new UpstreamError({
          kind: "timeout",
          message: `Upstream request timed out after ${durationMs}ms`,
          providerLabel,
          durationMs
        });
      }
      throw new UpstreamError({
        kind: "connection",
        message: `Connection to upstream provider failed: ${fetchErr.code || fetchErr.message}`,
        providerLabel,
        durationMs
      });
    }

    // Stream and buffer the body up to maxBytes under the same active deadline timer
    let bytesRead = 0;
    const chunks = [];

    try {
      for await (const chunk of res.body) {
        bytesRead += chunk.length;
        if (bytesRead > maxBytes) {
          controller.abort();
          throw new UpstreamError({
            kind: "size",
            message: `Upstream response body exceeded limit of ${maxBytes} bytes`,
            providerLabel,
            status: res.status,
            durationMs: Date.now() - startTime
          });
        }
        chunks.push(chunk);
      }
    } catch (readErr) {
      const durationMs = Date.now() - startTime;
      if (readErr instanceof UpstreamError) throw readErr;
      if (timedOut || parentAborted || controller.signal.aborted) {
        throw new UpstreamError({
          kind: "timeout",
          message: `Upstream request timed out during body read after ${durationMs}ms`,
          providerLabel,
          status: res.status,
          durationMs
        });
      }
      throw new UpstreamError({
        kind: "connection",
        message: `Failed reading upstream response body: ${readErr.message}`,
        providerLabel,
        status: res.status,
        durationMs
      });
    }

    const durationMs = Date.now() - startTime;
    const text = Buffer.concat(chunks).toString("utf-8");

    // Check HTTP status code
    if (!res.ok) {
      throw new UpstreamError({
        kind: "http",
        message: `Upstream provider returned HTTP status ${res.status}`,
        providerLabel,
        status: res.status,
        durationMs
      });
    }

    // Parse JSON safely
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new UpstreamError({
        kind: "parse",
        message: "Upstream response was not valid JSON",
        providerLabel,
        status: res.status,
        durationMs
      });
    }

    // Validate structure if validator is supplied
    if (typeof validateShape === "function" && !validateShape(data)) {
      throw new UpstreamError({
        kind: "shape",
        message: "Upstream response shape was empty or invalid",
        providerLabel,
        status: res.status,
        durationMs
      });
    }

    return data;
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener("abort", onParentAbort);
    }
  }
}

