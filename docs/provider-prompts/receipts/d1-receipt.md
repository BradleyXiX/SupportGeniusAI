# Task D1 Receipt — Explicit Gemini Selection & Bounded Generation

- **Task**: D1 — Explicit Gemini Selection & Bounded Generation
- **Branch**: `fix/gemini-support-recovery`
- **Base SHA**: `a709255` (`docs: record D0 baseline, gemini recovery plan, prompt packet, and receipt`)
- **Status**: Complete. Provider selection, bare model validation, fixed-host header-auth, multipart/thought parsing, and additive FinOps unavailable pricing semantics implemented test-first. Zero product regressions.

---

## 1. Verified Baseline & Clean State

- **Branch Verified**: `fix/gemini-support-recovery`
- **Initial Working Tree**: Clean
- **Ancestry**: Fast-forwarded from `origin/main` (`5d49ca5`), which incorporated PR4 (`4d01154`).

---

## 2. Test-First Implementation & Named Adverse Tests

Prior to modifying production services, tests were authored covering all required failure and adverse scenarios. The test suite failed cleanly in the Red phase and passed in the Green phase:

1. **Invalid Config**: Rejects unrecognized `LLM_PROVIDER` options (e.g. `openrouter`), rejects non-bare `GEMINI_MODEL` containing slashes, paths, URLs, query parameters, or spaces (`env.test.js`).
2. **Legacy Auto Precedence**: Preserves OpenAI -> Gemini -> Ollama precedence when `LLM_PROVIDER=auto` (`geminiProvider.test.js`).
3. **Explicit Gemini with Both Keys**: When `LLM_PROVIDER=gemini` and both `OPENAI_API_KEY` and `GEMINI_API_KEY` exist, resolves to Gemini and never contacts OpenAI (`geminiProvider.test.js`).
4. **Missing Key/Model in Support Mode**: Fails closed with validation error or `UpstreamError` when support resolves to Gemini without required credentials or bare model ID (`env.test.js`, `geminiProvider.test.js`).
5. **Demo Mode Without Configuration**: When `APP_MODE=demo`, zero network calls occur even if keys/models are absent, returning simulated reply with zero cost and `costAvailable: true` (`geminiProvider.test.js`).
6. **Multipart Text**: Combines multiple non-empty text parts from the first candidate into single answer text (`geminiProvider.test.js`).
7. **Thought Parts**: Explicitly filters out parts where `thought: true`, returning answer parts only (`geminiProvider.test.js`).
8. **Blocked/Empty Response**: Fails closed with `UpstreamError` (`kind: "shape"`, HTTP 502 Problem Details) on safety blocks, candidate empty arrays, or whitespace-only parts (`geminiProvider.test.js`).
9. **Invalid JSON**: Fails closed with `UpstreamError` (`kind: "parse"`) when upstream returns non-JSON or HTML gateway errors (`geminiProvider.test.js`).
10. **HTTP 401 / 429 / 5xx**: Correctly maps upstream status codes without leaking credentials or query strings (`geminiProvider.test.js`).
11. **Parent Abort**: Cleanly cancels via `AbortController` signal, throwing `UpstreamError` (`kind: "timeout"`) without dangling sockets (`geminiProvider.test.js`).

---

## 3. Implementation Details

### Configuration (`server/config/env.js`)
- Added `LLM_PROVIDER: z.enum(["auto", "openai", "gemini", "ollama"]).default("auto")`.
- Added `RETRIEVAL_MODE: z.enum(["vector", "keyword"]).default("vector")`.
- Added `GEMINI_MODEL: z.string().optional().default("").transform(s => s ? s.trim() : "")` with regex validation enforcing bare model ID (`^[a-zA-Z0-9_.-]+$`).
- Configured `superRefine` rules: In support mode, explicit `gemini` requires `GEMINI_API_KEY` and `GEMINI_MODEL`; explicit `openai` requires `OPENAI_API_KEY`; `auto` resolving to Gemini requires `GEMINI_MODEL`. In demo mode, provider keys and models are optional.

### LLM Service (`server/services/llm.js`)
- Added `resolveLLMProvider({ mode })` enforcing explicit selection and auto precedence.
- Added `extractGeminiText(data)` combining first candidate text parts and discarding `p.thought === true`.
- Updated Gemini generation to fixed endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`.
- Authenticates via `x-goog-api-key: process.env.GEMINI_API_KEY` header, eliminating API keys from URLs.
- Bound to 20s deadline via `fetchJsonBounded` with shape validation.

### FinOps & Additive Unavailable Pricing Contract (`server/services/finops.js` & `server/routes/chat.js`)
- Added deployment candidate `gemini-3.1-flash-lite` to `PRICING`:
  - Text input: $0.25 / 1M tokens = `prompt: 0.00025` per 1K tokens.
  - Text output (including thinking tokens): $1.50 / 1M tokens = `completion: 0.0015` per 1K tokens.
- Additive `costAvailable` contract:
  - `metrics.costAvailable` is boolean (defaults to `true` on creation and for legacy sessions).
  - Unpriced / unknown models set `metrics.costAvailable = false`.
  - Once set to `false`, it remains sticky `false` for that session until reset.
  - Removed silent fallback to `qwen2.5-coder:7b` rates.
  - `formatSessionCost(metrics)` returns `"Unavailable"` when `costAvailable === false`.
- Route API Contract (`POST /chat`):
  - When `costAvailable === true`: serializes `{ reply, cost: "0.0000", costAvailable: true }`.
  - When `costAvailable === false`: serializes `{ reply, cost: null, costAvailable: false }`.
  - Avoids `NaN` and prevents serialization crashes on `null`.

---

## 4. Contract for Task D3 (Browser UI Rendering)

To render telemetry safely without guessing in D3:
1. When `/chat` response contains `costAvailable === false` or `cost === null`:
   - `#session-cost` must display `"Unavailable"` (never `"$null"` or `"$0.0000"`).
2. When `costAvailable === true`:
   - `#session-cost` displays `$${data.cost}`.
3. On session reset:
   - `#session-cost` resets to `"$0.0000"`.

---

## 5. Verification Results

- **Command**: `npm test` (`vitest run`)
- **Process Exit Code**: `0`
- **Test Suites**: 15 passed of 15
- **Total Tests**: 142 passed of 142 (0 failed)
- **Duration**: 8.23s

---

## 6. Readiness for Task D2

- All D1 objectives complete.
- Branch clean and verified.
- Next task: D2 (`Explicit keyword retrieval without embeddings`).
