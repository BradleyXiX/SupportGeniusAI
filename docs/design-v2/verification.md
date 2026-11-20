# Verification and remaining evidence

Type: reference / evidence. 20 November 2026.

## Current application baseline

At source `35f0793`, the existing Vitest suite passed **151 tests in 16 files**, exit 0, in 30.35 seconds. The command used the working bundled Node v24 runtime because the default `node` shim is unconfigured on this machine. Production client/server files have not been changed by this design-kit work.

The existing application ran locally in explicit `APP_MODE=demo` on port 4174, with provider keys/webhook blank in the launched process. It loaded the existing console, sent a sample question, rendered a reply, and reset successfully. Desktop and 390px screenshots record the actual interface. No paid/provider requests were used. The full existing Playwright suite was not rerun; the targeted shared browser pass is described below.

## Reference browser pass

Installed Google Chrome controlled with the bundled Playwright runtime; headless, unthrottled CPU and loopback HTTP. Reference server: port 4175. Desktop 1440×1000, phone 390×844 and 320px reflow. Browser code and conditions are retained in the task's work directory; the portable outcome log is verification.json.

**32 checks passed.** Both reference pages returned zero axe findings in the tested stable states, including zero serious/critical findings. This is not a claim of full WCAG conformance. Screenshots were visually inspected for the hero, phone journey, and console composition; editable desktop board was rendered and inspected.

Verified: SVG first paint with no initial WebGL module; true WebGL after explicit enable; pause; repeated start/stop; offscreen render count stops and resumes; context loss restores poster and motion control; runtime reduced-motion; reduced-motion during a delayed module import; no WebGL import when initially reduced; unsupported WebGL; no-JS content and disabled scripted form; sample switching/pressed state; native chapter grouping; local fixture replies/reset; no landing API calls; keyboard skip link; no document overflow at 390/320; no uncaught page errors. Reference console checked at 390px.

Initial server/browser attempts hit sandbox loopback isolation. Running both local services and browser with allowed local network access resolved the connection issue. The first functional run exposed asynchronous chapter coordination; native named disclosures replaced it. Visual inspection found intrinsic SVG height on phone; height:auto fixed the poster. Only those affected checks/screenshots were rerun. They now pass.

## Asset budgets

| Asset | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| reference.js | 4254 | 1572 |
| Optional signal-core.js | 4177 | 1857 |
| styles.css | 15080 | 4122 |

Latin font subsets: **70804 bytes**. SVG poster: **43477 bytes** raw. The reference has no 3D library dependency and no runtime third-party font/API requests. All JavaScript files pass Node syntax checks. The SVG boards parse as XML.

First-pass unthrottled loopback observation: LCP 488ms, CLS 0.0037. These values precede the phone poster-height adjustment and are indicative lab observations only. They do not establish final production performance, field INP, or mobile-device frame stability. Final asset sizes above were recomputed after corrections.

## Review and limits

A separate code reviewer identified four medium issues: reduced-motion/import race, stale control after automatic disposal, no-JS GET submission, and low-contrast light-section focus. These were corrected before the final handoff. Native chapter grouping also removed a timing race discovered during browser checks.

Figma file creation succeeded; Starter-plan MCP quota prevented saving a completed design. Three editable SVG boards are provided for import. They are not auto-layout/token-bound Figma components.

## Task 10 Integrated Production Verification & Review Corrections

On branch `design/signal-architecture-v2`, the integrated application was tested across the entire browser and unit test suites:

- **Vitest unit suite**: 16 test files passed, 151/151 tests passed (exit 0).
- **Playwright browser suite**: 8 test suites passed, 111/111 tests passed (exit 0):
  - `closing-footer.spec.js` (9/9)
  - `console.spec.js` (50/50 — verified zero horizontal document overflow at 320px in empty and answered states, plus 36px touch target height on mobile reset)
  - `deployment.spec.js` (7/7 — corrected subtotal)
  - `experience.spec.js` (9/9)
  - `marketing.spec.js` (8/8 — verified native anchor URL fragments, history pushState, popstate browser back/forward, and disabled unhydrated controls)
  - `orb.spec.js` (8/8)
  - `signal-core.spec.js` (13/13 — verified progressive enhancement lifecycle and graceful disablement when WebGL module import fails)
  - `system-chapters.spec.js` (7/7)
- **Axe-core accessibility**: 0 serious or critical violations on `/` and `/console/`.
- **Responsive verification**: 1440×1000, 390×844, and 320×800 viewports with zero horizontal document overflow.
- **Motion & fallbacks**: SVG first paint, explicit WebGL activation, pause, context loss recovery, runtime reduced-motion teardown, and 100% no-JS operability.
- **Lab performance observations** (unthrottled local Chrome):
  - Landing (`/`): Lab LCP 484 ms, Lab CLS 0.003
  - Console (`/console/`): Lab LCP 160 ms, Lab CLS 0.0119
  - *Distinction*: These are local lab observations and do not establish field INP or throttled mobile network conditions.
- **Production asset sizes & gzip accounting**:
  - `client/index.html`: 11.38 KB (3.30 KB estimated gzip)
  - `client/brand.css`: 13.45 KB (2.26 KB estimated gzip)
  - `client/marketing.css`: 29.68 KB (4.90 KB estimated gzip)
  - `client/styles.css`: 40.37 KB (6.73 KB estimated gzip)
  - `client/landing.js`: 5.63 KB (1.68 KB estimated gzip)
  - `client/marketing/chapters.js` (eager dependency): 1.01 KB (0.45 KB estimated gzip)
  - `client/marketing/examples.js` (eager dependency): 1.87 KB (0.78 KB estimated gzip)
  - `client/marketing/signal-core.js` (deferred WebGL): 5.45 KB (2.08 KB estimated gzip)
  - `client/console/index.html`: 6.11 KB (2.00 KB estimated gzip)
  - `client/app.js`: 28.64 KB (6.59 KB estimated gzip)
  - `client/chat-state.js`: 2.25 KB (0.68 KB estimated gzip)
- **Separately reported static assets**:
  - Latin font subsets (`client/assets/fonts/`): 70,804 bytes total across `body-1.woff2` (27.35 KB), `display-1.woff2` (22.29 KB), and `mono-1.woff2` (21.17 KB).
  - Hero SVG poster (`client/assets/brand/signal-core-poster.svg`): 43,477 bytes raw (43.48 KB decimal / 42.46 KiB).
- **Compression disclosure**: All gzip values are software-calculated gzip estimates, not measured wire transfers with live HTTP compression headers.
