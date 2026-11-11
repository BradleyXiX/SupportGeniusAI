# Task D3 Receipt — Browser Telemetry, Safe Failure Copy & Operational Documentation

- **Task**: D3 — Browser Telemetry, Safe Failure Copy, Documentation & End-to-End Verification
- **Branch**: `fix/gemini-support-recovery`
- **D0 Base SHA**: `a709255`
- **Prior D2 SHA**: `76025fd`
- **Status**: Complete. Behavioral tests authored first; client failure copy and telemetry contracts updated; documentation updated across `.env.example`, `README.md`, and `docs/deployment.md`; all 151 unit/contract tests and all 64 browser tests passing with process exit code 0.

---

## 1. Red-to-Green Browser Behavioral Test Implementation

Two new behavioral Playwright tests were added to `tests/browser/console.spec.js` alongside updates to legacy failure assertions:

1. **Exact Provider Failure Copy**:
   - Replaced legacy text `An action may have completed. Verify with the business before repeating your request.` across all 5 existing failure assertions.
   - Verified that provider timeouts (504), network errors, and upstream failures (502) render the exact copy:
     `"No reply received. Please try again. If the problem continues, contact support."`
   - Added explicit assertion: `expect(transcriptText).not.toContain("action may have completed")`.
   - **Red Phase Evidence**: Test failed prior to `client/app.js` edits with expected text not found.
   - **Green Phase Evidence**: Passed cleanly upon updating `client/app.js` lines 720 and 745.

2. **Telemetry Rendering Contract for `#session-cost`**:
   - Added test: `"displays 'Unavailable' on #session-cost when costAvailable is false or cost is null, never $null or $0.0000"`.
   - Mocks `/chat` response with `{ reply: "...", cost: null, costAvailable: false }`.
   - Asserts `#session-cost` textContent equals `"Unavailable"` and never contains `"$null"` or `"$0.0000"`.
   - Asserts that subsequent conversation reset restores `#session-cost` to `"$0.0000"`.
   - **Red Phase Evidence**: Test failed prior to `client/app.js` edits with `received '$null'`.
   - **Green Phase Evidence**: Passed cleanly upon updating `client/app.js` lines 733–736.

---

## 2. Client Code Modifications (`client/app.js`)

1. **Failure Copy Alignment**:
   - Lines 720 & 745: Replaced legacy string with:
     ```javascript
     const fallbackText = "No reply received. Please try again. If the problem continues, contact support.";
     ```
2. **Safe Cost Telemetry Formatting**:
   - Lines 733–736: Replaced bare `$${data.cost}` interpolation with:
     ```javascript
     if (data.costAvailable === false || data.cost === null || data.cost === undefined) {
       sessionCostEl.textContent = "Unavailable";
     } else {
       sessionCostEl.textContent = `$${data.cost}`;
     }
     ```
3. **Preserved Guardrails**:
   - All session recovery paths (401, 409 `SESSION_BUSY`, 422 validation, 429 rate limit countdown) remained intact.
   - Single-flight send locks and explicit `"Waiting for reply"` visual/screen-reader status preserved.
   - Thinking Orbs / Canvas2D implementation (`client/orb.js`) and UI layout completely untouched.

---

## 3. Operational Documentation Updates

1. **`.env.example`**:
   - Documented `LLM_PROVIDER=auto|openai|gemini|ollama` (default `auto`, preserves existing precedence).
   - Documented `GEMINI_MODEL=gemini-3.1-flash-lite` (bare model identifier requirement).
   - Documented `RETRIEVAL_MODE=vector|keyword` (default `vector`; keyword eliminates all embedding calls).
   - Documented that setting `LLM_PROVIDER=gemini` + `RETRIEVAL_MODE=keyword` allows running support mode using `GEMINI_API_KEY` alone.
   - Explicit caveat: Free tier availability and account quota allowances are not guaranteed; list-price estimates ($0.25/1M input, $1.50/1M output including thoughts) apply.
2. **`README.md`**:
   - Updated Support-mode configuration table with explicit providers and retrieval modes.
   - Added dedicated "Gemini-only Support Deployment" section documenting zero-embedding setup, model lifecycle status (active `gemini-3.1-flash-lite`, deprecated 1.5/2.0), and quota caveat.
3. **`docs/deployment.md`**:
   - Added `LLM_PROVIDER`, `GEMINI_MODEL`, and `RETRIEVAL_MODE` to the environment variables specification table.
   - Updated the Render deployment checklist with Gemini-only keyword configuration guidance.
   - Added warnings regarding Google Cloud Console quota verification.

---

## 4. Verification Evidence & Test Run Log

1. **Unit & API Contract Test Suite (`npm test`)**:
   - Process Exit Code: `0`
   - Test Files: 16 passed (16 total)
   - Tests: 151 passed (151 total)
   - Duration: 7.39s
2. **End-to-End Browser Test Suite (`npm run test:browser`)**:
   - Process Exit Code: `0`
   - Test Files: 3 passed (all browser specifications: `console.spec.js`, `marketing.spec.js`, `orb.spec.js`)
   - Tests: 64 passed (64 total)
   - Duration: 2.7m
3. **Architectural Guardrails Verified Across Entire Diff (`a709255..HEAD`)**:
   - **Demo Zero Network**: Enforced via `modes.test.js` (0 network fetch calls).
   - **Keyword Zero Embeddings**: Enforced via `keywordRetrieval.test.js` (0 `getEmbedding` calls, 0 cache reads/writes).
   - **Unconditional Action Disablement**: Enforced via `capabilities.test.js` (`actionsEnabled: false`).
   - **Anonymous Server Cookie Ownership**: Enforced via `console.spec.js` (0 session tokens in localStorage/sessionStorage; HttpOnly cookies).
   - **Vanilla Architecture**: No React, no Lenis, no cursor hijacking; native browser scroll preserved.

---

## 5. Render Deployment Checklist & Single-Request Smoke Instructions

### Manual Render Configuration Checklist (Save Only — Do Not Auto-Deploy)
To configure the web service on Render without triggering uninspected deploys:
1. Navigate to the SupportGeniusAI Web Service settings in the Render Dashboard.
2. Under **Environment Variables**, configure:
   - `NODE_ENV`: `production`
   - `APP_MODE`: `support`
   - `LLM_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: `<your-gemini-api-key>`
   - `GEMINI_MODEL`: `gemini-3.1-flash-lite`
   - `RETRIEVAL_MODE`: `keyword`
   - `PUBLIC_ORIGIN`: `https://<your-service-name>.onrender.com`
   - `SESSION_SECRET`: `<generated-32-char-random-hex-string>`
   - `PORT`: `10000`
3. Click **Save Changes** (do NOT click "Manual Deploy" until configuration is verified).

### Authorized Single-Request Support Smoke
Once deployment is manually initiated and completed, verify end-to-end operation with a single request:
1. Open `https://<your-service-name>.onrender.com/console/` in an incognito browser window.
2. Verify the status beacon indicates connected and initial welcome appears.
3. Submit a single domain question covered by `server/data/docs/` (e.g., *"What is your return policy?"*).
4. Verify:
   - A grounded reply is generated.
   - Cost telemetry displays an accurate list-price estimate (or `"Unavailable"` if model is unrecognized).
   - HTTP status in network tab is `200 OK` with `Set-Cookie` containing signed `sg_session` (`HttpOnly; SameSite=Strict; Secure`).
   - No 502/504 errors appear in the browser console.
