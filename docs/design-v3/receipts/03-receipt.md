# 03 receipt: Build richer hero poster and shader

- Branch / parent SHA: `design/crimson-signal-v3` @ `61412a5de3bb117665f6aed51024ac613aece507` (`61412a5`).
- Goal and result: Refined the native WebGL hero sculpture and matching static SVG poster toward the reference video. Corrected reversed smoothstep expressions using strictly increasing edge bounds (`1.0 - smoothstep(0.06, 0.5, dist)` and `1.0 - smoothstep(0.0, 0.35, dist)`). Refined the geometry with smaller, finer point sprites, a dense continuous fluid envelope (3,200 shell points), and 5 distinct, spatially separated inner luminous clusters (spread 0.060–0.075) eliminating single-clump coalescence. Graded colors into deep saturated wine/crimson (`#420A0F`, `#8A0D17`, `#BB1729`) with warm-white bright puncta (`#F7F7F5`), eliminating pastel pink RGB mixing. Drastically optimized the static SVG poster from 219 KiB raw down to **69.73 KiB raw** (10.42 KiB gzip) via semantic layer grouping and integer coordinates without assuming HTTP gzip is enabled. Resolved mobile caption/control collision by placing `figcaption` 18px below the stage boundary and vertically stacking caption and button on viewports $\le$ 520px with generous clearance from `.core-label` and `.system-strip`. Captured clean desktop/mobile poster and enabled states, plus a dedicated keyboard-focus state.
- Changed owned paths:
  - `client/assets/brand/signal-core-poster.svg`
  - `client/marketing.css`
  - `client/marketing/signal-core.js`
  - `docs/design-v3/screenshots/hero-poster-desktop.png`
  - `docs/design-v3/screenshots/hero-poster-mobile.png`
  - `docs/design-v3/screenshots/hero-render-desktop.png`
  - `docs/design-v3/screenshots/hero-render-mobile.png`
  - `docs/design-v3/screenshots/hero-focus-desktop.png`
  - `docs/design-v3/receipts/03-receipt.md`
- Preserved API/console contracts:
  - Vanilla ES modules + Express architecture; native browser scrolling preserved (no Lenis, custom cursors, heavy 3D canvases, or framework migration).
  - Explicit `demo` and `support` mode separation maintained; zero customer actions, live webhooks, or new telemetry claims.
  - Source citations remain unavailable in current release.
  - Preserved existing WebGL lifecycle safeguards: `IntersectionObserver` pause offscreen, `visibilitychange` pause when tab is hidden, `prefers-reduced-motion: reduce` enforcement, `webglcontextlost` fallback, and full buffer disposal on navigation.
  - Motion remains default-off; interactive motion activation, persistent preference, and hover drift belong to task 04.

## Shader & Geometry Architecture

1. **Standardized Smoothstep Transitions**:
   - Replaced reversed `smoothstep(edge0, edge1, x)` where $edge0 > edge1$ with standard, strictly increasing edge formulations:
     - Point sprite circular alpha mask: `shape = 1.0 - smoothstep(0.06, 0.5, dist);`
     - Cluster core falloff: `coreEdge = 1.0 - smoothstep(0.0, 0.35, dist);`
   - Guarantees fully standard GLSL ES execution across all mobile and desktop GPU drivers without undefined edge behavior.
2. **Smaller, Finer Particle Scale**:
   - Scaled down point sprite size:
     - Shell: `gl_PointSize = (1.4 + (q.z + 1.0) * 0.85) * (0.85 + s * 0.30);` (~1.4px to 2.8px at 1x DPR, ~2.1px to 4.2px at 1.5x DPR).
     - Clusters: `gl_PointSize = (1.6 + (q.z + 1.0) * 0.95) * (0.90 + s * 0.30);` (~1.6px to 3.2px at 1x DPR).
   - Eliminates oversized pixel blocks while rendering a delicate, high-density celestial veil.
3. **Continuous Fluid Envelope (3,200 Shell Points)**:
   - Outer shell expanded to 3,200 points on a Fibonacci sphere lattice with harmonic wave displacement:
     $$\text{disp} = \sin(x \cdot 3.5 + t \cdot 0.75) \cdot \cos(y \cdot 3.2 + t \cdot 0.60) \cdot 0.08 + \sin(z \cdot 4.0 - t \cdot 0.85) \cdot 0.06 + \sin(x \cdot z \cdot 5.0 + t \cdot 1.10) \cdot 0.04$$
   - Provides a continuous, fluid-like envelope with organic wave undulations and no artificial latitude striping.
4. **5 Distinguishable Inner Luminous Clusters (700 Total Points)**:
   - Positioned in 5 distinct spatial quadrants with tight Gaussian spread ($0.060\dots0.075$), creating discrete constellation hubs separated by clear void:
     - Cluster 1 (upper-left frontal): `(-0.24, 0.16, 0.12)`, 160 points, spread 0.075
     - Cluster 2 (lower-right frontal): `(0.22, -0.15, 0.10)`, 150 points, spread 0.070
     - Cluster 3 (upper-right rear): `(0.18, 0.20, -0.14)`, 140 points, spread 0.070
     - Cluster 4 (lower-left rear): `(-0.20, -0.18, -0.12)`, 130 points, spread 0.065
     - Cluster 5 (central core): `(0.02, 0.03, -0.02)`, 120 points, spread 0.060
