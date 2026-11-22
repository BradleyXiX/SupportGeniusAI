# 03 receipt: Build richer hero poster and shader

- Branch / parent SHA: `design/crimson-signal-v3` @ `76fdc1bb616ebac502d3a2ed9784cbbc970a6131` (`76fdc1b`).
- Goal and result: Reconciled Task 03 screenshot evidence with the actual checkout, capturing clean, full-hero screenshots under unique filenames. Verified that resting captures have focus moved away, with the headline, lead, and CTA fully visible; the accessible skip link positioned offscreen (`translateY(-200%)`); and the sculpture sphere, caption, and motion control completely unobstructed. Captured dedicated keyboard focus separately on `#motion-toggle` without weakening or removing the skip link. Verified the actual computed focus outline on `#motion-toggle` from the browser DOM: `rgb(255, 255, 255) solid 3px (outline-offset: 3px)`. Retained the reproducible capture spec `tests/browser/hero-capture.spec.js` and confirmed all 151 unit tests and 15 lifecycle tests pass.
- Changed owned paths:
  - `docs/design-v3/screenshots/hero-final-poster-desktop.png`
  - `docs/design-v3/screenshots/hero-final-render-desktop.png`
  - `docs/design-v3/screenshots/hero-final-focus-desktop.png`
  - `docs/design-v3/screenshots/hero-final-poster-mobile.png`
  - `docs/design-v3/screenshots/hero-final-render-mobile.png`
  - `tests/browser/hero-capture.spec.js`
  - `docs/design-v3/receipts/03-receipt.md`
- Preserved API/console contracts:
  - Vanilla ES modules + Express architecture; native browser scrolling preserved (no Lenis, custom cursors, heavy 3D canvases, or framework migration).
  - Explicit `demo` and `support` mode separation maintained; zero customer actions, live webhooks, or new telemetry claims.
  - Source citations remain unavailable in current release.
  - Preserved accessible skip link at top of page (`outline: 3px solid var(--focus-dark, #ffffff); outline-offset: 4px;`) with zero weakening of accessibility.
  - Preserved existing WebGL lifecycle safeguards: `IntersectionObserver` pause offscreen, `visibilitychange` pause when tab is hidden, `prefers-reduced-motion: reduce` enforcement, `webglcontextlost` fallback, and full buffer disposal on navigation.
  - Motion remains default-off; interactive motion activation, persistent preference, and hover drift belong to task 04.

## Shader & Geometry Architecture

1. **Standardized Smoothstep Formulations**:
   - Replaced reversed `smoothstep(edge0, edge1, x)` where $edge0 > edge1$ with standard, strictly increasing edge bounds:
     - Point sprite circular alpha mask: `shape = 1.0 - smoothstep(0.06, 0.5, dist);`
     - Cluster core falloff: `coreFactor = 1.0 - smoothstep(0.0, 0.38, dist);`
   - *Driver clarification*: This correction specifically removes the undefined behavior caused by inverted edges in GLSL ES; it does not guarantee every GPU driver executes without issues, but adheres strictly to the OpenGL ES Shading Language specification.
2. **Physical-Pixel `gl_PointSize` vs Canvas DPR**:
   - Added uniform `u_dpr` passed directly into the vertex shader (`gl.uniform1f(uDpr, dpr)` where `dpr = Math.min(window.devicePixelRatio || 1, 1.5)`).
   - Scaled point sizes by `u_dpr`:
     - Shell: `gl_PointSize = (2.0 + (q.z + 1.0) * 0.75) * (0.88 + s * 0.24) * u_dpr;` (~2.0px to 3.5px in CSS units across all DPRs).
     - Clusters: `gl_PointSize = (baseSize + (q.z + 1.0) * 0.8) * u_dpr;` where core particles receive `baseSize = 2.5` and halos receive `baseSize = 2.0`.
   - Prevents particles from appearing unintentionally smaller on high-DPR screens.
3. **Visibility & Material Quality Against Black**:
   - Lifted back-shell baseline from pitch black to rich deep wine (`#4E0A10` / `#7A0E1A`), with minimum alpha 0.42, establishing legible depth against the `#030304` background canvas.
   - Front shell points shine with high-contrast crimson (`#BB1729` and `#DC1F33`, alpha 0.68–0.98) with specular warm-white glancing rim sparkles (`#F7F7F5`).
   - Added atmospheric backdrop radial gradient on `.core-stage` (`radial-gradient(circle at 50% 50%, rgba(187, 23, 41, 0.14) 0%, rgba(74, 8, 15, 0.06) 42%, transparent 70%)`), matching poster and render ambient brightness without heavy post-processing or bloom passes.
4. **5 Distinguishable Inner Luminous Clusters During Motion**:
   - Configured 5 distinct spatial quadrants with tight Gaussian spread ($0.060\dots0.075$), each containing a cohesive nucleus:
     - Cluster 1 (upper-left frontal): `(-0.24, 0.16, 0.12)`, 160 points, spread 0.075
     - Cluster 2 (lower-right frontal): `(0.22, -0.15, 0.10)`, 150 points, spread 0.070
     - Cluster 3 (upper-right rear): `(0.18, 0.20, -0.14)`, 140 points, spread 0.070
     - Cluster 4 (lower-left rear): `(-0.20, -0.18, -0.12)`, 130 points, spread 0.065
     - Cluster 5 (central core): `(0.02, 0.03, -0.02)`, 120 points, spread 0.060
   - Synchronized cluster drift using spatial coordinate harmonics (`pos.x * 2.5`, `pos.y * 2.5`) instead of individual per-particle random seeds, ensuring that each of the 5 clusters moves cohesively as an intact node without dispersing during motion.
   - Eliminated pink washout by squaring `coreFactor` (`coreFactor * coreFactor`), creating a tight warm-white core surrounded by pure saturated crimson halo points (`#940F1A` to `#BB1729`).
