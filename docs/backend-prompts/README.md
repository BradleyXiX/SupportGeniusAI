# Safe foundation Gemini prompts

Design approved 7 November 2026. Run one task at a time. B1 starts the separate branch; B2–B7 depend on prior receipts and commits. Codex reviews the completed branch. The older B0 in the frontend packet was assessment only; this packet supersedes it for implementation scope.

# B1 — Safe backend branch and baseline

Paste this into Antigravity with SupportGeniusAI open. It prepares the separate backend branch and packet; product code is not changed in B1.

```text
Read these local packet files:
C:/Users/Admin/Documents/Codex/2026-11-06/im/outputs/supportgenius-backend-foundation/01-safe-foundation-design.md
C:/Users/Admin/Documents/Codex/2026-11-06/im/outputs/supportgenius-backend-foundation/02-implementation-plan.md
C:/Users/Admin/Documents/Codex/2026-11-06/im/outputs/supportgenius-backend-foundation/03-gemini-prompts.md

Execute Task B1 only. Inspect the actual checkout/AGENTS/Git status first. The reviewed frontend is design/signal-desk-v1 at 03886d2; create feature/safe-support-foundation from that exact local branch if still current and clean. Preserve the frontend branch. Do not use older origin/main and drop completed frontend work. If the target branch exists or local work differs, inspect and report instead of resetting/stashing. Do not push, merge, deploy or alter Render settings.

Copy the approved design to docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md, plan to docs/superpowers/plans/2026-11-07-safe-support-foundation.md, and prompt packet to docs/backend-prompts/README.md. Record ancestry and the safety scope in a concise repo routing note if needed; preserve the existing skill library.

Run the baseline without paid keys or a client webhook. Expected prior counts were 39 unit and 45 browser tests. Record actual exit codes; the inherited under 50 ms cache unit assertion is intermittent, and Codex's browser runner needed shutdown intervention after all 45 individual results passed. Do not hide a hang or claim an unobserved clean exit. B6 will replace the brittle cache assertion with cache-reuse evidence.

Commit only packet/routing/receipt docs. Return branch/base/head SHA, current status, baseline evidence, discrepancies and readiness for B2. Stop before product code. If the packet cannot be read, ask me to attach it rather than reconstructing it from memory.
```

# B2 — Explicit modes and disabled actions

```text
Implement only the named task in the approved SupportGeniusAI safe-support-foundation plan. Work in the actual SupportGeniusAI repository in Antigravity, not Quillon. Read applicable AGENTS.md, docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md and docs/superpowers/plans/2026-11-07-safe-support-foundation.md, then the previous receipt.

The user chose safe foundation first. Real actions are disabled in every mode; this phase does not authorize a real booking/order/CRM integration. Keep Signal desk/vanilla/Express. Anonymous cookie sessions are not customer identity. No self-service SaaS scope, global installs, real API keys, real webhook calls, merge, deployment, forced branch/reset or unrelated refactoring. Use standard reviewed session middleware, not homemade cryptography. Do not weaken production Secure cookies or exact Origin validation for tests. Never print .env, cookies, session IDs or keys.

Write the named behavioral regressions first, observe failures, then implement and run the owning checks. Follow task file ownership and exact interface transitions. Commit only this task and its tests/receipt. If current source or prerequisites differ, report evidence before expanding scope. Intermediate commits are not deployment approval.

Return under 400 words: task; branch/base/head SHA; changed files; test commands/counts/exit codes; explicit limitations; configuration names/dependency versions without secret values; next task; git status --short. Stop after this task. A green screenshot or an old receipt is not proof that a command exited successfully.

Implement only B2. Add explicit support/demo modes, no-secret /capabilities, and an unconditional zero-dispatch action gate. Demo makes no chat/embedding/webhook requests and clearly labels simulation. Support provider failure never simulates. Change the tests that currently require invented order/booking/address success; do not keep unsafe behavior just to preserve old test counts. Preserve existing signatures until the deliberate B4 session refactor.
```

# B3 — Bounded provider requests and safe errors

