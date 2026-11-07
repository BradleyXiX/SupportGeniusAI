# Task B4 Receipt — Server-Owned Anonymous Sessions

- **Task**: B4 — Server-owned anonymous sessions & logging prerequisite (with review corrections & lifecycle hardening)
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **Prior HEAD**: `597815858fc92eb825316be3b1da24bf05973783` (B3 receipt commit)
- **Initial B4 HEAD**: `8f6a51d54ebca7c5b6b801a2f6057a7eaec185ae`
- **First Correction HEAD**: `d042404f16175e3eaaf36d0d489fc230ea084ec8`
- **Second Correction HEAD**: `fe80cce206e00a0b152d5c2876c5207209b72757`
- **Status**: Complete with lifecycle hardening & error-path persistence suppression. Pinned `express-session@1.19.0` and `memorystore@1.6.8`. Implemented bounded session store (500 max, 30m TTL, 60s prune), exact Origin admission validation prior to store access, single-flight session concurrency locks (409 `SESSION_BUSY`) with opaque `SessionLockLease` ownership tokens, detached working context during retrieval/generation, response-end auto-save/cookie suppression on all error paths, store-scoped lock registries, fail-closed persistence with cookie/auto-save suppression (503 `SESSION_STORE_UNAVAILABLE`), eviction/deletion guard during provider calls (401 `SESSION_REQUIRED`), independent `/session` rate limiter, final context interfaces (`handleChat`, `callLLM`, `createUsageMetrics`), session payload persistence (`initialized`, `revision`, `history`, `metrics`), and production cookie flags (`__Host-supportgenius_session`, `Secure`, `HttpOnly`, `SameSite=Strict`).

## Lifecycle Hardening & Controlled Schedule Corrections Applied
1. **Fix 1: Lock Ownership via Opaque Leases (`SessionLockLease`)**:
   - `tryAcquireSessionLock(sessionId, store)` issues a unique `SessionLockLease` with an unguessable UUID token and bounds the registry to 500 active locks.
   - `releaseSessionLock` only releases the lock if the lease/token matches the registry entry.
   - `routes/session.js` assigns `acquiredLease` only upon successful acquisition. Rejected resets (409 `SESSION_BUSY`) or non-owners hitting `finally` never release the active owner's lock.
   - **Schedule A Verified**: Chat A held pending; POST `/session` receives 409; repeated reset receives 409; subsequent Chat C receives 409; Chat A completes with 200, coherent 2-turn history, and valid metrics; post-completion reset succeeds with 204.
2. **Fix 2: Fresh Store Snapshot Hydration & Detached Generation State**:
   - In `routes/chat.js`, under acquired lock ownership, `initialEntry` is read from `getStoreEntry(req.sessionStore, sessionId)`.
   - `expectedRevision`, `workingHistory`, and `workingMetrics` are derived directly from this SAME fresh store snapshot.
   - Working state remains completely detached from `req.session` during retrieval and provider generation. `req.session` is updated only after the post-generation live-store/revision check passes immediately before explicit `saveSession`.
   - **Schedule B Verified**: Chat A completes and commits; delayed session middleware callback for Chat B releases; Chat B rehydrates from fresh store snapshot under lock; Chat B completes with 200; store preserves all 4 history entries, accumulated usage costs, and revision 3.
3. **Fix 3: App/Store-Scoped Lock Cleanup**:
   - Lock registries are scoped per session store using a `WeakMap<store, Map<sessionId, token>>`.
   - `createApp().cleanup()` invokes `clearSessionLocks(sessionStore)` and awaits `cleanupSessionStore(sessionStore)`. Cleaning up one app instance does not release or corrupt active locks in an isolated app.
   - **Schedule C Verified**: App A and App B run on independent stores; Chat on App A is held; `cleanupB()` is executed; concurrent request on App A remains 409 `SESSION_BUSY`; Chat on App A completes cleanly; `cleanupA()` succeeds without leaving timers or locks behind.
4. **Fix 4: Response-End Persistence & Set-Cookie Suppression on Error Exits**:
   - On EVERY unsuccessful route exit (`401`, `409`, `502`, `504`, `500`, `503`), `suppressAutoSaveAndCookie(req, res)` is called before `res.status(...).json/end`.
   - Nullifying `req.session` prevents `express-session`'s monkey-patched `res.end()` from triggering `store.set()` auto-save, and `res.removeHeader("Set-Cookie")` suppresses header emission.
   - **Combined Schedule Verified**: Chat A commits revision 2; Chat B's delayed middleware releases; session is evicted from store while provider is pending; provider returns `UpstreamError`; Chat B returns 502 `PROVIDER_UNAVAILABLE`; `Set-Cookie` is undefined; evicted session in store is NOT resurrected.
   - **Error Matrix Verified**: Valid sessions encountering 502/504/500 preserve previously committed history and usage unchanged with zero renewed cookies; fresh or delayed requests on evicted/expired sessions perform 0 `store.set` operations; revision mismatches return 401 without overwriting newer revisions.

