# Safe Support Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. The selected method is Gemini/Antigravity implementation with Codex review. No parallel writers. Steps use checkboxes.

**Goal:** Make document Q&A/demo operation explicit and bounded while preventing real tool execution and browser-chosen conversation ownership.

**Architecture:** Keep Express and the approved vanilla Signal desk frontend. Add explicit capabilities/modes, bounded provider helpers, cookie-owned sessions and origin checks. The initial session store is bounded and process-local; client identity integrations remain disabled.

**Tech Stack:** Existing Node/Express/Zod/node-fetch/Vitest/Playwright; express-session and a reviewed, pinned memorystore runtime dependency.

**Spec:** docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md

## Global Constraints

- APP_MODE is support or demo, default support. Support never silently simulates on provider failure.
- Real actions are always disabled in this phase, regardless of mode, webhook URL or model output. No enable flag.
- Cookie ownership is anonymous conversation isolation, not authorization to customer accounts.
- Preserve successful /chat {reply:string,cost:string}; old request body sessionId may validate but selects no data.
- No unbounded global history/usage maps, browser-stored session token, default session MemoryStore or custom cryptography.
- Maximum 500 sessions; 30-minute inactivity TTL; one-minute pruning; six full exchanges/12 entries; user max 2000 chars; assistant max 8000 chars with explicit truncation marker.
- Production cookies are Secure, HttpOnly, SameSite=Strict, Path=/, no Domain, named __Host-supportgenius_session. Never weaken them for HTTP tests.
- Every /session or /chat POST requires exact configured PUBLIC_ORIGIN; reject missing/null origin too.
- New conversation is disabled while chat is pending. No automatic replay/retry of an uncertain chat POST.
- Deadlines cover body parsing: embedding 5s, LLM 20s, overall chat 30s; upstream response body max 1 MiB.
- No paid API calls, real client webhooks, new global installs, production configuration writes, merge or deployment.

## Review Focus

1. Same submitted body ID in two cookie jars must not share history or cost (B4).
2. Expiry/reset/eviction while a response is delayed must not resurrect an old session via automatic save (B4).
3. Header arrival without body completion must still hit the owning deadline (B3).
4. Missing, malformed or invalid session/capability responses must not silently enable chat or pretend a successful reset (B5).
5. Demo fixtures/provider errors/adversarial ACTION text must never dispatch a webhook or fabricate success (B2/B7).

## File map

