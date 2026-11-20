# 07 receipt: deployment explanation

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `64ee41c`
- Goal and result: Built asymmetric `#deployment` section replacing legacy deployment strip placeholder. Added `<a href="#deployment">Deployment</a>` to header navigation. Structured the 1.15:1 ruled panel with left `.deploy-main` housing `.document-stack` (`POLICIES.md`, `SHIPPING.md`, `HOURS.txt` in static 3D perspective; flattened via `transform: none` under `prefers-reduced-motion: reduce`) and right `.deploy-side` housing two stacked panels (`02 / MODEL CHOICE` and `03 / CONTROL`). Truthfully explained text/Markdown-only ingestion, configurable provider options (OpenAI, Gemini, Ollama), anonymous sessions, bounded requests, and explicit errors. Completely omitted upload interfaces, drag-and-drop, PDF ingestion, live integrations, enterprise certifications, customer actions, citations, and fabricated statistics. Verified heading hierarchy, 320px reflow without horizontal overflow, and console behavior preservation with zero regression in tested states.
- Changed scoped paths:
  - `client/index.html`
  - `client/marketing.css`
  - `tests/browser/deployment.spec.js`
  - `docs/design-v2/screenshots/deployment-desktop-1440.png`
  - `docs/design-v2/screenshots/deployment-mobile-390.png`
  - `docs/design-v2/screenshots/deployment-reduced-motion.png`
  - `docs/design-v2/receipts/07-receipt.md`
- Preserved contracts and product limits:
  - Console layout, styling, and live APIs preserved; no regression in tested states.
  - Native scrolling preserved; no Lenis, custom cursors, background canvases, or framework migrations.
  - Zero claims of file uploads, live customer actions, source citations, or certifications.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| Deployment suite | `playwright test tests/browser/deployment.spec.js` | Exit 0; 7/7 tests passed |
| Regression suites | `playwright test tests/browser/experience.spec.js tests/browser/system-chapters.spec.js tests/browser/signal-core.spec.js` | Exit 0; 28/28 tests passed |
| Nav targeting | Click header nav `Deployment` | Exit 0; targets `#deployment` in viewport |
| Stack illustration | Inspect `.document-stack` | Exit 0; 3 text/MD files, `aria-hidden="true"` |
| Reduced motion | Emulate `reducedMotion: 'reduce'` | Exit 0; `.document-stack` transform becomes `none` |
| Heading order | Inspect heading hierarchy | Exit 0; H2 (`#deployment-title`) followed by H3s |
| Truthful claims | Text verification on `#deployment` | Exit 0; no upload UI, PDFs, actions, or certifications |
| Viewport reflow | Viewports at 1440px, 390px, 320px | Exit 0; single-column on mobile; 0 horizontal overflow |

- Screenshot paths:
  - `docs/design-v2/screenshots/deployment-desktop-1440.png`
  - `docs/design-v2/screenshots/deployment-mobile-390.png`
  - `docs/design-v2/screenshots/deployment-reduced-motion.png`
- Visual comparison and deviations from design.md: None; matches section 6.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned paths.
- Next permitted task: `docs/design-v2/prompts/08-closing-footer.md`
