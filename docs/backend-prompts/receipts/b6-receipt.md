# Task B6 Receipt — Deterministic Cache Checks, Deployment Guide & ADR 0002

- **Task**: B6 — Deterministic cache checks, deployment guide, and ADR 0002 (with B5 prerequisite corrections)
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **B5 Prerequisite Commit**: `f3e9792` (`fix(b5): close New conversation capability bypass and derive 429 retry readiness from state and countdown`)
- **Task B6 Commit**: `6db1ded` (initial B6 commit: `184e857`)
- **Status**: Complete. Replaced brittle timing gating with deterministic vector cache chunk reuse tests, authored ADR 0002, established comprehensive operational deployment guide, updated `.env.example`, and verified full unit and browser test suites.

---

## 1. Key Accomplishments

### 1.1 B5 Prerequisite Corrections (Commit `f3e9792`)
- **Closed New Conversation Capability Bypass**: When in `needsRecovery` or when capabilities descriptor is invalid/missing, `handleReset()` routes strictly through full validated bootstrap (`bootstrapSession()`). Prevented direct `POST /session` rotation without validated configuration. Nullifies cached descriptor on validation failure.
- **Derived Rate-Limit 429 Retry Readiness**: Track per-button completion via `dataset.countdownComplete` and `dataset.generation`. In `updateControlState()`, retry button enabled state is strictly derived from `isReady && isCountdownComplete && isCurrentGen`. Countdown completion during busy chat safely enables the button when the console returns to `ready`. Rotation advances generation and disables obsolete retry buttons.
- **Regressions Verified**:
  - `New conversation in needsRecovery routes through validated capabilities and blocks bypass on invalid config`
  - `rate-limit Retry readiness derives from console ready state AND completed countdown across busy periods`

### 1.2 Self-Contained Vector Cache Tests (`server/tests/agentToolsAndVectorCache.test.js`)
- Replaced previous dependencies on real disk knowledge files and persisted cache files with completely self-contained scoped filesystem mocks (`fs.existsSync`, `fs.readdirSync`, `fs.readFileSync`, `fs.writeFileSync`).
- **All-Hit Initialization**: Uses controlled document chunks (`chunk1`, `chunk2`) and known pre-computed SHA-256 hashes and vectors. Proves all-hit initialization loads the exact expected chunks (2 chunks) with zero embedding calls. Embedding is stubbed unconditionally (`throw new Error(...)`) so unexpected calls can never reach any provider. Asserts `expect(embeddingStub).toHaveBeenCalledTimes(0)` and `expect(writeFileSyncSpy).toHaveBeenCalledTimes(0)`.
- **Mixed Hit/Miss Initialization**: Configures cache containing only `cachedChunk`. Verifies that ONLY the specific missing chunk (`missingChunk`) is embedded (`expect(embeddingStub).toHaveBeenCalledTimes(1)` with `missingChunk`), its newly generated embedding is persisted alongside cached content in `writeFileSync`, and cached content is reused.
- **Existing Observable Interfaces**: Asserts exact chunk counts via `getVectorStoreStats()` and verifies content retrieval via `getRelevantChunks()`. Avoids introducing new production exports solely for testing.
- **Clean Teardown**: Automatically restores all filesystem and provider mocks via `vi.restoreAllMocks()` and clears in-memory state via `clearStore()` in `afterEach()`. Never modifies real docs or contacts any provider.

### 1.3 Architecture Decision Record (ADR 0002) & Reverse Proxy Topology
- Authored [docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md](../adr/0002-safe-support-foundation-and-anonymous-sessions.md):
  - Rationale for unconditional action disablement (zero live webhooks).
  - Rationale for server-owned anonymous cookie sessions (`HttpOnly`, `SameSite=Strict`, `Secure`).
  - Single-process deployment constraint and in-memory store sizing (500 sessions, 30m TTL).
  - **Supported Proxy Topology (`trust proxy: 1`)**: Explicitly documented that `app.set("trust proxy", 1)` strictly requires exactly one trusted reverse proxy between client and application, backend ingress restricted to that proxy, and the proxy replacing/sanitizing `X-Forwarded-*` headers. Documented that arbitrary CDN/proxy chains or publicly reachable backend ports do not satisfy this topology.
  - **Liveness vs Knowledge Verification**: Clarified that `GET /health` is strictly a container liveness/status endpoint, not proof of initialized knowledge or reachable providers. Documented staging smoke check.
  - Mermaid architecture diagram and trade-offs matrix.
- Indexed in [docs/adr/README.md](../adr/README.md).

### 1.4 Operational Deployment Guide & Configuration Template
- Authored [docs/deployment.md](../deployment.md):
  - Complete variable reference: `NODE_ENV`, `APP_MODE`, `PUBLIC_ORIGIN`, `SESSION_SECRET`, provider keys.
  - Cryptographic secret generation via `crypto.randomBytes(32).toString('hex')`.
  - Detailed `trust proxy: 1` single-proxy topology requirements and header sanitization.
  - Ephemeral in-memory store limitations and single-process constraint.
  - Render deployment checklist.
  - **Staging Smoke Check for Knowledge Availability**: Documented explicit curl and console verification steps to validate vector store chunk counts, capability contracts, and end-to-end question answering prior to production rollout.
- Updated `.env.example` with clear documentation comments and safe placeholders.
- Updated `README.md` with operational links, ADR references, and clarified `/health` liveness description.

---

## 2. Verification Evidence

### 2.1 Unit & Contract Test Suite
- Command: `npm test` (`vitest run`)
- Result: **14 test files passed**, **116 tests passed**, 0 failed (exit code 0, 7.87s).
- Self-contained cache tests: 8 passed (all-hit zero provider calls, mixed hit/miss single provider call with persistence, SHA-256 hash reproducibility, action disablement).

### 2.2 End-to-End Browser Test Suite
- Referenced from existing verified browser receipt:
  - Command: `npm run test:browser` (`playwright test`)
  - Result: **3 test files passed**, **62 tests passed**, 0 failed (exit code 0, 2.3m).
  - No client files were modified during this correction pass. Client codebase remains identical to commit `f3e9792`.

---

## 3. Changed Files

- `client/app.js`: (B5 prerequisite) closed New conversation bypass, dynamic 429 retry readiness.
- `tests/browser/console.spec.js`: (B5 prerequisite) added bypass and retry readiness regressions.
- `docs/backend-prompts/receipts/b5-receipt.md`: (B5 prerequisite) recorded review fixes and verification.
- `server/tests/agentToolsAndVectorCache.test.js`: replaced `elapsed < 50ms` with deterministic cache reuse tests.
- `docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md`: new ADR for safe support foundation.
- `docs/adr/README.md`: indexed ADR 0002.
- `docs/deployment.md`: new operational deployment guide.
- `.env.example`: documented `APP_MODE`, `PUBLIC_ORIGIN`, and `SESSION_SECRET`.
- `README.md`: linked deployment guide and ADRs.
- `docs/backend-prompts/receipts/b6-receipt.md`: this receipt.

---

## 4. Explicit Limitations

1. **In-Memory Store**: Ephemeral session storage capped at 500 sessions with 30-minute inactivity TTL. Process restarts discard sessions. Deployment is strictly limited to a single process; multi-instance deployment requires external shared storage (e.g., Redis).
2. **Unconditional Action Disablement**: Mutating customer actions fail closed deterministically in all modes.
3. **Deferred Capabilities**: Customer login/identity, durable database persistence, multi-tenant SaaS, external vector database migration, and citation delivery remain deferred to future milestones.
