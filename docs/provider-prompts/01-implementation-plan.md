# Gemini support recovery — implementation plan

> For agentic workers: use superpowers:executing-plans task by task. Do not implement the whole packet in one turn.

Goal: Make support mode usable through an explicitly selected Gemini provider without OpenAI billing or an Ollama dependency, while preserving existing session safety.
Architecture: Keep vanilla/Express and the existing bounded HTTP helper. Add explicit provider and retrieval selection, configurable Gemini text-model ID, complete text-response parsing and safe failure copy. Use keyword retrieval for the initial small knowledge base. No orb redesign in this release.
Spec: the scope and interface decisions below constitute the implementation specification for this packet.

## Decisions / constraints
- LLM_PROVIDER=auto|openai|gemini|ollama; default auto preserves existing key precedence. Explicit gemini never contacts OpenAI/Ollama for chat even if their credentials are present. Explicit provider missing credentials fails startup in support mode; demo requires no provider credentials or model.
- GEMINI_MODEL is a trimmed, nonempty bare model ID required when support resolves to Gemini. Reject URL/path/query characters; do not hardcode a retired model or silently select another model. Verify a currently available text model and free-tier eligibility from official Google docs; user project access remains separately unverified.
- RETRIEVAL_MODE=vector|keyword, default vector preserves existing behavior. Keyword means zero embedding calls at startup AND query time, zero vector-cache writes, deterministic keyword ranking of local .txt/.md chunks. Do not require or load cached embedding vectors in this mode. Existing vector behavior remains covered and unchanged.
- Chat20s / embedding5s / server30s / browser45s / session-operation15s,1MiB upstream bound retained. Parent cancellation retained, including keyword-only paths.
- Gemini API keys go in the supported x-goog-api-key header, not a URL. Endpoint remains fixed at Google's service with safely validated model segment. Reuse fetchJsonBounded.
- Choose the first candidate; combine nonempty text parts from that candidate only, excluding thought=true parts. No valid text (including blocked/safety-only replies) is a safe provider failure. Do not expose raw upstream bodies, prompts or keys.
- Cost telemetry must not price new Gemini IDs using the unrelated Qwen fallback. Add an explicit verified PRICING entry for the selected supported model and preserve session-scoped token estimates. Label estimates as estimates; do not promise the free tier is unlimited or that numeric estimates equal billing. Unknown models must not silently acquire another model's price: use an explicit unavailable estimate indication, propagated without NaN/serialization bugs. Existing known-model/demo responses remain compatible. Exact additive contract: metrics.costAvailable is boolean (missing legacy field means true); once an unpriced model contributes usage it remains false for that session until reset. Keep internal numeric cost finite for known-price accumulation, but serialize cost:null and costAvailable:false when any contribution is unpriced. Known-price/demo replies retain the existing formatted cost string and costAvailable:true. Client shows “Unavailable” for costAvailable:false, never $null or a misleading zero. Persist the boolean through bounded session hydration/commit and reset it with fresh metrics; test these transitions.
- Browser failure copy: 'No reply received. Please try again. If the problem continues, contact support.' Keep exact 401/409/422/429/session recovery behavior; no claim that an action may have completed because actions are disabled.
- No OpenRouter adapter, new SDK, embeddings provider, model-aware cache migration, framework migration, global installation, live actions, orb redesign, paid calls, push, merge, deploy or hosting mutation in these prompts.

## Review focus
- Both cloud keys present: explicit Gemini selects Gemini only.
- Demo with no model/key: still zero network.
- Keyword mode with a stale/malformed cache: initializes from docs without reading/reusing vectors or writing cache.
- Multi-part/blocked/thought-only Gemini response: render only valid answer text or a safe error.
- Unknown model pricing: unavailable estimate, never fabricated Qwen pricing.

