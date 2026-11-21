# 03 receipt: Build richer hero poster and shader

- Branch / parent SHA: `design/crimson-signal-v3` @ `e538ed4038fd6c005bfd3f5ab008f1ebaecaba79` (`e538ed4`).
- Goal and result: Replaced the former flat latitude-band hero sculpture with a rich, organic 3,100-point point sculpture comprising an outer fluid shell (2,400 points) and luminous inner clusters (700 points across 4 dense centers). Authored a matching static SVG poster generated from the identical perspective projection and multi-frequency wave math at $t=0$, eliminating discrepancies between static poster and WebGL canvas. Maintained the darker crimson palette (`#BB1729`, `#D52A38`, `#5C0B14`, `#42070D`) with warm-white sparkles and cores (`#F7F7F5`) with zero pink accents. Preserved all native lifecycle guards, default-off motion policy, and explicit demo/support architecture.
- Changed owned paths:
  - `client/assets/brand/signal-core-poster.svg`
  - `client/marketing.css`
  - `client/marketing/signal-core.js`
  - `docs/design-v3/screenshots/hero-poster-desktop.png`
  - `docs/design-v3/screenshots/hero-poster-mobile.png`
  - `docs/design-v3/screenshots/hero-render-desktop.png`
  - `docs/design-v3/screenshots/hero-render-mobile.png`
  - `docs/design-v3/receipts/03-receipt.md`
- Preserved API/console contracts:
  - Vanilla ES modules + Express architecture; native browser scrolling preserved (no Lenis, custom cursors, heavy 3D canvases, or framework migration).
  - Explicit `demo` and `support` mode separation maintained; zero customer actions, live webhooks, or new telemetry claims.
  - Source citations remain unavailable in current release.
  - Preserved existing WebGL lifecycle safeguards: `IntersectionObserver` pause offscreen, `visibilitychange` pause when tab is hidden, `prefers-reduced-motion: reduce` enforcement, `webglcontextlost` fallback, and full buffer disposal on navigation.
  - Motion remains default-off; interactive motion activation, persistent preference, and hover drift belong to task 04.

## Shader & Geometry Architecture

1. **Geometry Formulation (3,100 Total Points)**:
   - **Outer Fluid Shell (2,400 points)**: Uniform distribution via golden-ratio Fibonacci sphere lattice ($r = 1.0$), combined in-shader with multi-frequency continuous wave displacement:
     $$\text{disp} = \sin(x \cdot 3.5 + t \cdot 0.75) \cdot \cos(y \cdot 3.2 + t \cdot 0.60) \cdot 0.08 + \sin(z \cdot 4.0 - t \cdot 0.85) \cdot 0.06 + \sin(x \cdot z \cdot 5.0 + t \cdot 1.10) \cdot 0.04$$
   - **Inner Luminous Clusters (700 points)**: 4 distinct cluster centers with Gaussian radial falloff ($r = \text{spread} \cdot \sqrt{-2 \ln(u_1)}$), each exhibiting gentle independent harmonic drift:
     - Center 1: $(-0.10, 0.08, 0.06)$, 220 points, spread 0.16
     - Center 2: $(0.12, -0.06, -0.05)$, 180 points, spread 0.14
     - Center 3: $(-0.02, 0.14, -0.08)$, 160 points, spread 0.14
     - Center 4: $(0.04, -0.11, 0.10)$, 140 points, spread 0.13
2. **Point Sprite Rendering & Shading**:
   - Soft circular point sprites with analytic radial falloff `smoothstep(0.5, 0.06, dist)` avoiding hard pixelated square boundaries.
   - Depth-sorted multi-layer color grading:
     - Back shell ($z < 0$): Deep wine (`#42070D` to `#7A0E1A`), low opacity (0.28–0.60) providing volumetric shadow.
     - Front shell ($z \ge 0$): Vibrant crimson (`#BB1729`) and hot crimson (`#D52A38`), with selective warm-white sparkles (`#F7F7F5`) along high-depth glancing angles.
     - Inner clusters: Radiant warm-white core (`#F7F7F5`) with vibrant hot crimson halo (`#D52A38`), opacity 0.75–0.95.
   - Zero pink text or pink color accents used anywhere.
