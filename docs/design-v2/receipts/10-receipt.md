# 10 receipt: integrated responsive and motion verification

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `0f90bb1`
- Goal and result: Reconciled four stale assertions in `tests/browser/marketing.spec.js` where Phase 1 copy and obsolete targets (`#how-it-works`) lagged behind the approved v2 specification, while preserving every behavioral check (navigation targets, accordion disclosures, no-JS visibility, and accessibility). Hardened `tests/browser/signal-core.spec.js` to use web-first assertion polling for asynchronous Chromium media-query dispatch. Executed a complete cross-page browser and unit verification pass: 151/151 unit tests and 108/108 browser tests passed with zero failures. Verified viewports (1440×1000, 390×844, 320×800) with 0 document overflow, keyboard navigation, skip link, visible focus rings, runtime reduced-motion teardown, no-JS fallback, and WebGL context-loss recovery. Measured critical asset sizes and lab performance, explicitly distinguishing lab observations from field/real-device metrics.
- Changed scoped paths:
  - `tests/browser/marketing.spec.js`
  - `tests/browser/signal-core.spec.js`
  - `docs/design-v2/verification.md`
  - `docs/design-v2/receipts/10-receipt.md`
- Preserved contracts and product limits:
  - Real `/console/` application, state engine, and session management 100% preserved.
  - Zero live customer actions/webhooks; citations remain unavailable.
  - Native scrolling preserved; no Lenis, custom cursors, or background canvases.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151/151 tests passed |
| Full browser suite | `npm run test:browser` (`playwright test`) | Exit 0; 8 suites passed, 108/108 tests passed |
| JS syntax checks | `node -c` on changed test modules | Exit 0; syntax valid |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| Accessibility | Axe-core audit via Playwright | Exit 0; 0 serious or critical violations |
| Viewport reflow | Viewports at 1440×1000, 390×844, 320×800 | Exit 0; 0 horizontal overflow |
| Lab performance | Chromium loopback observer | Landing: Lab LCP 484ms, CLS 0.003; Console: Lab LCP 160ms, CLS 0.0119 |
| Production asset sizes | `gzipSync` measurement | Critical CSS: 6.82 KB gz; Critical JS: 2.56 KB gz |

- Screenshot paths: Verified against established suite screenshots in `docs/design-v2/screenshots/` (1440px desktop, 390px mobile, 320px reflow, reduced motion, empty/answered/error console).
- Visual comparison and deviations from design.md: None; fully conforms to Signal Architecture design v2 specifications.
- Known failures, unverified claims, blockers: Zero test failures across the entire test suite (151 unit, 108 browser). Performance figures are unthrottled local lab observations and explicitly do not constitute field INP or real-world cellular network measurements.
- Git status after scoped staging: Clean staging of owned paths.
- Next permitted task: `docs/design-v2/prompts/11-handoff.md`
