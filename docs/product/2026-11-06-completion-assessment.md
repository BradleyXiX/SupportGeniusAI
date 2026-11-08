# SupportGeniusAI completion assessment

6 November 2026. Target: customized deployments for individual clients, not a self-service multi-tenant SaaS.

## Verdict

There is a useful MVP foundation: Express, validated chat input, document chunking, embeddings with keyword fallback, short in-memory conversation history, configurable webhook dispatch, provider adapters, request rate limits and a test suite. It is not yet a dependable client deployment. A frontend redesign alone will not make its actions, privacy boundaries or retrieval trustworthy.

The Gemini excerpt describes a commercial service: configure a client's support knowledge and workflows, deploy it, and maintain it. Prices and claims in that excerpt are historical proposals, not validated product outcomes. Quillon changes, unrelated repo changes and global CLI installs are outside this task.

## Evidence and verification limits

- Remote main: 9b500e2f7e4b07329a4b7e5873ebd22c5bfa239c, merging hardening branch 66107c9. The copied local source tree matches this main tree. Local main ref was stale; fetching in the isolated review copy resolved that discrepancy. Existing frontend branch 0a6df66 is preserved.
- Original checkout was readable through filesystem APIs, but Git could not enter it. An isolated copy with copied Git metadata was used for inspection and tests; no original app files, branch, index, deployment settings or remote branches were changed.
- 29/29 existing tests pass with the tracked vector-cache fixture present, paid provider keys removed and Ollama directed to an unused local port. This exercises simulation/fixtures, not live model quality. On a clean snapshot without that tracked cache, one test fails because it assumes the cache exists.
- In a local production-mode browser, clicking Send with input populated produced zero user messages and a CSP script-src-attr error. Desktop/mobile screenshots are supplied. This is observed in the source-equivalent local build; the production deployment URL, environment and logs have not been inspected.
- No actual paid LLM calls, customer webhooks, address changes or bookings were executed. No coverage percentage, real-world latency, penetration test or AI accuracy claim is made.

## Priority findings

### P0: fix before serving real customer actions

1. **False action success on failure.** server/services/agent.js:33,79,87: missing, failed or non-2xx webhook calls return null; callers substitute transit/address-update/appointment-confirmation text. bookAppointment invents an appointment ID and claims SMS delivery. Tests currently bless this behavior. Production must fail closed with a structured unavailable/failed result; demo data must require explicit demo mode and be disclosed. Test timeout, non-2xx, malformed and ambiguous results. Never infer that an action completed from fluent LLM wording.
2. **Missing customer authorization.** server/index.js:94 mounts /chat with an IP rate limiter, not authentication. The comment “Protected” is not a security control. The model can invoke address changes/appointments without server-side customer verification, operation authorization, confirmation or idempotency. Establish client-specific action permissions and verified identity before any account data/action. Public knowledge Q&A can remain public with abuse limits; sensitive actions need a separate boundary.
3. **Session IDs are caller-selected, not ownership-bound.** server/services/agent.js:7 indexes shared history by the supplied sessionId. Guess-resistant browser IDs alone are not authorization. Bind memory to a server-issued session/customer context; enforce expiry/capacity and serialize same-session requests. The history map is unbounded in number of sessions; MAX_TURNS=6 limits entries (roughly three user/assistant exchanges), not six full exchanges. Process restarts lose it. Decide and document retention and deletion for each client.
4. **Unsafe model-output fallback.** client/app.js:102–104 sends parsed or raw output into innerHTML if DOMPurify is unavailable. Fail safe to textContent and test malicious markup and CDN failure. Pin/vendor browser libraries. The current unversioned marked CDN URL is a reproducibility risk.
5. **Click paths blocked by CSP.** client/index.html uses onclick/onkeypress while server/index.js sets strict script attribute policy. Browser reproduction confirms Send fails. Replace inline handlers with listeners; keep CSP intact. Check suggestions, reset and keyboard send too.

### P1: reliability needed for the first maintained client

