# Task D0 Receipt — Baseline, Branch Setup & Gemini Model Nomination

- **Task**: D0 — Baseline and branch preparation
- **Branch**: `fix/gemini-support-recovery`
- **Base SHA**: `5d49ca5` (`Merge pull request #4 from BradleyXiX/feature/safe-support-foundation`)
- **PR4 Merge Commit**: `5d49ca5`
- **Reviewed Commit**: `4d0115470130482a1d18a5728e4a2277f897ac0e` (verified present as ancestor of `origin/main`)
- **Head SHA**: `5d49ca5` (prior to baseline doc commit)
- **Status**: Clean baseline established; plan and prompt packets installed; zero product code modified.

---

## 1. Branch Ancestry & Repository Verification

1. **Pre-switch Inspection**:
   - Starting branch: `feature/safe-support-foundation` at commit `4d01154`.
   - Working tree: Clean (`git status --short` reported zero modifications).
   - Remotes: `origin https://github.com/BradleyXiX/SupportGeniusAI.git (fetch & push)`.
2. **Remote Verification**:
   - `git fetch origin` completed cleanly.
   - `git merge-base --is-ancestor 4d0115470130482a1d18a5728e4a2277f897ac0e origin/main` succeeded (exit code 0), proving PR4 merged.
   - Top of `origin/main`: `5d49ca5 Merge pull request #4 from BradleyXiX/feature/safe-support-foundation`.
3. **Branch Creation**:
   - `git switch main` followed by `git pull --ff-only origin main` advanced `main` from `0236374` to `5d49ca5`.
   - `git switch -c fix/gemini-support-recovery` created branch from `5d49ca5`.
   - Preserved branches: `feature/safe-support-foundation` (`4d01154`), `design/signal-desk-v1` (`03886d2`), `feature/ecc-production-hardening` (`66107c9`), `feature/frontend-redesign` (`0a6df66`), `main` (`5d49ca5`).

---

## 2. Documentation & Packet Installation

The following documentation and prompt packet files were installed without product code modifications:
- `docs/superpowers/plans/2026-11-08-gemini-support-recovery.md` (canonical recovery plan)
- `docs/provider-prompts/01-implementation-plan.md` (packet plan copy)
- `docs/provider-prompts/D0-baseline-and-branch.md` (D0 execution prompt)
- `docs/provider-prompts/D1-gemini-provider.md` (D1 execution prompt)
- `docs/provider-prompts/D2-keyword-retrieval.md` (D2 execution prompt)
- `docs/provider-prompts/D3-client-docs-verification.md` (D3 execution prompt)
- `docs/provider-prompts/receipts/d0-receipt.md` (this receipt)

---

## 3. Baseline Test Execution

- **Command**: `npm test` (`vitest run`)
- **Process Exit Code**: `0`
- **Test Suites**: 14 passed of 14
- **Total Tests**: 116 passed of 116 (0 failed, 0 skipped)
- **Duration**: 28.02s
- **Suites Executed**:
  - `server/tests/upstream.test.js` (11 tests)
  - `server/tests/healthRoute.test.js` (2 tests)
  - `server/tests/frontendAssets.test.js` (2 tests)
  - `server/tests/b3Regressions.test.js` (13 tests)
  - `server/tests/chatRoute.test.js` (5 tests)
  - `server/tests/chatErrors.test.js` (6 tests)
  - `server/tests/modes.test.js` (10 tests)
  - `server/tests/chatState.test.js` (8 tests)
  - `server/tests/agentToolsAndVectorCache.test.js` (8 tests)
  - `server/tests/finops.test.js` (3 tests)
  - `server/tests/sessions.test.js` (30 tests)
  - `server/tests/promptBuilder.test.js` (5 tests)
  - `server/tests/env.test.js` (9 tests)
  - `server/tests/embeddings.test.js` (4 tests)

---

## 4. Google Model Lifecycle, GenerateContent & Pricing Analysis

### Official Source Evidence & Lifecycle Status
1. **Endpoint & Authentication**:
   - Fixed endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
   - Authentication header: `x-goog-api-key: $GEMINI_API_KEY` (replaces query string `?key=...` per official Google Developer documentation to prevent credential leakage in access logs or upstream URLs).
2. **Current Model Lifecycle Status**:
   - `gemini-1.5-flash`: Officially deprecated and shut down at endpoint level. Previous hardcoded references in `server/services/llm.js` and `server/services/finops.js` target an obsolete endpoint.
   - `gemini-2.0-flash`: Deprecated / shut down June 1, 2026.
   - `gemini-2.5-flash`: In routing transition / scheduled supersession by newer Flash lines.
   - `gemini-3.8-flash`: Current production-stable recommended Flash model for multimodal and text generation with `generateContent`.
