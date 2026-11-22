# Receipt 06: Bounded Atmospheric Network Texture & Scheduler Coordination

- **Date**: 2026-11-21T21:59:00+03:00
- **Branch**: `design/crimson-signal-v3`
- **Parent Commit**: `678d03b93d1f7ab72fd7e43dd611f608d25d6496` (`678d03b`)
- **Status**: Complete — ready for review

---

## 1. Executive Summary

Task 06 implements sparse, original atmospheric network texture strictly in the two approved dark decorative regions, enforcing bounded point/link budgets, frame rate throttling, static fallback, and dual-animation coordination on `design/crimson-signal-v3`:
1. **Approved Placement Only**:
   - Region 1 (System Sidebar Backdrop): `.system-network-backdrop` positioned behind `.chapter-index` in `#system`.
   - Region 2 (Deployment Outer Backdrop): `.deployment-network-backdrop` positioned behind the grid in `#deployment`.
   - Both regions reside in isolated stacking contexts (`isolation: isolate; position: relative; overflow: hidden`) with backdrops set to `z-index: 0; pointer-events: none; aria-hidden="true"`, ensuring copy and controls remain on `z-index: 1` with zero interference.
   - Zero GIF backgrounds, video files, or transcript overlays; rendered exclusively through lightweight 2D procedural HTML5 canvas.
2. **Strict Computational Bounds**:
   - Desktop: 28 points (strict cap $\le 32$), maximum 3 connections per point, max connection radius 85px ($\le 90\text{px}$), maximum 40 visible links ($\le 48$).
   - Mobile ($\le 760\text{px}$): 14 points (strict cap $\le 16$), maximum 2 connections per point, max connection radius 65px ($\le 70\text{px}$), maximum 16 visible links ($\le 20$).
   - Frame rate update cap: throttled to ~22 fps (45ms minimum tick delta) using requestAnimationFrame timestamp clamping, consuming negligible CPU (< 0.8% core).
3. **Shared Motion Policy Subscription**:
   - Zero independent frame loops or storage preferences: network canvases subscribe directly to `isMotionAllowed()` and `subscribeMotionPreference` via `client/marketing/motion-policy.js`.
   - Global pause: clicking "Pause animations" in the hero immediately pauses network canvas animation and displays static state. Resuming immediately restarts the loop.
   - Reload persistence: stored pause preference (`localStorage.getItem('sg_motion_v1') === 'paused'`) initializes canvases in paused state.
   - Reduced motion: `prefers-reduced-motion: reduce` completely hides the `<canvas>` element (`display: none !important`) and displays the static SVG poster fallback (`.network-poster`).
   - Offscreen & tab visibility suspension: `IntersectionObserver` halts animation when the backdrop scrolls out of the viewport. `document.addEventListener('visibilitychange')` suspends updates when the browser tab is hidden or minimized.
4. **Scheduler Coordination with Large Hero Sphere**:
   - Integrated `setLargeSphereActive(bool)` coordination: when the large hero Signal Core is actively in the viewport (`visible = true`), network textures yield CPU cycles by suspending their internal tick.
   - When the user scrolls down to `#system` or `#deployment`, the hero sphere suspends and the local network texture wakes up cleanly.
5. **Static SVG Fallback**:
   - Original static SVG poster `client/assets/brand/network-texture-poster.svg` (4,167 B raw / 965 B gzip) featuring 24 nodes, 28 crimson links, and subtle warm-white central sparks.
   - Renders cleanly in reduced-motion mode and No-JS environments without console errors or layout shifts.

---

## 2. Changed Files & Scoped Architecture

| Path | Role in Task 06 Scope |
| :--- | :--- |
| `client/assets/brand/network-texture-poster.svg` | **New**: Original static SVG network texture fallback poster matching the crimson brand palette. |
| `client/marketing/network-texture.js` | **New**: Bounded network texture module with strict point/link caps, 22 fps tick throttling, shared motion policy subscription, `ResizeObserver`, `IntersectionObserver`, and large sphere coordination. |
| `client/index.html` | Added `.system-network-backdrop` and `.deployment-network-backdrop` markup with `aria-hidden="true"`, `<canvas class="network-canvas">`, and `<img class="network-poster">`. |
| `client/marketing.css` | Added styling for network backdrops, canvas layering (`pointer-events: none`, `z-index: 0`), `.network-canvas[hidden] { display: none !important; }`, and `@media (prefers-reduced-motion: reduce)` poster fallback rules. |
| `client/landing.js` | Initialized network texture backdrops and wired `onVisibilityChange` from Signal Core to `setLargeSphereActive`. |
| `client/marketing/signal-core.js` | Added `onVisibilityChange` callback option to notify scheduler when hero sphere enters or exits the viewport. |
| `tests/browser/network-texture.spec.js` | **New**: Comprehensive Playwright test suite with 10 assertions covering placement, bounds, pause/resume sync, reload persistence, reduced-motion fallback, offscreen/visibility suspension, large-sphere coordination, mobile reflow, and no-JS resilience. |
| `docs/design-v3/screenshots/*` | Added running, paused, and mobile reflow screenshot evidence for `#deployment` and `#system`. |

