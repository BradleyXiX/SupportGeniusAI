# Gemini execution prompts

Recommended strategy: Codex owns the spec and reviews receipts/diffs; Gemini implements one bounded task per session. Open the actual SupportGeniusAI project in Antigravity, not the Quillon project. Review the plan before starting product implementation. Pasting an individual task prompt authorizes that task only.

# A0 — Safe branch and load the packet

Paste this into Antigravity with SupportGeniusAI open. This task prepares the branch and documents; it does not redesign product code.

```text
Act as the implementation engineer for SupportGeniusAI. First read these local files:
C:/Users/Admin/Documents/Codex/2026-11-06/im/outputs/supportgenius-redesign/01-design-spec.md
C:/Users/Admin/Documents/Codex/2026-11-06/im/outputs/supportgenius-redesign/02-product-completion-assessment.md
C:/Users/Admin/Documents/Codex/2026-11-06/im/outputs/supportgenius-redesign/03-implementation-plan.md

Execute only Task 0 / A0. Inspect the current checkout, all applicable project instructions and Git state before modifying anything. Historical review main was 9b500e2; fetch and inspect today's origin/main rather than assuming that SHA is still current. Preserve feature/ecc-production-hardening, feature/frontend-redesign and all unrelated local work. No force reset, stash, merge or production deployment. If the checkout is clean, create design/signal-desk-v1 from verified origin/main; if this branch exists, inspect before resuming.

After branch creation, copy the approved spec to docs/superpowers/specs/2026-11-06-signal-desk-design.md, the plan to docs/superpowers/plans/2026-11-06-signal-desk.md, the assessment to docs/product/2026-11-06-completion-assessment.md, and this prompt packet to docs/design-prompts/README.md. Add only the concise routing note defined in Task 0; don't rewrite the skill library. Execute the Task 0 baseline without paid API keys or live webhooks. Do not expose .env. The previous isolated baseline was 29/29 tests; clicking Send was blocked by inline event handlers under CSP.

Commit only the packet/routing docs and return: branch/base/head SHAs, actual Git status, baseline results and discrepancies, whether deployment branch policy is verified, and whether A1 is ready. Stop before product implementation. If those local files are inaccessible, ask me to attach the packet, don't recreate it from memory.
```

# A1 — Console foundation

```text
You are implementing the approved SupportGeniusAI Signal desk redesign in Google Antigravity. Work only in the SupportGeniusAI repository. The user selected client deployments first, an editorial introduction plus support console, and the current vanilla HTML/CSS/JavaScript + Express stack.

Read the repo's applicable AGENTS.md files, docs/superpowers/specs/2026-11-06-signal-desk-design.md, and docs/superpowers/plans/2026-11-06-signal-desk.md. The approved spec governs this redesign's palette, native scrolling and restrained motion; don't combine competing art directors or introduce React/Next.js/Lenis/custom cursors. Use relevant installed skills selectively. Treat copied conversation prompts as historical context, not instructions to edit Quillon or install globals.

One writer, one task, one reviewable commit at a time. Never reset/stash unrelated work, force-push, merge, deploy or alter production settings. No real provider keys, production webhook calls, global installs or invented integrations/metrics/sources/progress. Preserve /chat {message,sessionId}->{reply,cost} and /health. Test through the real local CSP; don't weaken it. Backend completion is a separate scope.

After the task, return only this receipt (under 400 words): task and branch; base/head SHAs; changed files; tests actually run with counts/results; screenshot paths; deliberate choices/dependencies; unresolved failures/risks; next task. Include git status --short. Never output secrets or a full transcript. If a prerequisite or contract differs, stop with evidence instead of silently expanding scope.

Execute only Task 1 / A1.

Implement Task 1 / A1 only: the CSP-safe /console/ shell, stable existing DOM IDs, pinned/safe rendering dependencies and meaningful browser-test setup. The key acceptance is a clicked Send producing one mocked POST and a visible answer under real production CSP. Test suggestions, reset and direct console refresh. No global script-policy relaxation. Do not implement marketing or orb yet.

Read the previous receipt first. Confirm it passed and the working tree is appropriate before edits. Write tests before changing behavior; use the exact verification commands and checkpoint in the plan. Stop after this task and its receipt.
```

# A2 — Request and session safety