```text
Implement only the named task in the approved SupportGeniusAI safe-support-foundation plan. Work in the actual SupportGeniusAI repository in Antigravity, not Quillon. Read applicable AGENTS.md, docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md and docs/superpowers/plans/2026-11-07-safe-support-foundation.md, then the previous receipt.

The user chose safe foundation first. Real actions are disabled in every mode; this phase does not authorize a real booking/order/CRM integration. Keep Signal desk/vanilla/Express. Anonymous cookie sessions are not customer identity. No self-service SaaS scope, global installs, real API keys, real webhook calls, merge, deployment, forced branch/reset or unrelated refactoring. Use standard reviewed session middleware, not homemade cryptography. Do not weaken production Secure cookies or exact Origin validation for tests. Never print .env, cookies, session IDs or keys.

Write the named behavioral regressions first, observe failures, then implement and run the owning checks. Follow task file ownership and exact interface transitions. Commit only this task and its tests/receipt. If current source or prerequisites differ, report evidence before expanding scope. Intermediate commits are not deployment approval.

Return under 400 words: task; branch/base/head SHA; changed files; test commands/counts/exit codes; explicit limitations; configuration names/dependency versions without secret values; next task; git status --short. Stop after this task. A green screenshot or an old receipt is not proof that a command exited successfully.

Implement only B3. Build the shared size/deadline-aware JSON helper and propagate parent cancellation through retrieval/generation. Hold timers through body parsing; test immediate headers with stalled bodies, already-aborted signal, wrong shape, oversized response, independent controllers and nonleaking logs. Embedding fallback must not swallow a parent abort and start new work. Keep live actions disabled; no provider/model migration or real paid smoke test.
```

# B4 — Server-owned anonymous sessions

```text
Implement only the named task in the approved SupportGeniusAI safe-support-foundation plan. Work in the actual SupportGeniusAI repository in Antigravity, not Quillon. Read applicable AGENTS.md, docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md and docs/superpowers/plans/2026-11-07-safe-support-foundation.md, then the previous receipt.

The user chose safe foundation first. Real actions are disabled in every mode; this phase does not authorize a real booking/order/CRM integration. Keep Signal desk/vanilla/Express. Anonymous cookie sessions are not customer identity. No self-service SaaS scope, global installs, real API keys, real webhook calls, merge, deployment, forced branch/reset or unrelated refactoring. Use standard reviewed session middleware, not homemade cryptography. Do not weaken production Secure cookies or exact Origin validation for tests. Never print .env, cookies, session IDs or keys.

Write the named behavioral regressions first, observe failures, then implement and run the owning checks. Follow task file ownership and exact interface transitions. Commit only this task and its tests/receipt. If current source or prerequisites differ, report evidence before expanding scope. Intermediate commits are not deployment approval.

Return under 400 words: task; branch/base/head SHA; changed files; test commands/counts/exit codes; explicit limitations; configuration names/dependency versions without secret values; next task; git status --short. Stop after this task. A green screenshot or an old receipt is not proof that a command exited successfully.

Implement only B4. Read current express-session/store docs and inspect/pin dependencies. Introduce bounded cookie-owned sessions, exact origin checks, server single-flight and explicit persistence. Replace legacy string-ID agent/provider interfaces with the final context interfaces in the plan and update every caller/test. Test two cookie jars with the same submitted body sessionId, forged/expired/evicted cookies, rotation, delayed saves, concurrent requests and store failure. No old global history/usage maps or automatic session resurrection. Keep production Secure cookies and HttpOnly IDs; no login/customer-account authority is added.
```

# B5 — Connect console to sessions and capabilities

```text
Implement only the named task in the approved SupportGeniusAI safe-support-foundation plan. Work in the actual SupportGeniusAI repository in Antigravity, not Quillon. Read applicable AGENTS.md, docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md and docs/superpowers/plans/2026-11-07-safe-support-foundation.md, then the previous receipt.

The user chose safe foundation first. Real actions are disabled in every mode; this phase does not authorize a real booking/order/CRM integration. Keep Signal desk/vanilla/Express. Anonymous cookie sessions are not customer identity. No self-service SaaS scope, global installs, real API keys, real webhook calls, merge, deployment, forced branch/reset or unrelated refactoring. Use standard reviewed session middleware, not homemade cryptography. Do not weaken production Secure cookies or exact Origin validation for tests. Never print .env, cookies, session IDs or keys.

Write the named behavioral regressions first, observe failures, then implement and run the owning checks. Follow task file ownership and exact interface transitions. Commit only this task and its tests/receipt. If current source or prerequisites differ, report evidence before expanding scope. Intermediate commits are not deployment approval.

Return under 400 words: task; branch/base/head SHA; changed files; test commands/counts/exit codes; explicit limitations; configuration names/dependency versions without secret values; next task; git status --short. Stop after this task. A green screenshot or an old receipt is not proof that a command exited successfully.

Implement only B5. Keep the approved presentation. Add mode/session bootstrap with Send disabled until valid initialization, correct failure states and no browser-stored session ID. New conversation is disabled while chat is pending and rotates server session before clearing transcript/cost. On401 require explicit session restart; on409 do not automatically retry. Update obsolete reset-while-pending UI assertions to the newly approved behavior while retaining generation/ownership protections. Preserve sanitizer, IME, knowledge status, reduced motion and A7 request-body deadline fixes.
```

