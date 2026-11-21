# Receipt 07: Upgrade the Light Closing Artwork & Scene Scheduler Coordination

- **Date**: 2026-11-21T23:05:00+03:00
- **Branch**: `design/crimson-signal-v3`
- **Parent Commit**: `3938364ad4973b877d76a8101a10efddfc86663b` (`3938364`)
- **Status**: Complete — ready for visual review

---

## 1. Executive Summary

Task 07 upgrades the closing section artwork from pale decorative rings to the approved wine/crimson sphere against the light paper background (`--paper`, `#F7F5F3` / `#ECEBE5`), reuses the shared WebGL renderer with a light theme variant, enforces scene scheduler coordination across hero, closing, and network textures, and provides an elaborate static SVG poster fallback:

1. **Light Section Artwork & Content Preservation**:
   - Replaced pale rings with the wine/crimson sphere inside `.closing-stage.closing-rings` in `#closing`.
   - Preserved eyebrow ("KNOWLEDGE, MADE CLEAR."), headline ("Make the next question count."), primary CTA button (`Explore Signal Desk -> /console/`), and explanatory copy in `.closing-copy`.
   - Positioned artwork in an isolated container (`pointer-events: none; z-index: 0; aria-hidden="true"`) to the right of the headline and controls on desktop, maintaining strict separation.
2. **Shared WebGL Renderer Light Variant & Artwork Correction**:
   - Reused `mountCore(canvas, poster, options)` in `client/marketing/signal-core.js` with `theme: 'light'` option.
   - Diagnosed and corrected alpha blending against off-white paper (`#F7F5F3`): low-opacity crimson against paper shifted color channels toward pale pink.
   - Darkened light-theme palette to deep wine and garnet (`garnetBlack vec3(0.12, 0.015, 0.03)`, `garnetDeep vec3(0.22, 0.03, 0.06)`, `wineRich vec3(0.42, 0.05, 0.10)`, `wineDark vec3(0.26, 0.03, 0.06)`, `wineMid vec3(0.40, 0.05, 0.09)`, and `rimGarnet vec3(0.16, 0.02, 0.04)`).
   - Sharpened light-theme point radius drop-off: `shape = (u_theme > 0.5) ? (1.0 - smoothstep(0.24, 0.5, dist)) : (1.0 - smoothstep(0.06, 0.5, dist))` and raised point alphas to deliberate semi-opaque/opaque levels (0.78 to 0.98), completely eliminating low-alpha pink halos.
   - Zero pink highlights, pink washout, or bloom passes; particle structures maintain crisp contrast against paper.
3. **Elaborate Static SVG Poster Fallback & Geometric Alignment**:
   - Authored original static SVG poster `client/assets/brand/closing-sphere-poster.svg` (10,155 B raw / 2,442 B gzip).
   - Brought running WebGL and paused static poster into close alignment in silhouette, apparent size, orbital structure, and nucleus placement:
     - Scaled poster radius from 145px to 122px, matching projected WebGL unit sphere screen-space radius of ~112–124px.
     - Adjusted tilted orbital ellipses to `rx="120" ry="52"` (-22°) and `rx="116" ry="40"` (-15°), matching camera pitch and rotation.
     - Positioned the 5 nuclei clusters at exact projected coordinates: `(152, 162)`, `(205, 198)`, `(201, 157)`, `(157, 201)`, and `(182, 177)`.
   - Provides immediate fallback under `prefers-reduced-motion: reduce`, on phones ($\le 760\text{px}$), when WebGL fails, or in No-JS environments.
4. **Scene Scheduler Registry Coordination**:
   - Replaced single boolean flag with robust `registeredScenes` map registry in `client/marketing/motion-policy.js`.
   - Each large scene registers independently (`'hero-sphere'` with priority 1, `'closing-sphere'` with priority 2) and updates actual `{ isRunning, isVisible }` state.
   - Eliminates single-boolean race conditions where one scene scrolling out of view could clear the active flag while another scene remains visible.
   - Network textures in `#system` and `#deployment` yield CPU cycles whenever any large sphere is actively in viewport; when neither large sphere is in view, network textures run freely.
   - Global release on navigation: `pagehide` and `beforeunload` listeners clear registry ownership.
