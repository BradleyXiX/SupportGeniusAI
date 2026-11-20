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

Remaining work: integrate the sections through the Antigravity prompts; run the existing full browser suite on that integrated branch; measure a throttled production-like trace and real-device behavior; check actual hosting preview/deploy policy before publishing; verify real-provider quality in staging separately. No award, performance compliance, or production-readiness claim is made for an unintegrated reference.