## D0 — Baseline and branch preparation
Files: documentation/receipts only. Inspect current status and remote merge evidence. From clean main freshly fast-forwarded from origin/main, create fix/gemini-support-recovery. Preserve all old branches. Record branch/base/head and test baseline. Identify exact official model and pricing evidence; do not infer user quota. Install this packet in docs/provider-prompts/ and this plan in docs/superpowers/plans/2026-11-08-gemini-support-recovery.md.
- [ ] Confirm clean status; fetch origin; verify PR4 merged and origin/main contains reviewed4d01154.
- [ ] Switch main and pull --ff-only; create fix branch. If dirty/diverged/unmerged, preserve work and report concrete evidence instead of reset/stash/rebase.
- [ ] Run npm test; record actual exit and counts. Do not repeat npm ci unless lock/dependency state requires it.
- [ ] Record Gemini model candidate with official generateContent support, availability/free-tier/pricing references, and existing test assumptions.

## D1 — Explicit Gemini selection and bounded generation
Modify server/config/env.js, server/services/llm.js, server/services/finops.js; add focused provider/config tests and update owning fixtures.
Consumes: existing callLLM(prompt,sessionId,options) and usage context; preserve its public signature and cancellation interface. Produces: the configuration above and correct Gemini response text/usage/estimates.
- [ ] Write failing mocked tests for invalid config, legacy auto precedence, explicit Gemini with both keys, missing key/model, demo without configuration, multipart text, thought parts, blocked/empty response, invalid JSON, HTTP401/429/5xx and parent abort. Assert no raw provider secrets in logs/problem details.
- [ ] Observe focused failures; implement the minimal changes under current session context interfaces.
- [ ] Prove correct fixed host, validated model and header authentication without real calls; preserve timeout/size limits and no cross-provider fallback.
- [ ] Test known selected-model rates and unknown pricing explicitly. Preserve zero demo cost; handle unavailable totals consistently in API/client contract in D3.
- [ ] Run owning tests and full npm test; require exits. Review and commit scoped files, write d1 receipt.

## D2 — Explicit keyword retrieval without embeddings
Modify server/db/vectorStore.js and owning initialization/retrieval tests; use env config from D1 (or add RETRIEVAL_MODE validation here). Preserve initializeStore(), getRelevantChunks(query,topK,{signal}), stats and clearStore interfaces.
- [ ] Write failing controlled-fixture tests for keyword startup/query, no cache read/write, zero getEmbedding calls and zero provider fetch calls even with keys configured; assert exact chunks and deterministic ranking, empty docs and cancellation.
- [ ] Implement keyword-only loading and retrieval; do not change vector mode's cache semantics.
- [ ] Keep cancellation before/after local work and existing action/demo guarantees.
- [ ] Run focused retrieval suites, existing cache tests, modes/session regressions and npm test. Review/commit scoped files and d2 receipt.

## D3 — Client copy, documentation, complete verification
Modify client/app.js, owning browser tests, .env.example, README.md and docs/deployment.md; add d3 receipt. Update FinOps API serialization/client rendering only as required by D1 unavailable estimate contract, preserving response fields for existing known prices.
- [ ] Write failing browser regressions for provider failures/timeouts showing the new exact copy without action-completion claims. Test unavailable cost display without NaN, and retain all recovery/429 states.
- [ ] Implement copy/estimate rendering; no layout/orb changes.
- [ ] Document LLM_PROVIDER=gemini, GEMINI_MODEL=<verified-id>, RETRIEVAL_MODE=keyword, APP_MODE=support, GEMINI_API_KEY private in Render. Explain auto mode's OpenAI precedence, unsupported stale model IDs, and unknown real quota. Never include secrets.
- [ ] Run npm test and full npm run test:browser; record counts and actual process exits. Review diff against D0 base and confirm actions remain disabled, signed sessions intact, no new network in demo/keyword retrieval.
- [ ] Return reviewable branch/commit, changed files, verification and exact manual live-smoke steps. No push, merge or deployment. Live test must confirm chosen model/account access, known-answer quality and safe refusal. Stop for review.

## Thinking Orbs clarification
The approved Signal Desk design deliberately uses a restrained independent vanilla Canvas2D adaptation informed by the shared Thinking Orbs reference. client/orb.js mounts the decorative component; the small console orb is static while idle and changes for pending state, and the landing has a larger composition. This is not the original React component installed verbatim. Do not claim copied source provenance from a comment alone; inspect original source and license if a later visual enhancement is requested. Any more prominent orb is a separate visual task after support recovery.