3. **Nominated Available Model ID**:
   - **Primary Nomination**: `gemini-2.5-flash` (or `gemini-3.8-flash` as current stable recommended Flash model).
   - **Model String Constraint**: Trimmed, bare model ID required when `LLM_PROVIDER=gemini` in support mode (e.g. `gemini-2.5-flash` or `gemini-3.8-flash`). Rejects URL paths, slashes, or query characters.
4. **Free Tier & Pricing Structure**:
   - **Free Tier (Google AI Studio)**: Free of charge ($0 input / $0 output) within project rate limits (RPM/RPD/TPM). User prompts and responses on free tier may be logged and reviewed for product improvement per Google terms.
   - **Paid Tier Rates (USD per 1M tokens / per 1K tokens)**:
     - `gemini-2.5-flash`: $0.30 input / $2.00 output per 1M tokens ($0.0003 prompt / $0.002 completion per 1K tokens).
     - `gemini-3.8-flash`: $0.75 input / $3.75 output per 1M tokens ($0.00075 prompt / $0.00375 completion per 1K tokens) promotional through Dec 31, 2026 ($1.50 / $7.50 standard).
5. **Strict Access Scope Caveat**:
   - Model nomination is based exclusively on official Google API lifecycle and pricing documentation.
   - **No live API call, credential probe, or project quota check was conducted.** User project credentials, tier status, billing linkage, and available quotas remain completely unverified.

---

## 5. Inventory: Affected Tests & Cost Serialization

### Current Serialization Vulnerabilities
1. **Silent Fallback to Qwen Pricing**:
   - In `server/services/finops.js` (`trackUsage`):
     ```javascript
     const rates = PRICING[model] || PRICING["qwen2.5-coder:7b"] || { prompt: 0.0015, completion: 0.002 };
     ```
     Any unpriced model currently inherits Qwen rates silently.
2. **Missing `costAvailable` Contract**:
   - `createUsageMetrics()` does not expose `costAvailable`.
   - `server/routes/chat.js` sends `{ reply, cost: Number(costNum).toFixed(4) }` without `costAvailable` boolean.
   - `client/app.js` renders `sessionCostEl.textContent = `$${data.cost}``. If `cost` is `null`, this renders `"$null"`.

### Additive Contract for D1 / D3
- `metrics.costAvailable` boolean added to telemetry state (`true` by default for known pricing and demo mode).
- Once an unpriced model contributes usage during a session, `costAvailable` becomes `false` and remains `false` until session reset.
- Internal numeric `cost` remains finite for known-price accumulation, but `/chat` serializes `cost: null` and `costAvailable: false` if any unpriced contribution occurred.
- Known-price and demo replies retain formatted cost string (`"0.0000"`, etc.) and `costAvailable: true`.
- Client renders `"Unavailable"` for `costAvailable: false` (never `"$null"` or a misleading `$0.0000`).
- Session store hydration and commit retain `costAvailable`.

### Affected Existing Test Inventory
- `server/tests/finops.test.js`: Directly verifies pricing calculations, cumulative usage, and simulated model zero-cost. Must be extended for unknown model pricing (`costAvailable: false`, `cost: null`).
- `server/tests/env.test.js`: Must test validation of `LLM_PROVIDER` (`auto|openai|gemini|ollama`), `GEMINI_MODEL` (trimmed bare ID), and `RETRIEVAL_MODE` (`vector|keyword`).
- `server/tests/chatRoute.test.js`: Verifies `POST /chat` response contract (`{ reply, cost }`). Additive `costAvailable: true` must preserve compatibility.
- `server/tests/modes.test.js`: Tests mode isolation and key precedence. Must verify explicit `LLM_PROVIDER=gemini` behavior with both keys present.
- `server/tests/b3Regressions.test.js`: Manages `process.env.GEMINI_API_KEY` lifecycle in test hooks.
- `server/tests/chatErrors.test.js`: Manages `process.env.GEMINI_API_KEY` in test setup.
- `server/tests/sessions.test.js`: Tests session persistence and eviction across provider failures including simulated Gemini timeouts.
- `server/tests/upstream.test.js`: Tests URL sanitization for Google Generative Language endpoints.
- `tests/browser/console.spec.js`: Browser assertions on `#session-cost` element text.

---

## 6. Readiness for Task D1

- Baseline branch: `fix/gemini-support-recovery` cleanly based on `5d49ca5`.
- Baseline test suite: 116/116 tests passing, exit code 0.
- All governing guardrails and session safety contracts preserved.
- Ready for Task D1: Explicit Gemini selection, bare model validation, header authentication, multipart text response parsing, and unknown-model pricing telemetry.