# B6 — Deterministic cache checks and deployment guide

```text
Implement only the named task in the approved SupportGeniusAI safe-support-foundation plan. Work in the actual SupportGeniusAI repository in Antigravity, not Quillon. Read applicable AGENTS.md, docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md and docs/superpowers/plans/2026-11-07-safe-support-foundation.md, then the previous receipt.

The user chose safe foundation first. Real actions are disabled in every mode; this phase does not authorize a real booking/order/CRM integration. Keep Signal desk/vanilla/Express. Anonymous cookie sessions are not customer identity. No self-service SaaS scope, global installs, real API keys, real webhook calls, merge, deployment, forced branch/reset or unrelated refactoring. Use standard reviewed session middleware, not homemade cryptography. Do not weaken production Secure cookies or exact Origin validation for tests. Never print .env, cookies, session IDs or keys.

Write the named behavioral regressions first, observe failures, then implement and run the owning checks. Follow task file ownership and exact interface transitions. Commit only this task and its tests/receipt. If current source or prerequisites differ, report evidence before expanding scope. Intermediate commits are not deployment approval.

Return under 400 words: task; branch/base/head SHA; changed files; test commands/counts/exit codes; explicit limitations; configuration names/dependency versions without secret values; next task; git status --short. Stop after this task. A green screenshot or an old receipt is not proof that a command exited successfully.

Implement only B6. Replace brittle elapsed<50ms unit gating with controlled cache-reuse assertions that prove cached chunks load and cause zero re-embedding. Do not remove useful coverage or increase the threshold until green. Keep model-aware cache design and retrieval-quality changes out of this task. Write accurate mode/origin/secret/HTTPS/proxy/store/retention setup docs and ADR. Document one-process/ephemeral limits and new production variables without setting production or printing secrets.
```

# B7 — Whole-branch verification and handoff

```text
Implement only the named task in the approved SupportGeniusAI safe-support-foundation plan. Work in the actual SupportGeniusAI repository in Antigravity, not Quillon. Read applicable AGENTS.md, docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md and docs/superpowers/plans/2026-11-07-safe-support-foundation.md, then the previous receipt.

The user chose safe foundation first. Real actions are disabled in every mode; this phase does not authorize a real booking/order/CRM integration. Keep Signal desk/vanilla/Express. Anonymous cookie sessions are not customer identity. No self-service SaaS scope, global installs, real API keys, real webhook calls, merge, deployment, forced branch/reset or unrelated refactoring. Use standard reviewed session middleware, not homemade cryptography. Do not weaken production Secure cookies or exact Origin validation for tests. Never print .env, cookies, session IDs or keys.

Write the named behavioral regressions first, observe failures, then implement and run the owning checks. Follow task file ownership and exact interface transitions. Commit only this task and its tests/receipt. If current source or prerequisites differ, report evidence before expanding scope. Intermediate commits are not deployment approval.

Return under 400 words: task; branch/base/head SHA; changed files; test commands/counts/exit codes; explicit limitations; configuration names/dependency versions without secret values; next task; git status --short. Stop after this task. A green screenshot or an old receipt is not proof that a command exited successfully.

Execute only B7. Run reproducible install, unit/integration and full browser suites and require actual exits. Verify all safety invariants from the spec using mocks/fake clocks/loopback fixtures: zero action dispatch, demo zero provider requests, support never silently simulates, isolated history/usage, cookie/origin/expiry/concurrency/save failure, body deadlines and safe error/log content. Inspect screenshots and client bootstrap/reset/expiry/keyboard/reduced-motion flows. Review the entire diff against B1 base. Return exact counts, head SHA and limitations. Do not claim real client readiness or merge/push/deploy. Backend identity/integrations and answer-quality remain deferred.
```
