# Independent Review Corrections Receipt

## Verification Summary
- **Target Branch**: `design/signal-architecture-v2`
- **Scope**: Fixes for the 5 independently reproduced findings from `REVIEW.md`.
- **Vitest Unit Suite**: 16 files passed, 151/151 tests passed (exit 0).
- **Playwright Browser Suite**: 8 test suites passed, 111/111 tests passed (exit 0):
  - `closing-footer.spec.js`: 9/9
  - `console.spec.js`: 50/50 (added 320px responsive regression test)
  - `deployment.spec.js`: 7/7 (corrected subtotal)
  - `experience.spec.js`: 9/9
  - `marketing.spec.js`: 8/8 (added anchor URL fragments & browser back tests)
  - `orb.spec.js`: 8/8
  - `signal-core.spec.js`: 13/13 (added failed enhancement module fallback test)
  - `system-chapters.spec.js`: 7/7
- **Axe-core Accessibility**: 0 serious or critical violations across `/` and `/console/`.

## Exact Computed Measurements & Discrepancy Reconciliation

### 1. Marketing Section Vertical Spacing & Closing Heading Line Height
- Reference standard: `.section { padding-block: 110px; }` (mobile `<= 760px`: `66px`); `.closing h2 { line-height: 1.08; letter-spacing: -0.055em; font-family: var(--display); }`.
- Measured computed style on Desktop (1440×1000):
  - `#system`: `paddingTop: 110px`, `paddingBottom: 110px`
  - `#experience`: `paddingTop: 110px`, `paddingBottom: 110px`
  - `#deployment`: `paddingTop: 110px`, `paddingBottom: 110px`
  - `.closing`: `paddingTop: 110px`, `paddingBottom: 110px`
  - `.closing h2`: `fontSize: 86.4px`, `lineHeight: 93.312px` (exact 1.08 ratio), `letterSpacing: -4.752px` (-0.055em), `fontFamily: "Space Grotesk", ...`
- Measured computed style on Mobile (390×844):
  - `#system`, `#experience`, `#deployment`, `.closing`: `paddingTop: 66px`, `paddingBottom: 66px`.
- Double-padding prevented: `.system` specific block padding removed; shared `.section` applies once.

### 2. 320px Console Overflow Elimination
- Root cause: Rail action group (`.rail-actions`) and header flex containers exceeded 320px viewport.
- Correction applied: Fluid wrapping, column stacking at `<= 480px`, and action stacking at `<= 360px` in `client/brand.css`, with `min-height: 36px` on `.btn-new-conversation`.
- Measured 320×800 Viewport:
  - Empty state: `scrollWidth: 320px`, `clientWidth: 320px`, `hasOverflow: false`
  - Answered state: `scrollWidth: 320px`, `clientWidth: 320px`, `hasOverflow: false`
  - Regression assertion verified in `tests/browser/console.spec.js`.

### 3. Progressive Enhancement Controls
- Initial HTML state: `#motion-toggle` and scenario buttons (`button[data-example]`) start with `disabled` attribute.
- Hydration: Handlers enable controls once click listeners are registered.
- Reduced motion: Native disclosures and static poster remain accessible without JS; dynamic import is bypassed.
- Failed enhancement fallback: Aborted dynamic import marks `#motion-toggle` disabled with text "Static artwork active" (verified in `signal-core.spec.js` test 13).

### 4. Asset Accounting & Test Subtotals
- Corrected `README.md` and `docs/design-v2/verification.md`:
  - `styles.css`: 40.37 KB raw / 6.73 KB estimated gzip.
  - Eager landing JS dependencies: `landing.js` (5.63 KB / 1.68 KB est. gzip), `chapters.js` (1.01 KB / 0.45 KB est. gzip), `examples.js` (1.87 KB / 0.78 KB est. gzip).
  - Optional deferred WebGL: `signal-core.js` (5.45 KB / 2.08 KB est. gzip).
  - Separately reported assets: Latin font subsets (70.80 KB across 3 WOFF2 files), hero SVG poster (43.48 KB raw).
  - Deployment suite subtotal corrected to 7.
  - Gzip values explicitly labeled as software estimates.

### 5. Native Anchor Navigation & History
- Implemented `scrollToTarget` with `history.pushState(null, '', '#' + targetId)` and `popstate` listener in `client/landing.js`.
- URL fragments preserved; browser back/forward and direct `/#system` restore focus with native smooth scrolling (reduced-motion respected).

## Visual Pass Screenshots
Captured in `docs/design-v2/screenshots/`:
- `landing-desktop-1440x1000.png`
- `landing-mobile-390x844.png`
- `landing-mobile-320x800.png`
- `landing-nojs.png`
- `landing-reduced-motion.png`
- `console-desktop-1440x1000.png`
- `console-mobile-390x844.png`
- `console-mobile-320x800-empty.png`
- `console-mobile-320x800-answered.png`
- `console-reduced-motion.png`

## Remaining Real-Device & Field Evidence Gaps
1. **Physical Device Touch Testing**: Verified under Chromium emulation at 320px, 390px, and 1440px; physical iOS Safari and Android Chrome touch events (e.g. keyboard viewport resizing on software keyboard entry) remain unobserved.
2. **Field INP & Network Throttling**: Lab LCP/CLS figures are unthrottled loopback observations; field Interaction to Next Paint (INP) under high CPU load or throttled cellular connections has not been measured.
3. **HTTP Wire Compression**: Gzip figures are calculated estimates via zlib; live CDN/server gzip/brotli transfer sizes have not been measured on a public network.