5. **Mobile Reflow ($\le 760\text{px}$)**:
   - WebGL canvas disabled on mobile (`display: none !important`), saving mobile battery and GPU.
   - Static SVG poster stacks cleanly beneath the CTA button and copy with zero horizontal overflow at 390px and 320px.
6. **Corrected Runtime Accounting & Measured Verification**:
   - Removed speculative CPU load claims; documented exact measured requestAnimationFrame cancellation, observer callbacks, and gzip bytes.
   - Corrected runtime accounting to include `landing.js` in participating totals, accurately distinguished eager baseline scripts from the dynamically imported on-demand WebGL renderer (`signal-core.js`), and separated scripts from static SVG brand assets.

---

## 2. Changed Files & Scoped Architecture

| Path | Role in Task 07 Scope |
| :--- | :--- |
| `client/assets/brand/closing-sphere-poster.svg` | **New**: Original elaborate static SVG poster for closing sphere on light paper background, aligned in silhouette and cluster coordinates to WebGL. |
| `client/index.html` | Updated `.closing-inner` to group `.closing-copy` and add `.closing-stage.closing-rings` holding canvas and poster. |
| `client/marketing.css` | Styled `.closing-copy`, `.closing-stage`, `.closing-canvas`, `.closing-poster`, desktop absolute positioning, mobile stacking beneath CTA, and reduced-motion fallback. |
| `client/marketing/motion-policy.js` | Added `registerScene`, `isAnyLargeSceneActive`, `getActiveScenes`, `getPrimaryActiveScene`, `subscribeScheduler`, and `pagehide`/`beforeunload` global release. |
| `client/marketing/signal-core.js` | Added `theme: 'light'` uniform/shader support with deep wine/garnet pigments, scene registry integration (`registerScene`), scheduler subscription, and primary scene yielding. |
| `client/marketing/network-texture.js` | Updated coordination to subscribe to `subscribeScheduler` from `motion-policy.js`. |
| `client/landing.js` | Initialized closing sphere via `initClosingSphere()`, wired light theme, and updated hero sphere options. |
| `tests/browser/closing-sphere.spec.js` | **New**: Comprehensive Playwright test suite with 11 assertions covering layout, WebGL light theme, pause/resume sync, reload persistence, reduced motion, offscreen/visibility suspension, scheduler coordination, ownership release, mobile reflow, no-JS resilience, and visual screenshots. |
| `tests/browser/signal-core.spec.js` | Adjusted offscreen test scroll target to scroll out of hero viewport without overlapping closing section. |
| `docs/design-v3/screenshots/*` | Captured desktop running, desktop paused, and mobile reflow screenshot evidence for closing sphere. |

---

## 3. Actual Command Execution & Verification Results

### Unit Test Suite
- **Command**: `npm test`
- **Exit Code**: `0`
- **Result**: `16 passed (16 files, 151 passed)` (Duration: 15.91s)

### Closing Sphere Playwright Test Suite
- **Command**: `npx playwright test tests/browser/closing-sphere.spec.js`
- **Exit Code**: `0`
- **Result**: `11 passed (36.5s)`
  - Test 1: Renders closing sphere stage against paper background with headline and CTA preserved (`passed`, 1.5s)
  - Test 2: WebGL light variant mounts with theme light and id closing-sphere (`passed`, 1.7s)
  - Test 3: Synchronized pause and resume with shared motion policy (`passed`, 3.1s)
  - Test 4: Stored pause preference persists to closing sphere on page reload (`passed`, 2.0s)
  - Test 5: OS reduced motion overrides WebGL and shows static SVG poster fallback (`passed`, 1.6s)
  - Test 6: Offscreen and tab visibility suspension (`passed`, 2.4s)
  - Test 7: Scene registry coordinates hero, closing, and network textures without single-boolean conflicts (`passed`, 2.4s)
  - Test 8: Release of scheduler ownership on pause, dispose, and page navigation (`passed`, 1.5s)
  - Test 9: Mobile reflow (390px and 320px): stacks poster beneath CTA, zero overflow (`passed`, 2.6s)
  - Test 10: Operable without JavaScript: static poster renders cleanly (`passed`, 1.3s)
  - Test 11: Capture screenshot evidence for running, paused, and mobile states (`passed`, 4.0s)

