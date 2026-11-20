# 05 receipt: system story and capability strip

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `3bfc32e`
- Goal and result: Integrated the capability strip deferred from task 03 (`DOCUMENT-BASED ANSWERS`, `CONFIGURABLE MODELS`, `FOCUSED CONVERSATIONS`, `SG / 001`). Introduced the `#system` section replacing legacy `#how-it-works`, updating header nav and hero secondary links to target `#system`. Composed three ordered native disclosures with `<details name="system-chapters">`:
  - 01: `Start with your knowledge.` (default open; text/Markdown ingestion)
  - 02: `Give the question context.` (retrieval supports answer; cannot guarantee accuracy)
  - 03: `Keep the conversation clear.` (question/reply together; customer actions and citations unavailable)
  Implemented `client/marketing/chapters.js` and wired in `landing.js` for single-open exclusive accordion coordination. Disclosures toggle natively with Enter/Space and operate fully without JavaScript. Decorative sidebar (`.chapter-index`) displays orbit mark with non-telemetry disclosure, omitted on mobile reflow (`display: none` at <= 760px). Preserved hero motion and console behavior with zero regression in tested states.
- Changed scoped paths:
  - `client/index.html`
  - `client/marketing.css`
  - `client/marketing/chapters.js`
  - `client/landing.js`
  - `tests/browser/system-chapters.spec.js`
  - `docs/design-v2/screenshots/system-desktop-1440.png`
  - `docs/design-v2/screenshots/system-mobile-390.png`
  - `docs/design-v2/receipts/05-receipt.md`
- Preserved contracts and product limits:
  - Console layout, styling, and live APIs preserved; no regression in tested states.
  - Native scrolling preserved; no Lenis, custom cursors, background canvases, or framework migrations.
  - No claims of live telemetry, customer actions, or source citations.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| System chapters suite | `playwright test tests/browser/system-chapters.spec.js` | Exit 0; 7/7 tests passed |
| Capability strip | Inspect `.system-strip` elements | Exit 0; 4 items rendered, wraps on mobile |
| Navigation targeting | Click header nav & hero link | Exit 0; targets `#system` and scrolls into view |
| Exclusive accordion | Click Chapter 02 & Chapter 03 | Exit 0; single chapter open at a time |
| Keyboard toggling | Enter & Space on focused summary | Exit 0; native toggles; focus ring visible |
| No-JS operation | Browser with `javaScriptEnabled: false` | Exit 0; `<details>` toggle natively |
| Mobile reflow | Viewports at 1440px, 390px, 320px | Exit 0; sidebar omitted; 0 horizontal overflow |
| Copy accuracy | Evaluate text disclaimers | Exit 0; no telemetry, action, or citation claims |
| Hero motion regression | `playwright test tests/browser/signal-core.spec.js` | Exit 0; 12/12 tests passed |

- Screenshot paths:
  - `docs/design-v2/screenshots/system-desktop-1440.png`
  - `docs/design-v2/screenshots/system-mobile-390.png`
- Visual comparison and deviations from design.md: None; matches sections 5 and 6.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned paths.
- Next permitted task: `docs/design-v2/prompts/06-experience.md`
