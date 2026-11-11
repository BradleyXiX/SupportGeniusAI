# Task D2 Receipt — Explicit Keyword Retrieval & D1 Corrections

- **Task**: D2 — Explicit Keyword Retrieval Mode (with prior D1 correction commit)
- **Branch**: `fix/gemini-support-recovery`
- **D1 Correction Commit**: `2bbc9b0` (`fix(llm): include thoughtsTokenCount in gemini output cost and enforce own-property check on PRICING`)
- **D2 Base SHA**: `2bbc9b0`
- **Status**: Complete. D1 corrections committed separately with regressions; explicit keyword retrieval mode implemented test-first without cache access or embedding provider dependencies; 16 test files (151 tests) passing cleanly.

---

## 1. Prior D1 Corrections & Focused Regressions

Prior to D2 implementation, a separate commit (`2bbc9b0`) delivered two required corrections:

1. **Gemini `thoughtsTokenCount` Output Cost Inclusion**:
   - In `server/services/llm.js`, updated completion token calculation:
     ```javascript
     const candidatesTokens = data.usageMetadata?.candidatesTokenCount ?? estimateTokens(responseText);
     const thoughtsTokens = data.usageMetadata?.thoughtsTokenCount ?? 0;
     completionTokens = candidatesTokens + thoughtsTokens;
     ```
   - Thought text remains strictly filtered and hidden from user-visible replies via `extractGeminiText()`.
   - **Regression Test**: `geminiProvider.test.js` (`includes thoughtsTokenCount in completion tokens and cost while hiding thought text from replies`) proves 12 candidate tokens + 30 thought tokens = 42 completion tokens at $1.50/1M rate while verifying reply contains zero thought text.

2. **FinOps Own-Property Check on `PRICING`**:
   - In `server/services/finops.js`, replaced direct property lookup with `Object.hasOwn()`:
     ```javascript
     const rates = Object.hasOwn(PRICING, model) ? PRICING[model] : undefined;
     ```
   - Inherited prototype names (such as `"constructor"`, `"toString"`, `"valueOf"`) evaluate to `undefined` and are correctly handled as unpriced (`metrics.costAvailable = false`, displaying `"Unavailable"`).
   - **Regression Test**: `finops.test.js` (`treats inherited object prototype properties (e.g. constructor) as unpriced via own-property check`) verifies `"constructor"` and `"toString"` set `costAvailable: false`.

---

## 2. D2 Test-First Implementation (`server/tests/keywordRetrieval.test.js`)

Controlled-fixture tests were authored first and failed cleanly across 4 assertions in the Red phase before implementation:

1. **Zero Cache & Zero Embedding at Startup**:
   - When `RETRIEVAL_MODE=keyword`, `initializeStore()` reads local `.txt`/`.md` documents and loads chunks into memory with `embedding: null`.
   - `vector_cache.json` is never opened for reading or writing (`fs.readFileSync` and `fs.writeFileSync` on cache verified at 0 calls).
   - `getEmbedding()` is called 0 times even if `OPENAI_API_KEY` is present.
2. **Malformed / Corrupt Cache Resilience**:
   - Throws on cache reads simulate corrupt disk cache; `initializeStore()` in keyword mode ignores the cache completely and loads all documents successfully.
3. **Deterministic Keyword Query Scoring**:
   - `getRelevantChunks()` ranks documents using `calculateKeywordScore()` without calling embedding providers.
4. **Parent Cancellation**:
   - Pre-aborted and mid-flight signals throw `UpstreamError` with `kind: "timeout"`.
5. **Empty Documents Handling**:
   - Gracefully returns empty array `[]` when no chunks exist in the store.
6. **Support + Gemini + Keyword End-to-End Independence**:
   - `APP_MODE=support`, `LLM_PROVIDER=gemini`, `RETRIEVAL_MODE=keyword` executed with no `OPENAI_API_KEY` and an unreachable dead-port `OLLAMA_URL` (`127.0.0.1:54321`).
   - `handleChat()` succeeds completely: retrieves knowledge chunks via keyword scoring and executes chat inference via Gemini with zero calls to embedding services or Ollama.
7. **Vector Mode Preservation**:
   - `RETRIEVAL_MODE=vector` (default) preserves existing cache reading, embedding generation, and cosine similarity query behavior.

---

## 3. Implementation Summary (`server/db/vectorStore.js`)

- Checked `RETRIEVAL_MODE` configuration (`vector` | `keyword`, default `vector`).
- In `initializeStore()`:
  - Branch for `keyword` mode parses local documents and stores chunks with `embedding: null`.
  - Skips `loadVectorCache()`, `getEmbedding()`, and `saveVectorCache()`.
- In `getRelevantChunks()`:
  - Checks parent `signal?.aborted` before and after scoring, throwing `UpstreamError({ kind: "timeout" })`.
  - In `keyword` mode, directly calculates keyword scores and returns sorted results without touching `getEmbedding()`.
  - In `vector` mode, preserves existing vector embedding and cosine similarity workflow.

---

## 4. Verification Results

- **Command**: `npm test` (`vitest run`)
- **Process Exit Code**: `0`
- **Test Suites**: 16 passed of 16
- **Total Tests**: 151 passed of 151 (0 failed)
- **Duration**: 8.71s

---

## 5. Readiness for Task D3

- D1 corrections committed and verified.
- D2 keyword retrieval implemented and verified.
- Ready for D3: Client copy, unavailable estimate rendering in browser UI, deployment documentation updates, and live smoke test instructions. Stop before D3.