3. **Static SVG Poster Alignment**:
   - Generated via deterministic projection matching the vertex shader at $t=0$: 12-degree axial tilt, perspective divisor $d = 3.4 - z \cdot 0.45$, and projection scale factor 850 in an 800x800 viewBox (~500px sphere diameter).
   - Rendered using depth-sorted circles (painter's algorithm) over layered radial ambient backdrop gradients (`#5C0B14`, `#36050A`, `#030304`) and inner nuclear glow (`#F7F7F5`, `#D52A38`, `#BB1729`).
   - Outer architectural crimson ring ($r=364$) with horizontal alignment ticks ($x=36\dots120$, $x=680\dots764$).
4. **Stage Layout Synchronization**:
   - Updated `.core-stage` to `aspect-ratio: 1` and `.core-stage canvas` to `position: absolute; inset: 0; width: 100%; height: 100%;`.
   - Scaled WebGL projection multiplier to $2.12$ to yield identical 500px diameter on 800px coordinate space, ensuring zero layout shift or silhouette mismatch between static poster and WebGL canvas.

## Asset Size Metrics

| Asset | Raw Bytes | Raw (KiB) | Gzip (Bytes) | Gzip (KiB) |
| :--- | :--- | :--- | :--- | :--- |
| `client/assets/brand/signal-core-poster.svg` | 224,224 | 218.97 KiB | 26,391 | 25.77 KiB |
| `client/marketing/signal-core.js` | 10,628 | 10.38 KiB | 3,310 | 3.23 KiB |
| `client/marketing.css` | 31,270 | 30.54 KiB | 4,990 | 4.87 KiB |

*Note on poster size*: The high-fidelity 3,100-point SVG fallback compresses efficiently under gzip to 25.77 KiB, easily fitting within acceptable initial page load budgets while guaranteeing an identical silhouette before JS loads or when WebGL is disabled.

## Visual Verification Artifacts

The following screenshots capture the hero section at 1440x900 desktop and 390x844 mobile viewports in both default static poster and active WebGL render states:
- Desktop Poster (1440x900): `docs/design-v3/screenshots/hero-poster-desktop.png` (243,814 bytes)
- Desktop Render (1440x900): `docs/design-v3/screenshots/hero-render-desktop.png` (181,761 bytes)
- Mobile Poster (390x844): `docs/design-v3/screenshots/hero-poster-mobile.png` (118,045 bytes)
- Mobile Render (390x844): `docs/design-v3/screenshots/hero-render-mobile.png` (116,857 bytes)

## Actual Checks (commands, exits/counts)

| Check | Exact command / invocation | Exit / outcome |
| :--- | :--- | :--- |
| Unit & contract suite | `npm test` (`vitest run`) | Exit 0; 16 test files passed, 151/151 tests passed (6.82s) |
| Signal Core lifecycle suite | `npx playwright test tests/browser/signal-core.spec.js` | Exit 0; 1 test suite passed, 15/15 tests passed (25.1s) |
| Hero capture spec | `npx playwright test tests/browser/hero-capture.spec.js` | Exit 0; 4 screenshots captured (11.0s) |
| Whitespace / syntax check | `git diff --check` | Exit 0; clean, zero whitespace errors |

## Evidence Gaps and Next Task

- Default-on motion, motion persistence in `localStorage`, and interactive pointer hover drift were intentionally excluded from this task and are deferred to Task 04 per prompt instructions.
- Next task: `docs/design-v3/prompts/04-hero-motion-controls.md` (implement motion policy, toggle state persistence, hover drift, and reduced-motion interactions).