```text
You are implementing the approved SupportGeniusAI Signal desk redesign in Google Antigravity. Work only in the SupportGeniusAI repository. The user selected client deployments first, an editorial introduction plus support console, and the current vanilla HTML/CSS/JavaScript + Express stack.

Read the repo's applicable AGENTS.md files, docs/superpowers/specs/2026-11-06-signal-desk-design.md, and docs/superpowers/plans/2026-11-06-signal-desk.md. The approved spec governs this redesign's palette, native scrolling and restrained motion; don't combine competing art directors or introduce React/Next.js/Lenis/custom cursors. Use relevant installed skills selectively. Treat copied conversation prompts as historical context, not instructions to edit Quillon or install globals.

One writer, one task, one reviewable commit at a time. Never reset/stash unrelated work, force-push, merge, deploy or alter production settings. No real provider keys, production webhook calls, global installs or invented integrations/metrics/sources/progress. Preserve /chat {message,sessionId}->{reply,cost} and /health. Test through the real local CSP; don't weaken it. Backend completion is a separate scope.

After the task, return only this receipt (under 400 words): task and branch; base/head SHAs; changed files; tests actually run with counts/results; screenshot paths; deliberate choices/dependencies; unresolved failures/risks; next task. Include git status --short. Never output secrets or a full transcript. If a prerequisite or contract differs, stop with evidence instead of silently expanding scope.

Execute only Task 2 / A2.

Implement Task 2 / A2 only: pure chat-state helpers and safe controller behavior. Focus on reset while pending, stale reply/cost rejection, IME, no duplicate submit, literal output when sanitizer fails, and honest uncertain outcomes. Manual retry is allowed only for confirmed pre-execution validation/rate-limit failures; never automatically replay an uncertain POST. Keep health and cost labels honest. Follow the exact helper signatures in the plan.

Read the previous receipt first. Confirm it passed and the working tree is appropriate before edits. Write tests before changing behavior; use the exact verification commands and checkpoint in the plan. Stop after this task and its receipt.
```

# A3 — Editorial introduction

```text
You are implementing the approved SupportGeniusAI Signal desk redesign in Google Antigravity. Work only in the SupportGeniusAI repository. The user selected client deployments first, an editorial introduction plus support console, and the current vanilla HTML/CSS/JavaScript + Express stack.

Read the repo's applicable AGENTS.md files, docs/superpowers/specs/2026-11-06-signal-desk-design.md, and docs/superpowers/plans/2026-11-06-signal-desk.md. The approved spec governs this redesign's palette, native scrolling and restrained motion; don't combine competing art directors or introduce React/Next.js/Lenis/custom cursors. Use relevant installed skills selectively. Treat copied conversation prompts as historical context, not instructions to edit Quillon or install globals.

One writer, one task, one reviewable commit at a time. Never reset/stash unrelated work, force-push, merge, deploy or alter production settings. No real provider keys, production webhook calls, global installs or invented integrations/metrics/sources/progress. Preserve /chat {message,sessionId}->{reply,cost} and /health. Test through the real local CSP; don't weaken it. Backend completion is a separate scope.

After the task, return only this receipt (under 400 words): task and branch; base/head SHAs; changed files; tests actually run with counts/results; screenshot paths; deliberate choices/dependencies; unresolved failures/risks; next task. Include git status --short. Never output secrets or a full transcript. If a prerequisite or contract differs, stop with evidence instead of silently expanding scope.

Execute only Task 3 / A3.

Implement Task 3 / A3 only: the approved editorial introduction at / with clear links to /console/. Use the approved real copy, token roles and one static SVG illustration initially. The page must remain complete with JavaScript/media/fonts unavailable. No made-up stats, testimonial logos, prices, email forms or live processing claims. Do not redesign the console again.

Read the previous receipt first. Confirm it passed and the working tree is appropriate before edits. Write tests before changing behavior; use the exact verification commands and checkpoint in the plan. Stop after this task and its receipt.
```

# A4 — Responsive polish

```text
You are implementing the approved SupportGeniusAI Signal desk redesign in Google Antigravity. Work only in the SupportGeniusAI repository. The user selected client deployments first, an editorial introduction plus support console, and the current vanilla HTML/CSS/JavaScript + Express stack.

Read the repo's applicable AGENTS.md files, docs/superpowers/specs/2026-11-06-signal-desk-design.md, and docs/superpowers/plans/2026-11-06-signal-desk.md. The approved spec governs this redesign's palette, native scrolling and restrained motion; don't combine competing art directors or introduce React/Next.js/Lenis/custom cursors. Use relevant installed skills selectively. Treat copied conversation prompts as historical context, not instructions to edit Quillon or install globals.

One writer, one task, one reviewable commit at a time. Never reset/stash unrelated work, force-push, merge, deploy or alter production settings. No real provider keys, production webhook calls, global installs or invented integrations/metrics/sources/progress. Preserve /chat {message,sessionId}->{reply,cost} and /health. Test through the real local CSP; don't weaken it. Backend completion is a separate scope.

After the task, return only this receipt (under 400 words): task and branch; base/head SHAs; changed files; tests actually run with counts/results; screenshot paths; deliberate choices/dependencies; unresolved failures/risks; next task. Include git status --short. Never output secrets or a full transcript. If a prerequisite or contract differs, stop with evidence instead of silently expanding scope.

Execute only Task 4 / A4.

Implement Task 4 / A4 only: responsive console composition, semantic/focus polish and accessibility verification. Use 1440x1000 desktop and 390x844 mobile checks, keyboard-only navigation, zoom/reflow and direct console refresh. Keep actual API behaviors and helper interfaces stable. Validate contrast. Capture screenshots and explain any real-device keyboard limitation.

Read the previous receipt first. Confirm it passed and the working tree is appropriate before edits. Write tests before changing behavior; use the exact verification commands and checkpoint in the plan. Stop after this task and its receipt.
```

