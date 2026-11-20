# 06 receipt: interactive example conversations

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `25a55fe`
- Goal and result: Built off-white `#experience` section with dark charcoal sample panel matching design section 6. Added three scenario buttons (`Returns policy`, `Shipping methods`, `Store hours`) in `.scenario-list`. Implemented `client/marketing/examples.js` and wired into `landing.js`. Selections update immediately and deterministically via `textContent` with `aria-pressed="true"` toggling. Result renders in a single polite atomic region (`aria-live="polite" aria-atomic="true"`). Visually labelled with `.demo-bar` ("SIGNAL DESK / SCRIPTED EXAMPLE / NO API CALLS"). Tested zero network requests to `/chat` or `/session`, keyboard navigation via Enter/Space with visible focus, XSS safety against script/HTML injection, and responsive reflow across 1440px, 390px, and 320px without horizontal overflow. Linked assistant CTA directly to `/console/`. Preserved console behavior with zero regression in tested states.
- Changed scoped paths:
  - `client/index.html`
  - `client/marketing.css`
  - `client/marketing/examples.js`
  - `client/landing.js`
  - `tests/browser/experience.spec.js`
  - `docs/design-v2/screenshots/experience-desktop-1440.png`
  - `docs/design-v2/screenshots/experience-mobile-390.png`
  - `docs/design-v2/receipts/06-receipt.md`
- Preserved contracts and product limits:
  - Console layout, styling, and live APIs preserved; no regression in tested states.
  - Native scrolling preserved; no Lenis, custom cursors, background canvases, or framework migrations.
  - Zero citations, tool calls, confidence scores, latency numbers, or live telemetry displayed.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| Experience suite | `playwright test tests/browser/experience.spec.js` | Exit 0; 9/9 tests passed |
| Regression suites | `playwright test tests/browser/system-chapters.spec.js tests/browser/signal-core.spec.js` | Exit 0; 19/19 tests passed |
| Scripted labels | Inspect `.demo-bar` header | Exit 0; visible "SCRIPTED EXAMPLE / NO API CALLS" |
| Zero network calls | Route interception on `/chat` & `/session` | Exit 0; 0 requests triggered during switching |
| Scenario toggling | Click buttons (`returns`, `shipping`, `hours`) | Exit 0; text updates immediately; `aria-pressed` synced |
| Rapid switching | Consecutive rapid clicks on scenarios | Exit 0; deterministic updates; zero UI desync |
| Keyboard navigation | Enter & Space on focused scenario buttons | Exit 0; switches scenario; `:focus-visible` ring active |
| Safe text injection | Malicious test payload rendered via `textContent` | Exit 0; zero DOM/script injection execution |
| Assistant CTA | Inspect `#experience .action-primary` | Exit 0; links to `/console/` |
| Viewport reflow | Viewports at 1440px, 390px, 320px | Exit 0; responsive stack; zero horizontal overflow |

- Screenshot paths:
  - `docs/design-v2/screenshots/experience-desktop-1440.png`
  - `docs/design-v2/screenshots/experience-mobile-390.png`
- Visual comparison and deviations from design.md: None; matches section 6.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned paths.
- Next permitted task: `docs/design-v2/prompts/07-deployment.md`
