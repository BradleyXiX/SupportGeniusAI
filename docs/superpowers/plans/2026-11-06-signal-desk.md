# Signal desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. The user selected bounded Gemini/Antigravity execution with Codex review; no parallel writers.

**Goal:** Deliver an editorial introduction and a dependable, responsive support console, preserving the existing backend contract.

**Architecture:** Two static HTML entry points served by existing Express. Shared CSS tokens, a console controller with explicit request state, and a small optional vanilla orb. No React, new router or mandatory build pipeline.

**Tech Stack:** Existing Node/Express, vanilla ES modules, CSS, Vitest/Supertest; development-only Playwright and axe for browser checks if absent.

**Spec:** docs/superpowers/specs/2026-11-06-signal-desk-design.md

## Global Constraints

- Client deployments first. No self-service SaaS dashboard, signup, billing or tenant administration.
- Keep Express and vanilla HTML/CSS/JS. Preserve POST /chat with {message,sessionId} and successful {reply,cost}; preserve GET /health.
- Use design/signal-desk-v1 from a freshly inspected origin/main. Never force-reset an existing branch, overwrite the older frontend branch, merge or deploy automatically.
- No compulsory Lenis, scroll hijacking, custom cursor or fake loading screen.
- Content is visible before JS and when motion assets fail.
- Transcript render fallback is textContent, never unsanitized innerHTML. Remove inline event attributes; do not weaken CSP.
- No invented sources, tool states, integrations, client logos, metrics, pricing or contact links.
- No automatic POST retries. Uncertain outcomes have no replay/status button until the backend supports safe semantics.
- Do not install globals, expose .env contents, contact production webhooks or use paid providers for frontend checks.
- Development-only browser dependencies are permitted if missing; pin resolved versions in the lockfile and report them. Runtime dependencies require a concrete need; no framework migration.

## Review Focus

1. Reset during an unresolved POST: old replies and cost must never enter a new session (Task 2).
2. Sanitizer/CDN failure plus malicious model output: render literal safe text (Tasks 1–2).
3. Timeout after an action may have executed: do not replay automatically or offer unsupported status (Task 2).
4. Mobile keyboard and IME composition: text remains reachable; Enter during composition never sends (Tasks 2,4).
5. Reduced motion, failed font/media and direct /console/ refresh: content and navigation still work (Tasks 3–5).

## File ownership and interfaces

- client/index.html: marketing document. client/console/index.html: console document.
- client/styles.css: shared tokens/base, marketing and console layouts. Keep selectors page-scoped with body data-page values marketing or console.
- client/app.js: console initialization and browser interactions only. Loaded as an external module from /app.js by the console.
- client/chat-state.js: pure request/session transition helpers, unit tested without DOM.
- client/orb.js: optional decorative Canvas2D initialization shared by both pages; no backend knowledge.
- client/landing.js: marketing-only initialization and optional orb lifecycle.
- client/vendor/: locally vendored pinned markdown/sanitizer files plus license notices, if chosen instead of runtime remote CDNs.
- tests/browser/console.spec.js and marketing.spec.js: Playwright behavior. playwright.config.js: local production-mode server and browser artifact locations. Keep these outside server/tests and exclude them from Vitest.
- server/tests/frontendAssets.test.js: Supertest document routes and CSP headers without contacting providers.
- docs/design-prompts/receipts/: brief session receipts; no full transcripts or secrets.
- Backend implementation files, deployment files and global skills are outside frontend task ownership.

### Task 0 / A0: Baseline and safe branch

**Files:** inspect only first; add approved packet docs and a concise root AGENTS.md routing note after branch creation. Preserve .agents/AGENTS.md and its skill library; explain that the approved spec governs this redesign and native scroll/vanilla cleanup are intentional exceptions to showcase defaults. Do not rewrite unrelated instructions.

**Interfaces:** consumes actual Git status and this approved packet; produces recorded BASE_SHA, branch name and baseline results for later sessions.

- [ ] Inspect git status --short, git branch --show-current, git remote -v and existing AGENTS.md files. Never print credentials embedded in remote URLs.
- [ ] If unrelated tracked/untracked work exists, describe it and stop before switching. Approved packet documents may be untracked; list them explicitly. Do not stash/reset someone else's work.
- [ ] Fetch origin; verify origin/main and inspect existing design/signal-desk-v1. For a clean checkout, create it from origin/main. If it exists, inspect and resume only when it belongs to this plan; never force recreate.
- [ ] Record main SHA and deployed-service branch/autodeploy policy if accessible. Branch protection does not prove deployment isolation. Do not change Render settings.
- [ ] Run npm ci, npm test and a local production-mode browser baseline with paid credentials blank and no live webhook. Expected historical baseline: 29 tests. If the new base differs, report changes and refresh relevant assumptions before implementation.
- [ ] Copy this packet into the documented repo paths; commit docs only as docs: record approved Signal desk redesign. Receipt includes baseline failures, source SHA and file allowlist.