### Selected Regression Suites Verification (Closing, Network Texture, Signal Core)
- **Command**: `npx playwright test tests/browser/closing-sphere.spec.js tests/browser/network-texture.spec.js tests/browser/signal-core.spec.js`
- **Exit Code**: `0`
- **Result**: `41 passed (1.2m)` across the 3 affected browser suites with zero failures.

### Selected Regression Suites Verification (6 Suites)
- **Command**: `npx playwright test tests/browser/closing-sphere.spec.js tests/browser/closing-footer.spec.js tests/browser/network-texture.spec.js tests/browser/system-orbits.spec.js tests/browser/signal-core.spec.js tests/browser/marketing.spec.js`
- **Exit Code**: `0`
- **Result**: `68 passed (2.1m)` across the 6 selected regression suites with zero failures.

---

## 4. Asset Sizes & Performance Budgets

### Eager Baseline JavaScript Runtime Modules
| Asset | Raw Size | Gzip Size | Role |
| :--- | :--- | :--- | :--- |
| `client/landing.js` | 15,142 B (14.79 KiB) | 3,351 B (3.27 KiB) | Landing page controller & section initializers |
| `client/marketing/motion-policy.js` | 5,206 B (5.08 KiB) | 1,692 B (1.65 KiB) | Motion policy, preferences & scene scheduler registry |
| `client/marketing/chapters.js` | 3,494 B (3.41 KiB) | 1,160 B (1.13 KiB) | System architecture chapters controller |
| `client/marketing/network-texture.js` | 8,817 B (8.61 KiB) | 2,727 B (2.66 KiB) | Atmospheric decorative 2D canvas texture |
| **Subtotal (Eager Baseline Scripts)** | **32,659 B (31.89 KiB)** | **8,930 B (8.72 KiB)** | Baseline runtime loaded on initial page load |

### Dynamically Imported On-Demand WebGL Renderer Module
| Asset | Raw Size | Gzip Size | Role |
| :--- | :--- | :--- | :--- |
| `client/marketing/signal-core.js` | 18,438 B (18.01 KiB) | 5,153 B (5.03 KiB) | WebGL point-cluster renderer (imported on demand) |

### Participating JavaScript Runtime Total
| Metric | Raw Size | Gzip Size | Budget Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **All Participating Client Scripts** | **51,097 B (49.90 KiB)** | **14,083 B (13.75 KiB)** | $\le 25\text{ KiB}$ gzip | **PASSED (55.0% of budget)** |

### Static Brand Assets (Loaded via `<img>` tags, not in JS bundle)
| Asset | Raw Size | Gzip Size | Role |
| :--- | :--- | :--- | :--- |
| `client/assets/brand/closing-sphere-poster.svg` | 10,155 B (9.92 KiB) | 2,442 B (2.38 KiB) | Closing static fallback poster on paper |
| `client/assets/brand/network-texture-poster.svg` | 4,167 B (4.07 KiB) | 964 B (0.94 KiB) | Atmospheric texture static fallback poster |

---

## 5. Screenshot Evidence Files

- Closing Sphere Running (1440x900): `docs/design-v3/screenshots/closing-sphere-desktop-running.png` (117,008 bytes)
- Closing Sphere Paused (1440x900): `docs/design-v3/screenshots/closing-sphere-desktop-paused.png` (94,080 bytes)
- Mobile Closing Reflow (390x844): `docs/design-v3/screenshots/closing-sphere-mobile-reflow.png` (61,008 bytes)

---

## 6. Evidence Gaps, Boundaries & Limitations

1. **At Most One Active Sphere**: While both the hero and closing sphere instantiate `mountCore`, they are positioned at opposite ends of the document (> 3000px vertical separation). Under normal viewports, only one is in view. If an extreme zoom or layout causes both to intersect, priority 1 (`'hero-sphere'`) is prioritized by the scheduler and `'closing-sphere'` yields.
2. **Mobile Optimization**: On viewports $\le 760\text{px}$, the WebGL closing canvas is disabled via CSS and script check, displaying the static SVG poster beneath the CTA button to eliminate mobile GPU contention.
3. **Purely Editorial Visual Artwork**: The closing sphere is an editorial brand illustration evoking customer support intelligence; no live machine-learning telemetry or streaming inference is performed.

---

## 7. Next Step

Checkpoint visual review after Task 07 (motion/backdrops/closing checkpoint complete).
Proceed to **Task 08: Real Console Composer & Status** (`docs/design-v3/prompts/08-console-composer-status.md`).