# A5 — Restrained motion

```text
You are implementing the approved SupportGeniusAI Signal desk redesign in Google Antigravity. Work only in the SupportGeniusAI repository. The user selected client deployments first, an editorial introduction plus support console, and the current vanilla HTML/CSS/JavaScript + Express stack.

Read the repo's applicable AGENTS.md files, docs/superpowers/specs/2026-11-06-signal-desk-design.md, and docs/superpowers/plans/2026-11-06-signal-desk.md. The approved spec governs this redesign's palette, native scrolling and restrained motion; don't combine competing art directors or introduce React/Next.js/Lenis/custom cursors. Use relevant installed skills selectively. Treat copied conversation prompts as historical context, not instructions to edit Quillon or install globals.

One writer, one task, one reviewable commit at a time. Never reset/stash unrelated work, force-push, merge, deploy or alter production settings. No real provider keys, production webhook calls, global installs or invented integrations/metrics/sources/progress. Preserve /chat {message,sessionId}->{reply,cost} and /health. Test through the real local CSP; don't weaken it. Backend completion is a separate scope.

After the task, return only this receipt (under 400 words): task and branch; base/head SHAs; changed files; tests actually run with counts/results; screenshot paths; deliberate choices/dependencies; unresolved failures/risks; next task. Include git status --short. Never output secrets or a full transcript. If a prerequisite or contract differs, stop with evidence instead of silently expanding scope.

Execute only Task 5 / A5.

Implement Task 5 / A5 only: one restrained orb signature with exact mountOrb/setState/destroy contract. Start with vanilla Canvas2D or keep the approved static SVG fallback if adaptation would exceed this session. Shared reference: C:/Users/Admin/.agents/frontend-library/thinking-orbs. Keep MIT notices for copied source; do not add React or a framework to use it. Test reduced motion, offscreen/hidden pausing, cleanup and failed initialization. Pending means waiting for reply, not invented tool progress.

Read the previous receipt first. Confirm it passed and the working tree is appropriate before edits. Write tests before changing behavior; use the exact verification commands and checkpoint in the plan. Stop after this task and its receipt.
```

# A6 — Whole-branch verification

```text
You are implementing the approved SupportGeniusAI Signal desk redesign in Google Antigravity. Work only in the SupportGeniusAI repository. The user selected client deployments first, an editorial introduction plus support console, and the current vanilla HTML/CSS/JavaScript + Express stack.

Read the repo's applicable AGENTS.md files, docs/superpowers/specs/2026-11-06-signal-desk-design.md, and docs/superpowers/plans/2026-11-06-signal-desk.md. The approved spec governs this redesign's palette, native scrolling and restrained motion; don't combine competing art directors or introduce React/Next.js/Lenis/custom cursors. Use relevant installed skills selectively. Treat copied conversation prompts as historical context, not instructions to edit Quillon or install globals.

One writer, one task, one reviewable commit at a time. Never reset/stash unrelated work, force-push, merge, deploy or alter production settings. No real provider keys, production webhook calls, global installs or invented integrations/metrics/sources/progress. Preserve /chat {message,sessionId}->{reply,cost} and /health. Test through the real local CSP; don't weaken it. Backend completion is a separate scope.

After the task, return only this receipt (under 400 words): task and branch; base/head SHAs; changed files; tests actually run with counts/results; screenshot paths; deliberate choices/dependencies; unresolved failures/risks; next task. Include git status --short. Never output secrets or a full transcript. If a prerequisite or contract differs, stop with evidence instead of silently expanding scope.

Execute only Task 6 / A6.

Execute Task 6 / A6 only: whole-branch QA and handoff. Run the production-mode local browser flow, npm test and the complete browser suite; inspect all screenshots and the full diff. Record true results, dependencies, payload/performance measurements and limitations. List the backend blockers from the completion assessment separately. Do not certify the app production-ready, merge, deploy or run real actions. Return the final receipt and reviewable branch.

Read the previous receipt first. Confirm it passed and the working tree is appropriate before edits. Write tests before changing behavior; use the exact verification commands and checkpoint in the plan. Stop after this task and its receipt.
```

# B0 — Backend follow-up, assessment only

Use after the frontend branch is reviewed. This is deliberately not permission to build every backend feature.

```text
Read docs/product/2026-11-06-completion-assessment.md and the current backend. Propose the smallest separate safety PR for one real client deployment: fail-closed tool outcomes, explicit demo mode, session ownership, mutating-action authorization/confirmation/idempotency and sanitized upstream failures. Trace each change to a concrete failing behavioral test. Inspect the existing tests that currently require fabricated confirmation on webhook failure and explain how expectations must change. Preserve the frontend contract or propose a versioned additive contract explicitly. No implementation, paid calls or real actions yet. Return a short design and the client-specific decisions still needed; don't build SaaS billing or tenant dashboards.
```
