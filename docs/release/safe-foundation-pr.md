# Pull Request: Safe Support Foundation & Signal Desk Integration

- **Branch**: `feature/safe-support-foundation`
- **Target Base**: `main` (stems from `origin/main` at `9b500e2` and preserves full Signal Desk redesign ancestry from `03886d2`)
- **Base SHA**: `03886d2a64d5bff18ee5be6bd50e9ff75c328bc5` (branch fork from `design/signal-desk-v1`)
- **Current HEAD SHA**: `895369e46adf9712861b032c8bf3380f9c4bd2cc`
- **Type**: Security, Architecture & Reliability Hardening

---

## 1. Problem Statement & Resulting Behavior

### The Problem
The original SupportGeniusAI prototype exhibited significant enterprise safety vulnerabilities:
1. **Unbounded Agent Action Risk**: Theoretical tool execution paths could invoke external webhooks (`CLIENT_WEBHOOK_URL`) to perform state-mutating actions (order edits, booking, address changes) without customer authentication or authorization.
2. **Client-Side Session Vulnerability**: Multi-turn sessions relied on client-supplied identifiers or local storage, exposing sessions to XSS token theft and client spoofing.
3. **Implicit Simulation & Uncontrolled Fallbacks**: Support mode lacked explicit differentiation from demonstration mode, allowing unexpected simulation fallbacks, unbounded upstream timeouts, and missing provider response validation.
4. **Transport & Origin Exposure**: Endpoints accepted cross-origin state mutations without strict `Origin` matching or explicit reverse proxy trust boundaries.
5. **Memory & Concurrency Contention**: Concurrent overlapping requests on the same session caused race conditions, state resurrection, and unbounded in-memory leakage.

### Resulting Production Behavior
With the Safe Support Foundation merged:
- **Zero Mutating Actions**: All customer action tools fail closed deterministically in all modes with an honest refusal. Zero outbound requests reach external webhooks.
- **Server-Owned Anonymous Sessions**: Anonymous cookie sessions (`HttpOnly`, `SameSite=Strict`, `Secure`) signed with a 32+ character secret. Zero session identifiers reside in browser storage or JSON payloads.
- **Explicit Dual Modes**:
  - `demo`: Deterministic grounded responses with zero provider fetch calls, zero embeddings, and zero inference costs.
  - `support`: Real vector retrieval with bounded provider calls; strictly rejects empty/whitespace text (HTTP 502) and never silently falls back to simulation.
- **Exact Origin & Proxy Defense**: Strict `PUBLIC_ORIGIN` matching on mutating endpoints (`/chat`, `/session`); Express `trust proxy: 1` topology requiring backend ingress restricted to a single trusted proxy.
- **Single-Flight Concurrency Locks**: Overlapping requests on the same session receive RFC 7807 `409 Conflict (SESSION_BUSY)`. Fresh snapshot hydration and lock ownership tokens prevent store resurrection after eviction or failure.
- **Safe Sanitized Logging**: Fixed `UNEXPECTED` classifications and server-generated correlation UUIDs ensure zero customer query text, provider URLs, or secrets appear in server logs or RFC 7807 responses.

---

## 2. Concise Summary of Changes

- **Sessions & Lifecycle** (`server/session/`): Implemented `InMemorySessionStore` (500 capacity, 30m TTL, LRU eviction), single-flight request locking, lock ownership tokens, fresh snapshot hydration, and signed cookie middleware.
- **Upstream & Providers** (`server/services/`, `server/utils/upstream.js`): Bounded HTTP streaming clients with typed `UpstreamError` (`timeout`, `connection`, `shape`), non-empty trimmed text validation, finite embedding vector checks, and explicit zero-network demo interceptors.
- **FinOps Telemetry** (`server/services/finops.js`): Session-scoped cost and token estimation adhering strictly to in-memory session bounds.
- **Client Console** (`client/app.js`, `client/console/index.html`): Unified session-operation state machine (`uninitialized`, `initializing`, `ready`, `chatPending`, `resetting`, `needsRecovery`), strict capability schema validation, 15s session operation deadlines, 45s chat deadlines, honest unconfirmed reset handling, and dynamically derived 429 Retry readiness.
- **Self-Contained Cache Verification** (`server/tests/agentToolsAndVectorCache.test.js`): Scoped filesystem mocks proving all-hit zero provider calls and mixed hit/miss single provider call with persistence.
- **Architecture & Operational Guides** (`docs/adr/0002-...`, `docs/deployment.md`): Detailed single-process constraints, `trust proxy: 1` topology, and staging smoke checklists.

---

## 3. Verified Safety Boundaries & Precision Clarifications

To prevent misleading claims during handoff, the following boundaries are precisely documented:
1. **Timeout & Deadline Hierarchy**:
   - Upstream Embedding Timeout: **5 seconds**
   - Upstream LLM Timeout: **20 seconds**
   - Server Total Request Deadline: **30 seconds**
   - Client Session Operation Deadline: **15 seconds**
   - Client Chat Request Deadline: **45 seconds**
2. **Accessibility Scope**: Automated axe-core audits passed with **0 serious or critical violations** in the tested console and marketing flows. This confirms absence of automated violations in evaluated states, but does not constitute an exhaustive manual WCAG AA certification across all assistive technologies.
3. **Cumulative Layout Shift (CLS)**: The interface employs explicit dimensions and zero layout-shifting hover properties; however, zero CLS is an architectural goal, not a field-measured Core Web Vitals metric.
4. **FinOps Boundaries**: Cost calculations are session-scoped estimates for local telemetry, not a global billing engine.
5. **Product Tree Stability**: The underlying codebase was fully verified at commit `4b659bc`; commit `895369e` was a documentation-only update recording the B7 receipt.

---

## 4. Verification Evidence

- **Unit & Contract Suite** (`vitest run` via `npm test`):
  - **14 test files passed**, **116 passed**, 0 failed, exit code `0` (16.43s).
- **Full Browser Suite** (`playwright test` via `npm run test:browser`):
  - **3 test files passed**, **62 passed**, 0 failed, exit code `0` (2.5m).
- **Clean Reproducible Install** (`npm ci`):
  - 184 packages installed and audited cleanly, exit code `0`.

---

## 5. Explicit Operating Limits & Deferred Scope

- **Single-Process Constraint**: In-memory session store (500 sessions, 30m TTL, restart loss). Must run as **exactly one process**. Do not scale horizontally without replacing the store with Redis/distributed storage.
- **Action Disablement**: Mutating customer actions fail closed deterministically in all modes.
- **Deferred to Subsequent Milestones**:
  - Customer login/authentication profiles.
  - Multi-tenant SaaS data isolation.
  - Persistent SQL/NoSQL chat transcripts.
  - External vector database migration.
  - Live CRM or calendar action integrations.
