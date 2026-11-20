# 08 receipt: closing brand journey

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `8404794`
- Goal and result: Replaced obsolete legacy closing CTA fragment with the light `.closing` section and branded footer matching design sections 5–6. Closing section features an off-white field (`var(--paper, #ecebe5)`), eyebrow `KNOWLEDGE, MADE CLEAR.`, large statement `Make the next question count.`, primary CTA pointing to `/console/` (*Explore Signal Desk ↗*), and static decorative `.closing-rings` positioned strictly behind copy with `aria-hidden="true"` and `pointer-events: none`. Ensured a high-contrast dark focus outline (`#242827`) on the light background. Verified branded footer with identity mark, descriptive purpose, back-to-top anchor, and copyright. Conducted exhaustive link verification confirming all header nav (`#system`, `#experience`, `#deployment`), CTAs (`/console/`), and footer anchors (`#main-content`) resolve to valid DOM targets. Verified single `<h1>` (`#hero-title`), complete landmarks (`header`, `main`, `footer`), no-JS operation, and responsive reflow at 1440px, 390px, and 320px with zero horizontal scroll. Preserved console selectors and hero motion with zero regression in tested states.
- Changed scoped paths:
  - `client/index.html`
  - `client/marketing.css`
  - `tests/browser/closing-footer.spec.js`
  - `docs/design-v2/screenshots/closing-desktop-1440.png`
  - `docs/design-v2/screenshots/closing-mobile-390.png`
  - `docs/design-v2/screenshots/footer-desktop-1440.png`
  - `docs/design-v2/receipts/08-receipt.md`
- Preserved contracts and product limits:
  - Console layout, styling, and live APIs preserved; no regression in tested states.
  - Native scrolling preserved; no Lenis, custom cursors, background canvases, or framework migrations.
  - Zero unsupported testimonials, customer logos, or unverified legal links.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| Closing/footer suite | `playwright test tests/browser/closing-footer.spec.js` | Exit 0; 9/9 tests passed |
| Regression suites | `playwright test tests/browser/deployment.spec.js tests/browser/experience.spec.js tests/browser/system-chapters.spec.js tests/browser/signal-core.spec.js` | Exit 0; 35/35 tests passed |
| Primary CTA | Inspect `.closing a.button.primary` | Exit 0; points to `/console/` |
| Static rings | Inspect `.closing-rings` | Exit 0; `z-index: 0`, `pointer-events: none` |
| Dark focus ring | Focus `.closing .button` | Exit 0; 3px solid `#242827` (11.8:1 contrast) |
| Link integrity | Inspect all `a[href]` on landing page | Exit 0; all in-page anchors & routes valid |
| Heading hierarchy | Inspect headings H1-H6 | Exit 0; 1 unique H1, H2 -> H3 logical order |
| No-JS operation | Browser with `javaScriptEnabled: false` | Exit 0; CTA & links navigate cleanly |
| Viewport reflow | Viewports at 1440px, 390px, 320px | Exit 0; 0 horizontal overflow |

- Screenshot paths:
  - `docs/design-v2/screenshots/closing-desktop-1440.png`
  - `docs/design-v2/screenshots/closing-mobile-390.png`
  - `docs/design-v2/screenshots/footer-desktop-1440.png`
- Visual comparison and deviations from design.md: None; matches sections 5 and 6.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned paths.
- Next permitted task: `docs/design-v2/prompts/09-console-brand.md`
