# Task B4 Receipt — Server-Owned Anonymous Sessions

- **Task**: B4 — Server-owned anonymous sessions & logging prerequisite
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **Prior HEAD**: `5978158` (B3 receipt commit)
- **Logging Prerequisite Commit**: `17f0394` (`fix(logging): enforce fixed UNEXPECTED error classification and server-generated correlation UUIDs`)
- **Status**: Complete. Pinned `express-session@1.19.0` and `memorystore@1.6.8`. Implemented bounded session store (500 max, 30m TTL, 60s prune), exact Origin validation, server single-flight concurrency lock (409 `SESSION_BUSY`), final context interfaces (`handleChat`, `callLLM`, `createUsageMetrics`), session payload persistence (`initialized`, `revision`, `history`, `metrics`), and production cookie flags (`__Host-supportgenius_session`, `Secure`, `HttpOnly`, `SameSite=Strict`).

## Changed & Created Files
- `server/session/store.js` (new): bounded `memorystore` store wrapper, TTL pruning, and clean lifecycle disposal for tests/shutdown.
- `server/session/lifecycle.js` (new): single-flight session concurrency locks (409 `SESSION_BUSY`), session data initializer, touch, and explicit save.
- `server/session/middleware.js` (new): exact `PUBLIC_ORIGIN` check (403 `ORIGIN_FORBIDDEN`), `requireSession` guard (401 `SESSION_REQUIRED`), and session cookie middleware.
- `server/routes/session.js` (new): `POST /session` returns 204 No Content with `Set-Cookie`, rotates existing sessions, and returns no cookie ID in JSON/logs.
- `server/app.js` (new): app factory exposing `{ app, sessionStore, cleanup }` for clean test lifecycle shutdown.
- `server/index.js`: thin server runner delegating to `createApp`.
- `server/config/env.js`: required `SESSION_SECRET` (>=32 chars, no default) and `PUBLIC_ORIGIN` (valid URL, HTTPS enforced in production, no default).
- `server/utils/problemDetails.js`: added `forbiddenError` (403), `sessionRequiredError` (401), `sessionBusyError` (409), `sessionStoreUnavailableError` (503).
- `server/services/finops.js`: implemented `createUsageMetrics`, `setModel`, `trackUsage`, `getSessionCost`, `formatSessionCost`. Removed old global maps.
- `server/services/agent.js`: updated `handleChat(message, { history, metrics, mode, signal })` to return `{ reply, history, metrics }` with 12-item history limit and 8000-char assistant truncation.
- `server/services/llm.js`: updated `callLLM(prompt, { metrics, mode, signal })` to track usage via context metrics.
- `server/routes/chat.js`: mounted `validateOrigin` and `requireSession`; single-flight lock; reload from store; session history/metrics updates and persistence.
- `package.json` & `package-lock.json`: pinned `express-session@1.19.0` and `memorystore@1.6.8`.
- `playwright.config.js`: added development test server env vars (`SESSION_SECRET`, `PUBLIC_ORIGIN`, `APP_MODE=demo`).
- `vitest.config.js`: configured default test fixtures for `SESSION_SECRET` and `PUBLIC_ORIGIN`.
- `server/tests/sessions.test.js` (new): 16 tests covering Origin validation, session bootstrap/rotation, 401 unauthorized checks, two-agent cookie jar isolation with identical body `sessionId`, single-flight concurrency lock, context interfaces, history bounds, and production cookie flags.
- `server/tests/env.test.js`: added test coverage for `SESSION_SECRET` and `PUBLIC_ORIGIN`.
- `server/tests/finops.test.js`: updated test coverage for session-scoped usage metrics.
- `server/tests/chatRoute.test.js`, `server/tests/chatErrors.test.js`, `server/tests/modes.test.js`, `server/tests/b3Regressions.test.js`: updated baseline route tests to bootstrap sessions with approved Origin.
- `docs/backend-prompts/receipts/b4-receipt.md`: this receipt.

## Test Verification
- **Unit Suite (`npm test`)**: 14 test files, 101 tests passed, 0 failed, duration 9.37s, exit code `0`.
- **Browser Suite (`npm run test:browser`)**: 3 test files, 45 tests passed, 0 failed, duration 2.1m, exit code `0`.

## Explicit Limitations & Configuration
- **Limitations**: In-memory ephemeral single-process store (500 sessions, 30m TTL, restart loss; multi-instance clustering and durable retention deferred). Anonymous cookies provide no customer-account authority. Zero live actions (all client webhooks fail closed). Frontend UI integration with cookie sessions deferred to B5.
- **Dependencies**: `express-session@1.19.0`, `memorystore@1.6.8`.
- **Configuration Names**: `SESSION_SECRET`, `PUBLIC_ORIGIN`, `NODE_ENV`, `APP_MODE`. Zero secrets committed.
- **Next Task**: B5 (`Integrate frontend bootstrap, mode and reset behavior`).
