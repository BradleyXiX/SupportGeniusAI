# Task B2 Receipt — Explicit Modes & Zero Live Actions

- **Task**: B2 — Explicit modes and disabled actions
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **Status**: Implemented explicit `APP_MODE` (`support` | `demo`), public no-secret `/capabilities`, unconditional zero-dispatch action refusal, and updated tests.

## Changed Files
- `server/config/env.js`: added `APP_MODE` (`support` | `demo`, default `support`) to env schema.
- `server/services/capabilities.js`: immutable `{ mode, actionsEnabled: false, sessionRequired: true }` descriptor.
- `server/routes/capabilities.js`: `GET /capabilities` endpoint without secrets or session requirements.
- `server/index.js`: mounted `/capabilities`.
- `server/services/agent.js`: exported `unavailableActionReply()`; `callWebhook()` unconditionally returns `null`; tools fail closed; model action attempts return deterministic refusal directly.
- `server/services/llm.js`: demo mode uses local deterministic fixtures prefixed with `[Demo]`; support mode failure throws `gatewayError` without silent fallback to simulation.
- `server/services/embeddings.js`: demo mode returns `null` immediately to prevent external embedding network calls.
- `server/utils/promptBuilder.js`: updated system instructions disclosing that automated actions are unavailable.
- `server/tests/modes.test.js`: new suite for capabilities, zero-webhook dispatch, tool refusal, demo prefix, and support error behavior.
- `server/tests/env.test.js`: added `APP_MODE` schema validation coverage.
- `server/tests/agentToolsAndVectorCache.test.js`: updated action tests to assert deterministic refusal and zero webhook dispatch.
- `server/tests/chatRoute.test.js`: updated to assert deterministic refusal on action attempt.
- `server/tests/promptBuilder.test.js`: added assertion for unavailable actions disclosure.
- `docs/backend-prompts/receipts/b2-receipt.md`: this receipt.

## Test Verification
- **Unit Suite (`npm test`)**: 10 files, 51 tests passed, 0 failed, exit code `0`.
- **Browser Suite (`npm run test:browser`)**: 3 files, 45 tests passed, 0 failed, exit code `0`.

## Explicit Limitations & Configuration
- **Limitations**: Intermediate task commit; session cookies, concurrency locks, and bounded upstream fetch deadlines are implemented in B3/B4. Real client integrations remain disabled.
- **Configurations / Dependencies**: `APP_MODE` (`support` | `demo`), `zod` (`^4.6.7`), `express` (`^4.19.2`). Zero secrets committed.
- **Next Task**: B3 (`Safe bounded upstream requests/errors`).
