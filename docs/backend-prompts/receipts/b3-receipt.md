# Task B3 Receipt — Safe Bounded Upstream Requests & Errors

- **Task**: B3 — Bounded provider requests and safe errors
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **Prior HEAD**: `c2bc2b7`
- **Head SHA**: `b0aa6b5` (`b0aa6b57dca7e387c5cf7ebf54a8677c77c78dc3`)
- **Status**: Implemented shared deadline- and size-bounded upstream fetch helper (`fetchJsonBounded`), signal propagation through retrieval/generation, safe error classification (502 `PROVIDER_UNAVAILABLE` / 504 `PROVIDER_TIMEOUT`), secret sanitization, and body-parser error mapping (400 / 413).

## Changed Files
- `server/utils/upstream.js` (new): `fetchJsonBounded`, `UpstreamError`, and `sanitizeUrlForLogging`. Enforces 1 MiB body limit, request-local abort controllers, timer cleanup, and safe error classification.
- `server/utils/problemDetails.js`: added `providerTimeoutError` (504), `providerUnavailableError` (502), and `payloadTooLargeError` (413); extended `ProblemError` with `code` and `correlationId`.
- `server/index.js`: mapped body parser failures (400 for malformed JSON, 413 for payload >1 MiB) to RFC 7807 problem details.
- `server/routes/chat.js`: route-owned 30s deadline; propagates abort signal to `handleChat`; maps `UpstreamError` to 502/504 with correlation IDs; sanitizes logs.
- `server/services/agent.js`: updated `handleChat(message, sessionId, { signal })` to pass cancellation signals to retrieval and LLM.
- `server/services/rag.js`: updated `retrieveContext(query, { signal })` to pass cancellation signals down to vectorStore.
- `server/db/vectorStore.js`: updated `getRelevantChunks(query, topK, { signal })` to propagate cancellation signals to `getEmbedding`.
- `server/services/embeddings.js`: bounded embeddings (5s budget) via `fetchJsonBounded`; parent aborts propagate immediately out of retrieval rather than falling back to keyword search.
- `server/services/llm.js`: bounded LLM calls (20s budget) via `fetchJsonBounded`; pre-checks cancellation signals; validates shape.
- `server/tests/upstream.test.js` (new): 11 tests covering stalled bodies, timeouts, oversized responses, shape validation, parent aborts, and concurrent request isolation.
- `server/tests/chatErrors.test.js` (new): 6 integration tests covering 504 timeouts, 502 unavailable, zero secret leakage in logs/bodies, 400 malformed JSON, 413 payload limits, and 422 preservation.
- `docs/backend-prompts/receipts/b3-receipt.md`: this receipt.

## Test Verification
- **Unit Suite (`npm test`)**: 12 files, 69 tests passed, 0 failed, duration 6.42s, exit code `0`.
- **Browser Suite (`npm run test:browser`)**: 3 files, 45 tests passed, 0 failed, duration 2.0m, exit code `0`.

## Explicit Limitations & Configuration
- **Limitations**: Intermediate task commit; cookie-owned session store, isolation, concurrency locks, and final context interfaces are implemented in B4. Real actions remain disabled.
- **Configurations**: upstream budgets (5s embedding, 20s LLM, 30s chat, 1 MiB body). Zero secrets committed.
- **Next Task**: B4 (`Server-owned anonymous sessions`).