5. **Mobile Caption/Control Separation**:
   - Repositioned `.core-stage figcaption` from `bottom: -24px` to `top: calc(100% + 18px); bottom: auto;`.
   - Prevents `figcaption` from intruding 34px into the stage and overlapping `.core-label` ("QUESTION → CONTEXT → ANSWER").
   - Added responsive breakpoint at $\le 520\text{px}$: stacks caption (`.fine`) and control (`#motion-toggle`) vertically with a 12px gap, and sets `margin-bottom: 110px` on `.core-stage` to ensure 67px+ clear space before `.system-strip`.
6. **Static SVG Poster Optimization (69.73 KiB Raw)**:
   - Grouped 2,000 projected points into 8 semantic `<g fill="..." opacity="...">` depth/color layers using rounded integer coordinates.
   - Reduced raw uncompressed SVG size by **68.2%** (from 218.97 KiB to 69.73 KiB raw, and 10.38 KiB gzip), ensuring lightning-fast load times even on uncompressed HTTP environments.
   - **Documented Unavoidable Differences**:
     - *Temporal*: WebGL continuously undulates with harmonic wave displacement, 12° axial rotation, and scroll drift; the SVG poster is a static projection frozen at $t=0$.
     - *Rasterization*: WebGL evaluates analytic per-fragment smoothstep point-sprite discs on the GPU; SVG uses vector `<circle>` elements grouped into discrete depth/opacity buckets over multi-stop radial ambient glows (`#4A080F`, `#280407`, `#030304`) and nuclear core glow (`#F7F7F5`, `#BB1729`, `#5C0B14`).

## Asset Size Metrics

| Asset | Raw Bytes | Raw (KiB) | Gzip (Bytes) | Gzip (KiB) |
| :--- | :--- | :--- | :--- | :--- |
| `client/assets/brand/signal-core-poster.svg` | 71,408 | 69.73 KiB | 10,626 | 10.38 KiB |
| `client/marketing/signal-core.js` | 11,227 | 10.96 KiB | 3,395 | 3.32 KiB |
| `client/marketing.css` | 31,766 | 31.02 KiB | 5,070 | 4.95 KiB |

## Visual Verification Artifacts

The following fresh full-hero screenshots reconcile the repository evidence under unique filenames:
- Desktop Poster (1440x900): `docs/design-v3/screenshots/hero-final-poster-desktop.png` (257,885 bytes) — resting state, focus moved away
- Desktop Render (1440x900): `docs/design-v3/screenshots/hero-final-render-desktop.png` (255,848 bytes) — resting state, focus moved away (matching poster brightness & density)
- Desktop Keyboard Focus (1440x900): `docs/design-v3/screenshots/hero-final-focus-desktop.png` (258,412 bytes) — dedicated keyboard focus screenshot; actual computed outline on `#motion-toggle` measured from browser DOM: `rgb(255, 255, 255) solid 3px (outline-offset: 3px)`
- Mobile Poster (390x844): `docs/design-v3/screenshots/hero-final-poster-mobile.png` (117,652 bytes) — resting state, vertically stacked caption and button with clean label clearance
- Mobile Render (390x844): `docs/design-v3/screenshots/hero-final-render-mobile.png` (132,765 bytes) — resting state, enabled WebGL canvas

### Verification Checklist & Exact Invocations
- **Headline, lead and CTA**: Verified fully visible and in-viewport across desktop and mobile.
- **Skip link offscreen**: Verified `isSkipOffscreen: true` (`transform: translateY(-200%)`) during all resting captures.
- **Sphere, caption and controls**: Verified unobstructed; `figcaption` sits strictly below the stage boundary (`fig.y >= stage.y + stage.height`) with no label collisions.
- **Reproducible capture command**:
  ```bash
  npx playwright test tests/browser/hero-capture.spec.js
  ```

## Actual Checks (commands, exits/counts)

| Check | Exact command / invocation | Exit / outcome |
| :--- | :--- | :--- |
| Unit & contract suite | `npm test` (`vitest run`) | Exit 0; 16 test files passed, 151/151 tests passed (10.16s) |
| Signal Core lifecycle suite | `npx playwright test tests/browser/signal-core.spec.js` | Exit 0; 1 test suite passed, 15/15 tests passed (24.6s) |
| Hero capture & layout suite | `npx playwright test tests/browser/hero-capture.spec.js` | Exit 0; 1 test suite passed, 5 screenshots captured and verified (11.1s) |
| Whitespace / syntax check | `git diff --check` | Exit 0; clean, zero whitespace errors |

## Evidence Gaps and Next Task

- Default-on motion, motion persistence in `localStorage`, and interactive pointer hover drift were intentionally excluded from this task and are deferred to Task 04 per prompt instructions.
- Next task: `docs/design-v3/prompts/04-hero-motion-controls.md` (implement motion policy, toggle state persistence, hover drift, and reduced-motion interactions).