- server/config/env.js: validate mode, origin, secret and supported single-process/proxy topology.
- server/services/capabilities.js (new): immutable public capability shape.
- server/routes/capabilities.js (new): GET /capabilities, no secrets/session creation.
- server/services/agent.js and utils/promptBuilder.js: unavailable action handling and document-Q&A behavior.
- server/services/llm.js, embeddings.js and rag.js: explicit mode, bounded calls and abort propagation.
- server/utils/upstream.js (new): fetch-and-parse within deadline/size limits, typed safe categories.
- server/utils/problemDetails.js: stable public codes and safe request IDs.
- server/session/store.js, lifecycle.js and middleware.js (new): store config, short-lived ownership locks, explicit save/invalidation and cookie options.
- server/routes/session.js (new): POST /session initialize/rotate, 204 only after persistence.
- server/routes/chat.js: authenticated-cookie ownership, validated request, bounded context and explicit persistence.
- server/services/finops.js: per-session metrics object helpers; no independent ID-indexed map.
- server/app.js (new) and index.js: app factory/test cleanup and thin bootstrap, retaining default app export compatibility where needed.
- client/app.js and console/index.html: capability disclosure, bootstrap/expiry/reset behavior, existing presentation preserved.
- server/tests/{modes,upstream,sessions,originPolicy}.test.js (new) plus impacted existing tests; tests/browser/* for full console integration.
- .env.example, README.md, docs/how-to/safe-support-deployment.md, docs/adr/0002-safe-support-foundation.md and receipts.

### B1: Branch, baseline and packet

**Files:** documentation only. **Consumes:** reviewed frontend SHA 03886d2. **Produces:** feature/safe-support-foundation and recorded BASE_SHA.

- [ ] Inspect actual Git status, current branch, applicable AGENTS.md and remote state. Preserve all unrelated work. Fetch only after authorization/network access; no production requests.
- [ ] If clean and frontend HEAD matches reviewed 03886d2, create feature/safe-support-foundation from design/signal-desk-v1. If an existing target branch/new frontend changes exist, inspect and report rather than force recreating. Do not base on old origin/main and drop the frontend.
- [ ] Copy approved design, this plan and prompts into docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md, docs/superpowers/plans/2026-11-07-safe-support-foundation.md and docs/backend-prompts/README.md.
- [ ] Run npm test and npm run test:browser with paid keys/webhook blank. Record process exit, not just green text. Previous baseline was 39 unit/45 browser tests, with an intermittent <50ms cache assertion and a local runner shutdown hang. Document rather than conceal discrepancies.
- [ ] Commit packet docs only; return clean status and base/head. Do not touch the frontend branch or push/deploy.

### B2: Explicit modes and zero live actions

**Files:** capabilities service/route, env.js, agent.js, llm.js, embeddings.js, promptBuilder.js, index/app routing as needed, modes.test.js and affected baseline action/route tests.

**Interfaces:** getCapabilities(mode)->{mode,actionsEnabled:false,sessionRequired:true}; unavailableActionReply()->the exact refusal from spec. Existing handleChat/callLLM signatures remain until B4's explicit session refactor.

- [ ] Add failing tests: with APP_MODE=demo no provider/embedding/webhook request occurs and answers are labeled Demo; in support mode provider failure never calls simulateLLM; every tool export/recognized/unknown/malformed tool attempt makes zero webhook calls even if CLIENT_WEBHOOK_URL exists.
- [ ] Run focused modes tests and observe failures against current behavior.
- [ ] Implement APP_MODE and deterministic direct action refusal. Tool helpers cannot dispatch. Remove fabricated success fallbacks; update old tests that require them. Update system prompts to disclose unavailable actions. Register GET /capabilities without session middleware; assert fields/no secret values.
- [ ] Implement explicit local demo path in both generation and retrieval; no hidden network embedding call during demo startup. Do not change the real provider model selection in this task.
- [ ] Run npm test (fixtures explicitly select support/demo per case; no global implicit simulation), commit fix: make support mode explicit and disable live actions. Intermediate branch is not releasable until all tasks complete.

### B3: Safe bounded upstream requests/errors

**Files:** upstream.js, llm.js, embeddings.js, rag.js, agent.js, chat.js, problemDetails.js, app/index error handler; upstream.test.js and error tests.

**Interfaces:** fetchJsonBounded(url,fetchOptions,{timeoutMs,signal,providerLabel,maxBytes=1048576})->Promise<unknown>; throws internal UpstreamError with safe kind timeout|connection|http|parse|size|shape, no public raw body/URL. getEmbedding(text,{signal}={}); retrieveContext(query,{signal}={}); callLLM(prompt,legacySessionId,{signal}={}) and handleChat(message,legacySessionId,{signal}={}) gain optional signal until B4 changes the second argument deliberately.

- [ ] Add tests with loopback fixtures/fake clocks for immediate headers/stalled 200 and non-2xx bodies, malformed JSON, >1MiB, empty/wrong provider shape, parent abort and independent concurrent requests.
- [ ] Implement timer disposal in finally after parsing, request-local controllers, abort-signal composition/listener disposal, 5s embeddings/20s LLM. The route owns the 30s overall signal passed through retrieval/generation.
- [ ] Map failures to stable 502/504 with code and correlation ID; unexpected errors generic 500. Do not log provider URL/query key, raw error body, cookie, prompt or full user query. Test secret-like sentinel values absent from both client responses and captured logs. Preserve safe 422 errors; map invalid JSON/body limit to 400/413.
- [ ] Run focused tests and npm test; commit fix: bound upstream reads and sanitize failures. Parent aborts must propagate out of retrieval rather than becoming a keyword fallback and starting a fresh model call; handle already-aborted signals before fetch. No automatic retry or live provider smoke test.

### B4: Cookie-owned sessions and isolated usage/history

**Files:** session/store.js, lifecycle.js, middleware.js, session route, app.js/index.js, chat.js, agent.js, llm.js, finops.js, env.js, package/lockfile; sessions/origin tests and impacted baseline tests.

**Final interfaces:** createUsageMetrics()->{model,cost,promptTokens,completionTokens}; setModel(metrics,model), trackUsage(metrics,promptTokens,completionTokens), getSessionCost(metrics). handleChat(message,{history,metrics,mode,signal})->Promise<{reply,history,metrics}>. callLLM(prompt,{metrics,mode,signal})->Promise<string>. These replace legacy ID arguments from B3; update every caller/test together. Work on local copies of history/metrics and commit only through session lifecycle, never a raw body ID. The finalized session payload is {initialized:true,revision,history:[],metrics}; cookie ID stays library-owned.

- [ ] Verify current express-session/memorystore docs and package versions, pin installed resolved versions. Do not use default MemoryStore or invent signing. Configure bounds/TTL/pruning and lifecycle disposal for tests/server shutdown.
- [ ] Add failing two-agent tests: same request body sessionId, different cookies, no shared reply history/metrics; missing/forged/expired cookie gets 401 SESSION_REQUIRED and no provider request. Test exact production cookie flags without weakening Secure for HTTP.
- [ ] Implement required PUBLIC_ORIGIN and >=32-byte SESSION_SECRET configuration with no default; tests supply explicit nonsecret fixtures. Exact Origin check runs before mutable session work for POST /session and /chat. Test missing/null/wrong origins and malformed/oversized JSON; assert no provider/store mutation on rejection.
- [ ] Add server-side single-flight ownership with immediate 409 SESSION_BUSY for concurrent mutation. Reload after lock acquisition, touch activity and persist before response/release. On expiry/eviction/reset, verify stored revision exists and suppress stale automatic save/Set-Cookie; no old-session resurrection. Tests cover all branches with controllable clocks/store, including save failure ->503 SESSION_STORE_UNAVAILABLE. No queues or unbounded lock keys.
- [ ] POST /session creates or rotates using library methods and returns 204 after persistence. /chat requires initialized state. GET /health and /capabilities create no session. Never return opaque cookie ID in JSON or logs.
- [ ] Refactor history/usage to the session payload and final interfaces above, remove old maps. Bound six exchanges, input2000/output8000 with visible truncation indication. Test history bounds, expiry, max-capacity eviction and process restart behavior. These anonymous sessions provide no customer-record authority.
- [ ] App factory exposes explicit cleanup (session pruning/timers/listeners) for tests; index remains a thin server start. Update baseline route tests to bootstrap sessions with approved Origin. Run npm test and focused tests; commit feat: isolate anonymous support sessions on the server.

### B5: Integrate frontend bootstrap, mode and reset behavior

**Files:** client/app.js, console/index.html, minimal styles, Playwright config/browser tests. No visual redesign.

**Interfaces:** GET /capabilities shape from B2, POST /session ->204, /chat success unchanged, errors SESSION_REQUIRED/SESSION_BUSY. Frontend IDs session-storage values are never server authority. Local request generation continues guarding async UI state.

- [ ] Write failing browser tests: initialization blocks Send until capabilities and session succeed; failure/malformed capability remains visibly unavailable; current mode disclosed; missing session ->explicit new-conversation flow with no replay; reset pending disables Send and only clears transcript/cost after204.
- [ ] Remove stored supportGeniusSessionId use. Capability/session bootstrap uses same-origin credentials; no opaque IDs exposed to JS. Keep local request IDs/generation helpers as UI-only correlation. No silent fallback ID if cookie setup fails.
- [ ] Disable New conversation while chat pending; update old reset-while-pending browser tests to this approved behavior, retaining pure request-generation tests and relevant stale bootstrap/reset coverage. On reset failure preserve transcript and don't claim deletion; on401 require explicit session restart; on409 no auto-retry.
- [ ] Keep A7 body deadline, request-local cleanup, sanitizer/text fallback, IME, visible pending status, knowledge label and reduced-motion behavior intact. Validate screenshot layouts after adding actual-mode disclosure.
- [ ] Browser server uses explicit demo/local fixture config for real HTTP cookie integration; retain separate production CSP/HTTPS-cookie tests. Update mocks to cover bootstrap/capabilities intentionally rather than bypassing session safety. Run unit/browser suites; commit feat: connect console to explicit support sessions.

### B6: Deterministic cache test and operational documentation

**Files:** agentToolsAndVectorCache.test.js, test fixtures/helpers, environment example, README, deployment how-to and ADR0002; no provider model/cache architecture rewrite.

- [ ] Replace the unit test's brittle elapsed<50ms assertion with a controlled cached-doc fixture: expected chunks load, existing cached embeddings are reused, and the embedding stub receives zero calls for those chunks. Do not remove coverage or simply raise the timing threshold. Keep tests independent of developer warm caches; optional timing measurements are a separate documented benchmark.
- [ ] Document explicit mode, origin, secret generation/storage (no values in receipts), production HTTPS/proxy topology, one process only, 500-session capacity, 30-minute inactivity expiry, restart loss and blocked tools. A shared store is required before multi-instance deployment; do not claim this memory store is durable.
- [ ] Document local start/test and Render variables that must be configured manually before any release. Preserve current deployment settings. Explain which customer identity/integration/retention decisions remain future work. Add ADR rationale for disabled actions and ephemeral anonymous cookies.
- [ ] Run focused cache tests and npm test; commit test: verify cached embedding reuse deterministically and document support operation.

### B7: Whole-branch verification and handoff

**Files:** receipts, verification artifacts and any minimal fixes to the owning tasks; no unrelated implementation.

- [ ] Run npm ci, npm test and npm run test:browser; report actual exit codes, counts, failed/skipped tests and cleanup behavior. New totals may differ as old false-success tests are replaced and real safety tests added. Never preserve unsafe assertions just to keep39.
- [ ] Verify demo zero-network behavior at startup and chat; support provider timeout/body-size failures; disabled tools despite configured webhook; two-agent body-ID isolation; expiry, rotation, contention and save-failure semantics; request Origin and cookie flags; no secrets in errors/logs.
- [ ] Inspect desktop/mobile/reduced-motion screenshots and real console keyboard/session flows. Test failed initialization/reset, expired session and wrong origin. Use mocks/loopback fixtures only; no live customer actions.
- [ ] Review diff against B1's frontend base for unintended feature loss, unsafe auth shortcuts, generated artifacts, secrets and production configuration changes. Have Codex review the resulting diff/receipt. No release-ready claim covering deferred identity/integrations/answer-quality.
- [ ] Commit verification docs; return branch, base/head, exact file list, test evidence and remaining limitations. Stop before pushing/merging/deploying.

## Plan self-review

Every approved design section maps to B2–B6; B1 preserves branch ancestry and B7 validates the integrated result. The five review-focus failures have named owning tests. Transitional provider signatures in B3 are replaced explicitly in B4 with all callsites, preventing ambiguous cross-task interfaces. New sessions change reset UX intentionally, so old browser assertions are updated rather than silently discarded. Source citations, model migration and real actions remain out of scope.
