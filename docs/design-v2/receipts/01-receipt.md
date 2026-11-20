# 01 receipt: shared brand foundation

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `fdb660c`
- Goal and result: Installed the signal-prism mark, mono variant, wordmark, favicon, and local licensed WOFF2 font subsets into `client/assets/`. Created `client/brand.css` with semantic tokens and `@font-face` rules. Replaced external Google Fonts with local fonts and added the signal-prism mark with accessible names on both `/` and `/console/`.
- Changed scoped paths:
  - `client/assets/brand/*`
  - `client/assets/fonts/*`
  - `client/brand.css`
  - `client/index.html` (identity & font/favicon links only)
  - `client/console/index.html` (identity & font/favicon links only)
  - `docs/design-v2/receipts/01-receipt.md`
  - `docs/design-v2/screenshots/header-*`
- Preserved contracts and product limits:
  - Preserved Express + vanilla ES module architecture, routes, and security headers.
  - Zero external font requests: external Google Fonts removed, fonts loaded from self.
  - Preserved fallback font stacks and existing client layouts/behavior.
  - No SVG scripts; zero changes to backend capabilities or operating boundaries.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Syntax / diff | `git diff --check` | Exit 0; zero whitespace errors |
| Asset HTTP status | Direct fetch for `/brand.css`, SVG marks, favicon, and WOFF2 files | Exit 0; HTTP 200 for all 8 requested assets |
| External requests | Playwright network capture on `/` and `/console/` | 0 external requests (no Google Fonts calls) |
| Route verification | Browser load `/` & `/console/` in demo mode | HTTP 200 on both, 0 console errors, H1 readable, console input active |
| Accessible names | Inspected `.brand-lockup` attribute | `aria-label="SupportGenius AI home"` on both headers |
| SVG security check | Grep `<script` in `client/assets/brand/*.svg` | Exit 0; zero scripts in SVG assets |

- Screenshot/trace paths:
  - `docs/design-v2/screenshots/header-landing.png`
  - `docs/design-v2/screenshots/header-console.png`
- Visual comparison and intentional deviations from design.md: None; applies standard brand mark and local font subsets without modifying section layouts ahead of prompts 02–09.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned brand/font assets, brand.css, template identity fragments, screenshots, and receipt.
- Next permitted task: `docs/design-v2/prompts/02-shell-navigation.md`