5. **Color Grading & Elimination of Pink Cores**:
   - Replaced linear RGB white/red mixes (which created pastel pink intermediate values) with saturated crimson foundations:
     - Cluster halos: saturated crimson (`#8A0D17` to `#BB1729`).
     - Core highlights: bright warm-white (`#F7F7F5`) restricted strictly to high-density center nuclei (`pow(coreEdge, 3.0) * step(0.45, v_seed)`), preventing diffuse pastel washout.
     - Shell back shadow: deep volumetric wine (`#420A0F`), alpha 0.24–0.54.
     - Shell front: vibrant crimson (`#BB1729`) and rich crimson (`#D11A2E`) with specular warm-white glancing rim sparkles (`#F7F7F5`).
6. **Mobile Caption/Control Separation**:
   - Repositioned `.core-stage figcaption` from `bottom: -24px` to `top: calc(100% + 18px); bottom: auto;`.
   - Prevents `figcaption` from intruding 34px into the stage and overlapping `.core-label` ("QUESTION → CONTEXT → ANSWER").
   - Added responsive breakpoint at $\le 520\text{px}$: stacks caption (`.fine`) and control (`#motion-toggle`) vertically with a 12px gap, and sets `margin-bottom: 110px` on `.core-stage` to ensure 67px+ clear space before `.system-strip`.
7. **Static SVG Poster Optimization (69.73 KiB Raw)**:
   - Rewrote poster architecture: grouped 2,000 projected points into 8 semantic `<g fill="..." opacity="...">` depth/color layers using rounded integer coordinates.
   - Reduced raw uncompressed SVG size by **68.2%** (from 218.97 KiB to 69.73 KiB raw, and 10.42 KiB gzip), ensuring lightning-fast load times even on uncompressed HTTP environments.
   - **Documented Unavoidable Differences**:
     - *Temporal*: WebGL continuously undulates with harmonic wave displacement, 12° axial rotation, and mouse scroll drift; the SVG poster is a static projection frozen at $t=0$.
     - *Rasterization*: WebGL evaluates analytic per-fragment smoothstep point-sprite discs on the GPU; SVG uses vector `<circle>` elements grouped into discrete depth/opacity buckets over multi-stop radial ambient glows (`#4A080F`, `#280407`, `#030304`) and nuclear core glow (`#F7F7F5`, `#BB1729`, `#5C0B14`).

## Asset Size Metrics

| Asset | Raw Bytes | Raw (KiB) | Gzip (Bytes) | Gzip (KiB) |
| :--- | :--- | :--- | :--- | :--- |
| `client/assets/brand/signal-core-poster.svg` | 71,408 | 69.73 KiB | 10,671 | 10.42 KiB |
| `client/marketing/signal-core.js` | 10,908 | 10.65 KiB | 3,385 | 3.31 KiB |
| `client/marketing.css` | 31,643 | 30.90 KiB | 5,026 | 4.91 KiB |

## Visual Verification Artifacts

The following screenshots capture the hero section at 1440x900 desktop and 390x844 mobile viewports:
- Desktop Poster (1440x900): `docs/design-v3/screenshots/hero-poster-desktop.png` (182,498 bytes)
- Desktop Render (1440x900): `docs/design-v3/screenshots/hero-render-desktop.png` (140,237 bytes)
- Desktop Keyboard Focus (1440x900): `docs/design-v3/screenshots/hero-focus-desktop.png` (183,021 bytes) — shows high-contrast 2px solid `#BB1729` focus ring on `#motion-toggle`
- Mobile Poster (390x844): `docs/design-v3/screenshots/hero-poster-mobile.png` (94,591 bytes) — shows vertically stacked caption and button with clean label clearance
- Mobile Render (390x844): `docs/design-v3/screenshots/hero-render-mobile.png` (95,788 bytes)

## Actual Checks (commands, exits/counts)

| Check | Exact command / invocation | Exit / outcome |
| :--- | :--- | :--- |
| Unit & contract suite | `npm test` (`vitest run`) | Exit 0; 16 test files passed, 151/151 tests passed (6.67s) |
| Signal Core lifecycle suite | `npx playwright test tests/browser/signal-core.spec.js` | Exit 0; 1 test suite passed, 15/15 tests passed (22.4s) |
| Hero capture & layout suite | `npx playwright test tests/browser/hero-capture-and-verify.spec.js` | Exit 0; all clearance assertions verified and 5 screenshots captured (12.4s) |
| Whitespace / syntax check | `git diff --check` | Exit 0; clean, zero whitespace errors |

## Evidence Gaps and Next Task

- Default-on motion, motion persistence in `localStorage`, and interactive pointer hover drift were intentionally excluded from this task and are deferred to Task 04 per prompt instructions.
- Next task: `docs/design-v3/prompts/04-hero-motion-controls.md` (implement motion policy, toggle state persistence, hover drift, and reduced-motion interactions).
