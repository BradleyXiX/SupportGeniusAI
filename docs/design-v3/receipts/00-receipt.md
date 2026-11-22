# 00 receipt: Verify merged base and performance baseline

- Branch / parent SHA: `design/crimson-signal-v3` @ `933dea111756cf9de01ad9280aebfc5279218ebb` (`933dea1`), directly descended from merged `main` at `f92c63c` (PR #6 `design/signal-architecture-v2`).
- Goal and result: Verified repository ancestry, package scripts, capability limits, baseline unit/browser tests, and measured asset sizes. Captured baseline desktop and mobile comparison screenshots in explicit local demo mode (`APP_MODE=demo`). Zero product code modified.
- Changed owned paths:
  - `docs/design-v3/receipts/00-receipt.md`
  - `docs/design-v3/screenshots/current-landing-desktop.png`
  - `docs/design-v3/screenshots/current-landing-mobile.png`
  - `docs/design-v3/screenshots/current-console-desktop.png`
  - `docs/design-v3/screenshots/current-console-mobile.png`
  - `docs/design-v3/screenshots/current-console-answered.png`
- Preserved API/console contracts:
  - Express + vanilla ES modules, native scrolling; no Lenis, custom cursors, or heavy canvases.
  - Capabilities: Explicit `demo` and `support` modes. Zero live actions or webhooks; customer actions unconditionally disabled.
  - Citations: Source citations remain unavailable in current release.
  - Sessions: Anonymous cookie session store; no persistent user auth.
  - Zero product code modified; no push, merge, deploy, or hosting modifications.

## Actual Checks (commands, exits/counts)

| Check | Exact command / invocation | Exit / outcome |
| :--- | :--- | :--- |
| Unit & contract suite | `npm test` (`vitest run`) | Exit 0; 16 test files passed, 151/151 tests passed (7.81s) |
| Browser integration suite | `npm run test:browser` (`playwright test`) | Exit 0; 8 test suites passed, 113/113 tests passed (2.7m) |
| Whitespace / syntax | `git diff --check` | Exit 0; clean, zero whitespace or syntax errors |
| Browser baseline capture | Headless Chromium via Playwright, local demo mode (`APP_MODE=demo`) | Exit 0; captured 5 desktop/mobile baseline screenshots |

## Baseline Asset Accounting (Raw and Gzip Estimates)

| Asset | Raw Bytes | Raw (KiB) | Gzip (Bytes) | Gzip (KiB) |
| :--- | :--- | :--- | :--- | :--- |
| `client/index.html` | 11,650 | 11.38 KiB | 3,384 | 3.30 KiB |
| `client/brand.css` | 14,272 | 13.94 KiB | 2,332 | 2.28 KiB |
| `client/marketing.css` | 30,395 | 29.68 KiB | 5,014 | 4.90 KiB |
| `client/styles.css` | 41,337 | 40.37 KiB | 6,894 | 6.73 KiB |
| `client/landing.js` | 7,654 | 7.47 KiB | 1,952 | 1.91 KiB |
| `client/marketing/chapters.js` | 1,061 | 1.04 KiB | 468 | 0.46 KiB |
| `client/marketing/examples.js` | 1,968 | 1.92 KiB | 810 | 0.79 KiB |
| `client/marketing/signal-core.js` | 5,770 | 5.63 KiB | 2,142 | 2.09 KiB |
| `client/console/index.html` | 6,253 | 6.11 KiB | 2,051 | 2.00 KiB |
| `client/app.js` | 29,323 | 28.64 KiB | 6,753 | 6.59 KiB |
| `client/chat-state.js` | 2,309 | 2.25 KiB | 698 | 0.68 KiB |
| `client/assets/fonts/body-1.woff2` | 27,348 | 26.71 KiB | 27,376 | 26.73 KiB |
| `client/assets/fonts/display-1.woff2` | 22,288 | 21.77 KiB | 22,316 | 21.79 KiB |
| `client/assets/fonts/mono-1.woff2` | 21,168 | 20.67 KiB | 21,196 | 20.70 KiB |
| `client/assets/brand/signal-core-poster.svg` | 43,477 | 42.46 KiB | 7,172 | 7.00 KiB |
| `client/assets/brand/supportgenius-mark.svg` | 368 | 0.36 KiB | 228 | 0.22 KiB |
| `client/assets/brand/supportgenius-wordmark.svg` | 585 | 0.57 KiB | 365 | 0.36 KiB |
| `client/assets/brand/favicon.svg` | 368 | 0.36 KiB | 228 | 0.22 KiB |

## Browser Route, Viewports & Screenshots

- Local environment: `http://localhost:3889`, `APP_MODE=demo`, unthrottled loopback.
- Captured screenshots:
  - `docs/design-v3/screenshots/current-landing-desktop.png` (1440×1000)
  - `docs/design-v3/screenshots/current-landing-mobile.png` (390×844)
  - `docs/design-v3/screenshots/current-console-desktop.png` (1440×1000)
  - `docs/design-v3/screenshots/current-console-mobile.png` (390×844)
  - `docs/design-v3/screenshots/current-console-answered.png` (1440×1000, answered state)
- Budget measurements and degradation choice: Baseline captures adhere to existing budgets (initial JS <150 KiB gzip, fonts 70.80 KiB total, poster 43.48 KiB raw).
- Deviations from addendum: None; baseline verification and evidence collection only.
- Unverified real-device/field evidence: Measurements performed in local lab environment; real mobile cellular network latency, physical GPU degradation, and field INP remain separate evidence.
- Next task: `docs/design-v3/prompts/01-crimson-brand.md`
