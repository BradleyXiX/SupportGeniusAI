# 02 receipt: marketing shell and navigation

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `83604ef`
- Goal and result: Created scoped `client/marketing.css` establishing desktop warm outer framing (`#d5b77d`), graphite architectural site-shell (`#1c1e20`, max 1640px, 20px/32px margins), mobile insets, 102px/84px header with brand mark, nav anchors, and CTA to `/console/`. Added accessible skip link to `#main-content`, wired anchor keyboard focus in `client/landing.js`, and verified no console styling or behavior regression observed in the tested states.
- Changed scoped paths:
  - `client/marketing.css`
  - `client/index.html` (shell/header/footer placeholder only)
  - `client/landing.js` (anchor wiring only)
  - `docs/design-v2/receipts/02-receipt.md`
  - `docs/design-v2/screenshots/shell-*`
  - `docs/design-v2/screenshots/console-preserved.png`
- Preserved contracts and product limits:
  - Console preservation: no regression observed in the tested states (`marketing.css` scoped strictly to `body[data-page="marketing"]`).
  - Zero framework migration, native scrolling preserved, no reveal animations.
  - Preserved single H1, valid skip link, unique element IDs, and full no-JS readability.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Browser tests | `playwright test tests/browser/marketing.spec.js` | Exit 0; 7 passed |
| Syntax / diff | `git diff --check` | Exit 0; zero whitespace errors |
| Responsive widths | 1440px, 390px, 320px Playwright viewport evaluation | Exit 0; `scrollWidth <= innerWidth` across all 3 viewports (zero overflow) |
| Keyboard navigation | Tab to `.skip-link`, Enter to `#main-content`, CTA click | Exit 0; skip link targets main-content, CTA navigates to `/console/` |
| No-JS readability | Headless context with `javaScriptEnabled: false` | Exit 0; H1 and primary content visible and complete |
| Console preservation | Evaluated `#input`, `#send-btn`, `#reset-btn`, and rail | Exit 0; demo query produces fixture reply (3 messages); no regression observed in the tested states |
| Accessibility | axe-core scan on `/` (WCAG 2.0 / 2.1 AA) | Exit 0; zero serious or critical violations |

- Screenshot/trace paths:
  - `docs/design-v2/screenshots/shell-desktop-1440.png`
  - `docs/design-v2/screenshots/shell-mobile-390.png`
  - `docs/design-v2/screenshots/shell-mobile-320.png`
  - `docs/design-v2/screenshots/console-preserved.png`
- Visual comparison and intentional deviations from design.md: None; conforms to sections 4 and 5 of `design.md`.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned marketing shell, landing anchor script, screenshots, and receipt.
- Next permitted task: `docs/design-v2/prompts/03-static-hero.md`
