# Task B3 Receipt — Safe Bounded Upstream Requests & Errors (Corrected)

- **Task**: B3 — Bounded provider requests and safe errors (reviewed and corrected)
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **Prior HEAD**: `b0aa6b5` / `daff29b`
- **Correction HEAD**: `5efdec4`
- **Status**: Implemented shared deadline- and size-bounded upstream fetch helper (`fetchJsonBounded`), signal propagation through retrieval/generation, safe error classification (502 `PROVIDER_UNAVAILABLE` / 504 `PROVIDER_TIMEOUT`), body-parser error mapping (400 / 413), and completed review corrections for model text validation, finite embedding vectors, and unexpected-error log sanitization.

## Review Corrections Applied
1. **Nonempty Model Text Validation**:
   - `server/services/llm.js`: Added `isNonEmptyText` validator enforcing trimmed nonempty text across OpenAI, Gemini, and Ollama responses. Null, missing, wrong-type, empty, and whitespace-only content are rejected as `UpstreamError(kind='shape')`, mapping to 502 `PROVIDER_UNAVAILABLE`. Invalid replies do not enter conversation history or token usage.
2. **Valid Finite Embedding Vectors**:
   - `server/services/embeddings.js`: Added `isValidEmbeddingVector` validator requiring a nonempty array consisting entirely of finite numbers (`Number.isFinite`). Null, missing, non-array, empty array `[]`, nonnumeric, NaN, or Infinity entries are treated as `kind='shape'`, cleanly falling back to keyword search for provider failures while propagating parent aborts immediately without further fallback.
3. **Unexpected-Error Log Sanitization & Sentinel Leak Prevention**:
   - `server/routes/chat.js`: Replaced raw `err.message` logging on unexpected exceptions with bounded metadata: `[UNHANDLED_CHAT_ERROR] id=${correlationId} errorType=${safeErrorName}`. Returns RFC 7807 500 without leaking exception messages.
   - `server/index.js`: Replaced raw error object logging (`console.error("Unhandled error intercepted:", err)`) with bounded metadata: `[UNHANDLED_EXCEPTION] id=${correlationId} errorType=${safeErrorName}`. Tested with sentinel values to guarantee zero leak of URLs, tokens, passwords, or query payloads in logs or responses.

## Changed Files
- `server/utils/upstream.js`: `fetchJsonBounded`, `UpstreamError`, and `sanitizeUrlForLogging`. Enforces 1 MiB body limit, request-local abort controllers, timer cleanup, and safe error classification.
- `server/utils/problemDetails.js`: added `providerTimeoutError` (504), `providerUnavailableError` (502), and `payloadTooLargeError` (413); extended `ProblemError` with `code` and `correlationId`.
- `server/index.js`: mapped body parser failures (400 / 413) to RFC 7807; sanitized unhandled exception logging.
- `server/routes/chat.js`: route-owned 30s deadline; propagates abort signal to `handleChat`; maps `UpstreamError` to 502/504; sanitized unhandled exception logging.
- `server/services/agent.js`: updated `handleChat(message, sessionId, { signal })` to pass cancellation signals to retrieval and LLM.
- `server/services/rag.js`: updated `retrieveContext(query, { signal })` to pass cancellation signals down to vectorStore.
- `server/db/vectorStore.js`: updated `getRelevantChunks(query, topK, { signal })` to propagate cancellation signals to `getEmbedding`.
- `server/services/embeddings.js`: bounded embeddings (5s budget) via `fetchJsonBounded`; finite vector validation; clean abort propagation.
- `server/services/llm.js`: bounded LLM calls (20s budget) via `fetchJsonBounded`; nonempty trimmed text validation; pre-checks cancellation signals.
- `server/tests/upstream.test.js`: 11 tests covering stalled bodies, timeouts, oversized responses, shape validation, parent aborts, and concurrent request isolation.
- `server/tests/chatErrors.test.js`: 6 integration tests covering 504 timeouts, 502 unavailable, zero secret leakage in logs/bodies, 400 malformed JSON, 413 payload limits, and 422 preservation.
- `server/tests/b3Regressions.test.js` (new): 11 tests covering nonempty text validation (OpenAI, Gemini, Ollama, whitespace-only rejection, history exclusion), embedding vector validation (empty array rejection, nonnumeric rejection, abort propagation), and unexpected-error sentinel leak prevention (chat route and global error handler).
- `docs/backend-prompts/receipts/b3-receipt.md`: this receipt.

## Test Verification
- **Unit Suite (`npm test`)**: 13 files, 80 tests passed, 0 failed, duration 5.49s, exit code `0`.
- **Browser Suite (`npm run test:browser`)**: 3 files, 45 tests passed, 0 failed, duration 1.7m, exit code `0`.

## Explicit Limitations & Configuration
- **Limitations**: Intermediate task commit; cookie-owned session store, isolation, concurrency locks, and final context interfaces are implemented in B4. Real customer actions remain disabled.
- **Configurations**: upstream budgets (5s embedding, 20s LLM, 30s chat, 1 MiB body). Zero secrets committed.
- **Next Task**: B4 (`Server-owned anonymous sessions`).
