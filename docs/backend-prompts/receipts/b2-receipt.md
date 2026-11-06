# Task B2 Receipt — Explicit Modes, Disabled Actions & Zero-Cost Demo

- **Task**: B2 — Explicit modes and disabled actions (including zero-cost demo & enforced no-network correction)
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **Prior HEAD**: `893853f`
- **Status**: Implemented explicit `APP_MODE` (`support` | `demo`), public no-secret `/capabilities`, unconditional zero-dispatch action refusal, canonical zero-cost demo accounting, module-boundary fetch interception, and regression tests.

## Changed Files
- `server/config/env.js`: added `APP_MODE` (`support` | `demo`, default `support`) to env schema.
- `server/services/capabilities.js`: immutable `{ mode, actionsEnabled: false, sessionRequired: true }` descriptor.
- `server/routes/capabilities.js`: `GET /capabilities` endpoint without secrets or session requirements.
- `server/index.js`: mounted `/capabilities`.
- `server/services/agent.js`: exported `unavailableActionReply()`; `callWebhook()` unconditionally returns `null`; tools fail closed; model action attempts return deterministic refusal directly; removed unused `node-fetch` import.
- `server/services/llm.js`: demo mode uses canonical zero-cost `"simulated"` model with deterministic local fixtures prefixed with `[Demo]`; support mode failure throws `gatewayError` without silent fallback to simulation.
- `server/services/embeddings.js`: demo mode returns `null` immediately to prevent external embedding network calls.
- `server/services/finops.js`: added explicit `"demo-simulated": { prompt: 0, completion: 0 }` alias; preserves non-zero `llama3` fallback for unknown models.
- `server/utils/promptBuilder.js`: updated system instructions disclosing that automated actions are unavailable.
- `server/tests/modes.test.js`: comprehensive test suite intercepting `node-fetch` at the module boundary; enforces exact 0 fetch calls across demo generation, embedding, `handleChat`, and uncached store initialization; asserts repeated demo queries accumulate 0 inference cost, displayed `$0.0000`, and positive token counts.
- `server/tests/env.test.js`: added `APP_MODE` schema validation coverage.
- `server/tests/agentToolsAndVectorCache.test.js`: updated action tests to assert deterministic refusal and zero webhook dispatch.
- `server/tests/chatRoute.test.js`: updated to assert deterministic refusal on action attempt.
- `server/tests/finops.test.js`: added regression for zero-cost simulated models while preserving token tracking.
- `server/tests/promptBuilder.test.js`: added assertion for unavailable actions disclosure.
- `docs/backend-prompts/receipts/b2-receipt.md`: this receipt.

## Test Verification
- **Unit Suite (`npm test`)**: 10 files, 52 tests passed, 0 failed, duration 5.23s, exit code `0`.
- **Browser Suite (`npm run test:browser`)**: 3 files, 45 tests passed, 0 failed, duration 1.8m, exit code `0`.

## Proof of Zero Demo Cost & Zero Fetch Calls
1. **Zero Demo Cost**:
   - `POST /chat` with `APP_MODE=demo` returns `cost: "0.0000"`.
   - Repeated queries in the same session accumulate `metrics.cost === 0` while valid tokens (`promptTokens`, `completionTokens`) increment.
   - Verified in `server/tests/modes.test.js` (`accumulates zero inference cost and zero displayed /chat cost across repeated demo queries in one session`).
2. **Zero Fetch Calls Enforced**:
   - `node-fetch` mocked at the module boundary (`vi.mock("node-fetch")`).
   - Verified 0 outbound calls across `callLLM`, `getEmbedding`, `handleChat`, and `initializeStore` with uncached document chunks (`temp_uncached_fixture.txt`).
   - Verified in `server/tests/modes.test.js` (`enforces zero network fetch calls across demo generation, embedding, handleChat, and uncached store initialization`).

## Explicit Limitations & Configuration
- **Limitations**: Intermediate task commit; session cookies, concurrency locks, and bounded upstream fetch deadlines are implemented in B3/B4. Real client integrations remain disabled.
- **Configurations / Dependencies**: `APP_MODE` (`support` | `demo`), `zod` (`^4.6.7`), `express` (`^4.19.2`). Zero secrets committed.
- **Next Task**: B3 (`Safe bounded upstream requests/errors`).
