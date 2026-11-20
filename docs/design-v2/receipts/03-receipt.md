# 03 receipt: static hero composition

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `ce96fd9`
- Goal and result: Replaced the landing hero with the approved Signal Architecture static hero composition: eyebrow (`SUPPORT INTELLIGENCE, WITH CONTEXT`), sentence-case H1 (`Your knowledge.<br>A clearer<br><em>answer.</em>`), approved lead (`Turn your business documentation into a focused support conversation. Built around what your team knows.`), primary CTA linking to `/console/` and secondary link to `#how-it-works`, hero note, and right SVG point sculpture (`signal-core-poster.svg`, 800×800 intrinsic aspect-ratio). Motion toggle included but disabled with explanatory title ("Motion offline") until task 04 implements WebGL. No hardcoded Demo badge on marketing. Capability strip explicitly left for prompt 05.
- Changed scoped paths:
  - `client/assets/brand/signal-core-poster.svg`
  - `client/index.html` (hero section only)
  - `client/marketing.css` (hero rules)
  - `docs/design-v2/receipts/03-receipt.md`
  - `docs/design-v2/screenshots/hero-*`
- Preserved contracts and product limits:
  - Console layout, styling, and behavior completely preserved; no regression observed in the tested states.
  - No WebGL or motion scripts loaded yet; poster renders cleanly with JavaScript disabled.
  - Zero hardcoded demo badge on marketing.
  - Single H1 preserved, accessible landmarks intact, native scrolling maintained.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| No-JS first paint | Playwright context with `javaScriptEnabled: false` | Exit 0; H1, approved lead, and 800×800 SVG poster visible (`naturalWidth: 800`) |
| Responsive widths | 1440px, 390px, 320px viewport evaluation | Exit 0; `scrollWidth <= innerWidth` across all widths (no overflow) |
| Poster asset | Inspected `<img>` attributes and loaded dimensions | `width: 800`, `height: 800`, `src: /assets/brand/signal-core-poster.svg` |
| CTAs & motion toggle | Evaluated `.actions a` and `#motion-toggle` | Primary CTA links to `/console/`, secondary to `#how-it-works`; motion button disabled ("Motion offline") |
| Accessibility | axe-core scan on `/` (WCAG 2.0 / 2.1 AA) | Exit 0; zero serious or critical violations |

- Screenshot/trace paths:
  - `docs/design-v2/screenshots/hero-desktop-1440.png`
  - `docs/design-v2/screenshots/hero-mobile-390.png`
  - `docs/design-v2/screenshots/hero-nojs.png`
- Visual comparison and intentional deviations from design.md: None; matches section 6 (`.hero`) specification. Capability strip explicitly deferred to prompt 05 per instructions.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned hero assets, markup, CSS, screenshots, and receipt.
- Next permitted task: `docs/design-v2/prompts/04-signal-core.md`