## Changed & Created Files
- `server/session/store.js`: bounded `memorystore` store wrapper, TTL pruning, and async `cleanupSessionStore`.
- `server/session/lifecycle.js`: `SessionLockLease` opaque lease tokens, store-scoped `WeakMap` lock registries, `tryAcquireSessionLock`, `releaseSessionLock`, `clearSessionLocks`, `getStoreEntry`, `suppressAutoSaveAndCookie`.
- `server/session/middleware.js`: exact `PUBLIC_ORIGIN` check (403 `ORIGIN_FORBIDDEN`), `requireSession` guard (401 `SESSION_REQUIRED`), and session cookie middleware.
- `server/routes/session.js`: `POST /session` gates on `SessionLockLease` acquisition, returns 204 No Content with `Set-Cookie`, rotates existing sessions, fails closed with 503 on store errors, suppresses cookies on 409 busy contention, and returns no cookie ID in JSON/logs.
- `server/app.js`: app factory exposing `{ app, sessionStore, cleanup }` with independent rate limiters (`sessionLimiter` and `chatLimiter`), pre-middleware origin validation, and store-scoped async cleanup.
- `server/index.js`: thin server runner delegating to `createApp`.
- `server/config/env.js`: required `SESSION_SECRET` (>=32 chars, no default) and `PUBLIC_ORIGIN` (valid URL, HTTPS enforced in production, no default).
- `server/utils/problemDetails.js`: added `forbiddenError` (403), `sessionRequiredError` (401), `sessionBusyError` (409), `sessionStoreUnavailableError` (503).
- `server/services/finops.js`: implemented `createUsageMetrics`, `setModel`, `trackUsage`, `getSessionCost`, `formatSessionCost`.
- `server/services/agent.js`: updated `handleChat(message, { history, metrics, mode, signal })` to return `{ reply, history, metrics }` with 12-item history limit and 8000-char assistant truncation.
- `server/services/llm.js`: updated `callLLM(prompt, { metrics, mode, signal })` to track usage via context metrics.
- `server/routes/chat.js`: mounted `validateOrigin` and `requireSession`; single-flight lock via lease; fresh store snapshot hydration with detached working context; pre-commit verification; response-end persistence suppression on all error paths; eviction/rotation error handling; session history/metrics updates and persistence.
- `package.json` & `package-lock.json`: pinned `express-session@1.19.0` and `memorystore@1.6.8`.
- `playwright.config.js`: added development test server env vars (`SESSION_SECRET`, `PUBLIC_ORIGIN`, `APP_MODE=demo`).
- `vitest.config.js`: configured default test fixtures for `SESSION_SECRET`, `PUBLIC_ORIGIN`, and `RATE_LIMIT_MAX_REQUESTS: "100"`.
- `server/tests/sessions.test.js`: 30 behavioral regression tests covering Origin validation, store access gating, independent rate limits, rotation locks, eviction/deletion guards, fail-closed store errors, cookie jar isolation, history bounds, production cookie flags, all controlled schedules (A, B, C, Combined Schedule), and the full error persistence matrix.
- `server/tests/env.test.js`: added test coverage for `SESSION_SECRET` and `PUBLIC_ORIGIN`.
- `server/tests/finops.test.js`: updated test coverage for session-scoped usage metrics.
- `server/tests/chatRoute.test.js`, `server/tests/chatErrors.test.js`, `server/tests/modes.test.js`, `server/tests/b3Regressions.test.js`: updated baseline route tests to bootstrap sessions with approved Origin.
- `docs/backend-prompts/receipts/b4-receipt.md`: this receipt.

## Test Verification
- **Unit Suite (`npm test`)**: 14 test files, 115 tests passed, 0 failed, duration 7.89s, exit code `0`.
- **Browser Suite (`npm run test:browser`)**: 3 test files, 45 tests passed, 0 failed, duration 2.0m, exit code `0`. (Note: browser tests mock `/chat` at page level and do not test backend cookie lifecycle; frontend cookie bootstrap and lifecycle integration are scheduled for B5).

## Explicit Limitations & Configuration
- **Limitations**: In-memory ephemeral single-process store (500 sessions, 30m TTL, restart loss; multi-instance clustering and durable retention deferred). Anonymous cookies provide no customer-account authority. Zero live actions (all client webhooks fail closed). Frontend UI integration with cookie sessions deferred to B5.
- **Dependencies**: `express-session@1.19.0`, `memorystore@1.6.8`.
- **Configuration Names**: `SESSION_SECRET`, `PUBLIC_ORIGIN`, `NODE_ENV`, `APP_MODE`. Zero secrets committed.
- **Next Task**: B5 (`Integrate frontend bootstrap, mode and reset behavior`).