### Task 1 / A1: CSP-safe functional console shell

**Files:** client/console/index.html (new), client/app.js and client/styles.css (modify), server/tests/frontendAssets.test.js and tests/browser/console.spec.js (new), playwright.config.js, vitest.config.js, package.json/lockfile only for browser-test setup.

**Interfaces:** consumes existing /chat and /health; produces /console/ with stable IDs chat-messages, input, session-cost, send-btn, reset-btn and data-suggestion buttons. Initial public-demo disclosure is visible. The transcript implementation is completed in Task 2.

- [ ] Add a failing browser test: POST /chat is intercepted with {reply:'Test answer',cost:'0.0001'}; filling input and clicking Send produces one POST and visible Test answer; console has no CSP errors. Add click tests for suggestions/reset and a direct GET /console/ asset/CSP check.
- [ ] Run the focused browser test against the unchanged app and observe the expected route/control failure.
- [ ] Move/copy the chat markup into /console/ with root-absolute /styles.css and /app.js paths. Replace inline handlers with addEventListener, a submit form and module initialization. Keep current root marketing replacement for Task 3, not a server catch-all.
- [ ] Pin/vendor markdown and DOMPurify with license notices. If they fail to load, use literal text. Do not allow unsafe-inline scripts to fix handlers.
- [ ] Browser test config must run a real production-mode local Express server on a dedicated port, with cloud keys/webhook cleared and no automatic production requests. Mock POSTs in browser tests. Vitest must exclude tests/browser/** so its npm test contract remains intact. Add package script test:browser = playwright test; use @playwright/test and axe-core as development-only dependencies if absent. Focused verification: npm run test:browser -- tests/browser/console.spec.js; marketing: npm run test:browser -- tests/browser/marketing.spec.js; whole suite: npm run test:browser. If a browser executable is missing, install the pinned Playwright Chromium in the normal user cache rather than adding a browser runtime dependency.
- [ ] Run npm test and the focused Playwright console test; expected existing tests pass plus new contract checks. Commit feat: add CSP-safe support console.

### Task 2 / A2: Safe request/session state

**Files:** client/chat-state.js (new), client/app.js, server/tests/chatState.test.js (new), tests/browser/console.spec.js.

**Interfaces:** createChatState(sessionId:string)->{sessionId,generation:0,pending:null}; beginRequest(state,requestId:string)->{...state,pending:{requestId,generation}}; resetSession(state,newSessionId)->{sessionId:newSessionId,generation:old+1,pending:null}; acceptsReply(state,{requestId,generation})->boolean. Store UI question/error association locally in the controller, not in backend schemas. export helpers as ES modules for Vitest.

- [ ] Test exact invariants: acceptsReply is false after reset; duplicate begin while pending returns the unchanged state; the current matching response is accepted; arbitrary late request IDs cannot update cost.
- [ ] Add browser tests for blank and 2001-char input (zero POSTs), double-click (one POST), Enter/Shift+Enter and IME, network/5xx uncertainty (no automatic retry), 422 editing, 429 Retry-After (use 60 seconds if absent/invalid) and manual retry without duplicate visible question, sanitizer absent plus malicious HTML (no execution), and reset while mocked POST is delayed (no old response/cost).
- [ ] Run these tests failing; implement the helpers and controller to satisfy them. Use crypto.randomUUID with a compatible fallback only if needed; API ID limit is 64 allowed characters. Confirm reset only with history. Do not describe it as server data deletion.
- [ ] Request timeout starts at 45 seconds (designer implementation choice); confirmed 429 uses a valid Retry-After, falling back to 60 seconds if absent or invalid; AbortController stops the browser wait only. Use the approved uncertainty text, not “cancelled”. Associate every response with request ID/generation. POST is non-idempotent; never automatically retry.
- [ ] Health text starts Checking connection; /health success says Server reachable. Knowledge readiness is a separate label from vectorStore.isInitialized. Never infer provider/tool availability. Cost says Session estimate with a disclosure, not billed spend.
- [ ] Clipboard failure produces accessible feedback. Scroll the transcript only if the reader was near the bottom; otherwise expose a new-message affordance. Respect reduced motion.
- [ ] Run unit and browser tests plus npm test; commit fix: make console request states safe and recoverable.

### Task 3 / A3: Editorial introduction

**Files:** client/index.html, client/styles.css, client/landing.js (new), tests/browser/marketing.spec.js (new). Keep client/app.js console-only.

**Interfaces:** / links to /console/; body data-page='marketing'; /console/ body data-page='console'. Optional orb mount is [data-orb]; no animation required for this task.

- [ ] Add navigation/direct-refresh tests: primary and closing CTAs reach /console/; How it works anchor reaches real content; no empty href or fake contact form; main heading/copy and demo/illustration disclosure are present.
- [ ] Implement approved section order, copy and tokens. Use an inline decorative SVG orb first. Exact copy and responsive measurements come from the spec. Do not invent product metrics or use a fake transcript as live evidence.
- [ ] Ensure static HTML remains readable with JS disabled and fonts/CDNs blocked. All marketing text is real HTML. Local assets work under existing CSP.
- [ ] Run focused tests and capture desktop/mobile static screenshots. Commit feat: add editorial SupportGeniusAI introduction.

### Task 4 / A4: Responsive console and accessibility polish

**Files:** client/styles.css, client/console/index.html, client/app.js only for accessibility/focus, browser test files.

**Interfaces:** preserves all earlier IDs and request-state functions. The 256px desktop rail collapses into a compact mobile header, without a new menu system.

- [ ] Add checks for 390x844 and 1440x1000, 200% zoom/reflow, keyboard focus, accessible labels/log/status, no document overflow and textarea reachability. Test direct /console/ refresh. Add axe scan with no serious/critical violations.
- [ ] Apply the spec's type/spacing/color/radius system. Validate contrast rather than accepting hex values blindly. Make touch controls 44px; do not solve overflow by hiding content globally.
- [ ] Verify hardware/mobile viewport behavior manually or with appropriate emulation; document limitations around real software keyboards. Keep composer in normal layout; avoid speculative visualViewport code.
- [ ] Capture before/after desktop/mobile screenshots; run all earlier checks. Commit style: refine responsive support console.

### Task 5 / A5: One restrained motion signature

**Files:** client/orb.js (new), client/landing.js, client/app.js for status wiring only, client/styles.css, browser tests; client/vendor/LICENSES.md when upstream source is reused.

**Interfaces:** mountOrb(canvas:HTMLCanvasElement,{state:'idle'|'pending',reducedMotion:boolean})->{setState(state),destroy()}. No internal function pretends to know searching/booking/tool progress.

- [ ] Test that reduced motion yields a static visible mark, hidden/offscreen tabs pause updates, destroy removes observers/listeners, and initialization failure preserves content. Test that only a pending request sets pending and resolution/error/reset stops it.
- [ ] Implement a small vanilla Canvas2D orb or keep static SVG plus CSS if adaptation exceeds the session budget. Shared reference is C:/Users/Admin/.agents/frontend-library/thinking-orbs. No React, npm global install or WebGL dependency. Preserve MIT notices for copied source.
- [ ] Add only approved intro/interaction motion; content starts visible. Native scrolling remains. Avoid continuous console motion while idle. One clock, DPR capped at 2, explicit cleanup.
- [ ] Run browser checks in normal/reduced motion and record payload/frame behavior with measurement limitations. Commit feat: add restrained signal orb motion.

### Task 6 / A6: Whole-branch verification and handoff

**Files:** docs/design-prompts/receipts/final.md, README.md only for actual route/run updates; test files for any uncovered regression. Product fixes go through the owning task, not unexplained cleanup.

**Interfaces:** produces reviewable branch diff, reproducible test commands, four main screenshots and a ranked residual-risk list. Not a deploy command.

- [ ] Run npm ci, npm test, complete Playwright suite and axe; inspect all screenshots. Record real counts and failed/skipped checks. No claimed measurements from screenshots alone.
- [ ] Test real local server/CSP with mocked chat success/failure and vendor asset failure. Confirm root and console navigation, keyboard, reduced motion, stale reset and unknown action outcome behavior.
- [ ] Review git diff origin/main...HEAD for secrets, runtime caches, unrelated/backend/deployment/global changes. Verify only allowlisted scope changed; do not include real customer documents or sessions.
- [ ] Record lab performance, actual payload, phone constraints and remaining backend blockers from the separate completion assessment. No fabricated live-provider test or “production ready” label.
- [ ] Commit docs: record redesign verification. Return receipt and branch; do not merge/push/deploy unless the user explicitly asks for that action and deployment implications are understood. A local commit is enough for review.

## Self-review

Spec sections map to Tasks 0–6. Request state, IDs and orb API are defined once and reused. The five review-focus cases have named owning tests. Backend fixes are intentionally excluded and separately assessed. This plan prioritizes behavior tests over tests that mirror CSS values. User-selected execution remains Gemini implementation and Codex review, not automatic subagent implementation.
