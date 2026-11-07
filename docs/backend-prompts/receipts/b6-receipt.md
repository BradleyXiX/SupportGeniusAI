# Task B6 Receipt — Deterministic Cache Checks, Deployment Guide & ADR 0002

- **Task**: B6 — Deterministic cache checks, deployment guide, and ADR 0002 (with B5 prerequisite corrections)
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2`
- **B5 Prerequisite Commit**: `f3e9792` (`fix(b5): close New conversation capability bypass and derive 429 retry readiness from state and countdown`)
- **Task B6 Commit**: `98d9fac`
- **Status**: Complete. Replaced brittle timing gating with deterministic vector cache chunk reuse tests, authored ADR 0002, established comprehensive operational deployment guide, updated `.env.example`, and verified full unit and browser test suites.

---

## 1. Key Accomplishments

### 1.1 B5 Prerequisite Corrections (Commit `f3e9792`)
- **Closed New Conversation Capability Bypass**: When in `needsRecovery` or when capabilities descriptor is invalid/missing, `handleReset()` routes strictly through full validated bootstrap (`bootstrapSession()`). Prevented direct `POST /session` rotation without validated configuration. Nullifies cached descriptor on validation failure.
- **Derived Rate-Limit 429 Retry Readiness**: Track per-button completion via `dataset.countdownComplete` and `dataset.generation`. In `updateControlState()`, retry button enabled state is strictly derived from `isReady && isCountdownComplete && isCurrentGen`. Countdown completion during busy chat safely enables the button when the console returns to `ready`. Rotation advances generation and disables obsolete retry buttons.
- **Regressions Verified**:
  - `New conversation in needsRecovery routes through validated capabilities and blocks bypass on invalid config`
  - `rate-limit Retry readiness derives from console ready state AND completed countdown across busy periods`

### 1.2 Deterministic Vector Cache Reuse (`server/tests/agentToolsAndVectorCache.test.js`)
- Replaced brittle `elapsed < 50ms` unit timing gate with deterministic assertions:
  1. `has vector_cache.json persisted and reuses cached embeddings with zero re-embedding calls`: Spies on `embeddingsService.getEmbedding` and asserts `toHaveBeenCalledTimes(0)` when initializing store with persisted `vector_cache.json`. Verifies `stats.isInitialized === true` and `stats.chunksCount > 0`.
  2. `invokes getEmbedding only for uncached chunks when cache has misses`: Mocks cache misses on chunk lookup and verifies `getEmbedding` is called strictly for uncached chunks (`toHaveBeenCalledTimes(stats.chunksCount)`).
- Eliminates test flakes caused by CI CPU throttling while preserving full knowledge base integrity.

### 1.3 Architecture Decision Record (ADR 0002)
- Authored [docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md](../adr/0002-safe-support-foundation-and-anonymous-sessions.md):
  - Rationale for unconditional action disablement (zero live webhooks).
  - Rationale for server-owned anonymous cookie sessions (`HttpOnly`, `SameSite=Strict`, `Secure`).
  - Single-process deployment constraint and in-memory store sizing (500 sessions, 30m TTL).
  - Exact Origin verification and TLS reverse proxy trust topology.
  - Mermaid architecture diagram and trade-offs matrix.
- Indexed in [docs/adr/README.md](../adr/README.md).

### 1.4 Operational Deployment Guide & Configuration Template
- Authored [docs/deployment.md](../deployment.md):
  - Complete variable reference: `NODE_ENV`, `APP_MODE`, `PUBLIC_ORIGIN`, `SESSION_SECRET`, provider keys.
  - Cryptographic secret generation via `crypto.randomBytes(32).toString('hex')`.
  - Production HTTPS reverse proxy topology with Express `trust proxy: 1`.
  - Ephemeral in-memory store limitations and single-process constraint.
  - Render deployment checklist with health probe guidance.
- Updated `.env.example` with clear documentation comments and safe placeholders.
- Updated `README.md` with operational links and ADR references.

---

## 2. Verification Evidence

### 2.1 Unit & Contract Test Suite
- Command: `npm test` (`vitest run`)
- Result: **14 test files passed**, **116 tests passed**, 0 failed (exit code 0, 8.75s).

### 2.2 End-to-End Browser Test Suite
- Command: `npm run test:browser` (`playwright test`)
- Result: **3 test files passed**, **62 tests passed**, 0 failed (exit code 0, 2.3m).

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