6. **Retrieval has no evidence metadata or relevance rejection.** vectorStore.js:100 always returns top-K text even for zero relevance; rag.js joins strings, discarding source identity. Return document/chunk IDs, bounded snippets and relevance metadata; implement a calibrated no-evidence path. Add a small client-specific evaluation set with answerable, unanswerable and adversarial questions. Source chips must come from retrieval metadata, never the model's imagination. XML fences organize prompts but cannot prove resistance to prompt injection.
7. **Embedding cache is not model-aware.** vectorStore.js:60 uses only a text hash; embeddings.js:80 truncates mismatched vectors with Math.min. Namespace cache entries by embedding provider/model/version/dimension and preprocessing; reject dimension mismatch, invalidate/rebuild safely, and write atomically. Initialization appends without clearing, so repeated initialization can duplicate records. Tests should cover reindex/update/delete and repeated startup.
8. **No bounded upstream requests.** LLM, embedding and webhook fetches have no explicit application timeout/cancellation budget. Add timeout/error taxonomy, response validation and request IDs. Allow deliberate provider configuration instead of implicit key precedence, check configured model availability against official docs when implementing, and report provider failure without exposing raw upstream bodies. Client timeout is not proof the backend stopped.
9. **Readiness is overstated.** /health always says healthy and client labels a 200 response AI-online, although provider or knowledge may be unusable. Separate liveness from readiness; keep platform health semantics deliberate so transient model failures do not create restart loops. Show server reachability and knowledge availability without implying verified model/tool readiness.
10. **Webhook integration needs an operational contract.** Add authenticated/signed dispatch, schema-validated action params and results, destination policy, least privilege, idempotency key, replay handling and audit records. Mutations need explicit customer confirmation and safe retries. A generic webhook URL is a useful adapter, not a completed CRM/booking integration.
11. **Errors may disclose internals.** chat.js:29 and index.js:106 return err.message; llm.js includes upstream error content. Return stable client errors with correlation IDs; log useful details privately with secrets and customer text redacted. Test that provider bodies, internal paths and credentials never reach the UI.
12. **Cost is an estimate with incomplete accounting.** finops.js contains static rates and assigns synthetic usage costs to local models. It is neither a client invoice nor exact provider billing, and embedding costs are omitted. Expose provider/model/estimated flag only through an intentional contract; document the pricing date and separate local infrastructure cost from cloud API usage. The TTL implementation refreshes access without checking expiry on reads, so promised expiry is not strictly enforced.

### P2: client delivery and maintainability

13. **Knowledge onboarding is file copying and restart.** Define an operator how-to: supported .txt/.md files, size/encoding limits, versioning, deterministic reindex, deletion and verification. File-based onboarding can be sufficient for the first client; a browser upload/admin dashboard is optional. The README's PDF/ChromaDB language is not implemented by the inspected store.
14. **No human escalation workflow.** Choose one real route per client (existing helpdesk, email or callback). Do not ship a decorative “Contact support” button. Record unresolved questions only under a clear retention policy.
15. **Deployment recipes need a tested setup.** docker-compose starts Ollama without pulling chat/embed models or proving readiness. Startup ordering is not model readiness. Render does not automatically reach Ollama on the developer's laptop. Document cloud/local topology, model provisioning, origin allowlist, Node version, secret setup, backing storage, backups and restart behavior. Persistent storage choice depends on retention needs; a large vector database is not automatically necessary.
16. **CI/browser checks are missing.** Add reproducible install/test and frontend behavior checks, bounded fixtures and a preview checklist. Keep live-provider smoke tests separate and explicitly authorized. Current tests do not catch broken Send, unsafe sanitizer failure or false production action success; passing tests preserve some wrong expectations.
17. **Documentation and marketing need reconciliation.** Replace stateless/enterprise/zero-hallucination/zero-cost implications with verified behavior. Keep service pricing off the UI until the user approves an actual offer. A deployable demo, a paid client install and multi-tenant SaaS are different completion milestones.

## Suggested delivery order and release boundaries

A. Visual redesign preview: approved spec, existing API, CSP-compatible listeners, safe rendering, request-state UX and demo disclosure. Separate branch/PR. It may be shown as an explicitly labeled demo; it does not approve real actions.
B. Client safety: fail-closed action behavior, customer/action authorization, session ownership and bounds, safe errors, webhook idempotency/confirmation. Separate tested PR. Gate customer use here.
C. Answer quality and operations: model-aware index, source metadata, no-evidence behavior, evaluation set, timeouts and readiness.
D. First-client packaging: one selected integration, knowledge refresh procedure, supported deployment topology, privacy/retention configuration, real escalation and an acceptance walkthrough.
E. Later only if demanded: self-service signup, cross-tenant storage, billing, dashboards, embedded widget distribution and broad integrations.

For a public demo before B is complete, disable mutating tools in production and disclose simulation. Do not leave invented confirmations active simply because the redesign is on a separate branch.

## Definition of first-client completion

A client can supply approved knowledge, verify grounded answers and refusals, use one authenticated and confirmed action without duplicate side effects, recover visibly from provider outages, escalate through a real channel, understand retention and cost estimates, and restart/redeploy without unexplained data loss. A documented owner can update knowledge, rotate secrets and diagnose failures. Desktop/mobile keyboard/reduced-motion paths work. Independent acceptance evidence exists; visual polish alone is insufficient.

## Open information

The actual live URL, Render production branch/autodeploy settings, first-client industry, customer identity source, chosen integration and escalation destination are not yet supplied. These do not block the visual spec, but do block claiming the client deployment complete. Do not infer a healthcare compliance promise from the medspa examples.