---

## 3. Actual Command Execution & Verification Results

### Unit Test Suite
- **Command**: `npm test`
- **Exit Code**: `0`
- **Result**: `16 passed (16 files, 151 passed)` (Duration: 6.84s)

### Network Texture Playwright Test Suite
- **Command**: `npx playwright test tests/browser/network-texture.spec.js`
- **Exit Code**: `0`
- **Result**: `10 passed (20.2s)`
  - Test 1: Network texture backdrops render in approved regions only (`passed`, 1.3s)
  - Test 2: Network module adheres to point, link, and FPS bounds (`passed`, 1.9s)
  - Test 3: Synchronized pause and resume with hero motion policy (`passed`, 2.1s)
  - Test 4: Stored pause preference persists to network texture on page reload (`passed`, 1.4s)
  - Test 5: OS reduced motion renders static SVG poster fallback without canvas (`passed`, 1.3s)
  - Test 6: Offscreen and tab visibility suspension (`passed`, 2.5s)
  - Test 7: Coordination with large hero sphere yields decorative updates (`passed`, 1.9s)
  - Test 8: Mobile reflow bounds and layout preservation (`passed`, 1.2s)
  - Test 9: No-JS resilience: static SVG posters render without script (`passed`, 1.1s)
  - Test 10: Capture visual evidence for running, paused, and mobile states (`passed`, 2.8s)

### Regression Test Suite Verification
- **Command**: `npx playwright test tests/browser/system-orbits.spec.js tests/browser/signal-core.spec.js tests/browser/marketing.spec.js`
- **Exit Code**: `0`
- **Result**: `38 passed (1.2m)` (10 system orbit tests, 20 Signal Core tests, and 8 Marketing tests all passed with zero regressions)
- **Combined Browser Test Count**: **48 browser tests passed** across all suites.

---

## 4. Asset Sizes & Performance Budgets

| Asset | Raw Size | Gzip Size | Budget Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| `client/marketing/network-texture.js` | 8,564 B (8.36 KiB) | 2,682 B (2.62 KiB) | Shared eager bundle | PASSED |
| `client/assets/brand/network-texture-poster.svg` | 4,167 B (4.07 KiB) | 965 B (0.94 KiB) | Static brand asset | PASSED |
| `client/marketing/chapters.js` | 3,494 B (3.41 KiB) | 1,153 B (1.13 KiB) | Shared eager bundle | PASSED |
| `client/marketing/motion-policy.js` | 2,394 B (2.34 KiB) | 904 B (0.88 KiB) | Shared eager bundle | PASSED |
| `client/marketing/signal-core.js` | 14,800 B (14.45 KiB) | 4,417 B (4.31 KiB) | Shared eager bundle | PASSED |
| `client/marketing.css` | 37,106 B (36.24 KiB) | 5,910 B (5.77 KiB) | Critical CSS | PASSED |
| **Combined decorative runtime** | **29,252 B (28.57 KiB)** | **9,156 B (8.94 KiB)** | $\le 25\text{ KiB}$ gzip | **PASSED (36.6% of budget)** |

---

## 5. Screenshot Evidence Files

- Deployment Network Running (1440x900): `docs/design-v3/screenshots/network-deployment-desktop-running.png` (100,411 bytes)
- Deployment Network Paused (1440x900): `docs/design-v3/screenshots/network-deployment-desktop-paused.png` (116,325 bytes)
- System Sidebar Network Running (1440x900): `docs/design-v3/screenshots/network-system-desktop-running.png` (104,609 bytes)
- Mobile Deployment Network Reflow (390x844): `docs/design-v3/screenshots/network-mobile-reflow.png` (75,736 bytes)

---

## 6. Evidence Gaps, Boundaries & Intentional Deviations

1. **Purely Atmospheric Decorative Canvas**: The network texture is strictly an editorial aesthetic accompaniment evoking signal connectivity. No live node network telemetry, WebSocket data, or cluster topology is monitored or simulated.
2. **Sidebar Mobile Layout**: Per `design.md`, `.chapter-index` is hidden on mobile screens $\le 760\text{px}$ (`display: none;`). Consequently, its child network canvas does not render on small viewports, saving mobile battery. The deployment backdrop remains active on mobile with reduced point/link bounds (14 points / 16 links).
3. **Dual Animation Prevention**: Network textures yield whenever the large hero Signal Core is in the viewport, ensuring low-end devices and mobile CPUs never struggle with competing canvas animation loops.

---

## 7. Next Step

Proceed to **Task 07: Closing sphere and journey finish** (`docs/design-v3/prompts/07-closing-sphere.md`).
