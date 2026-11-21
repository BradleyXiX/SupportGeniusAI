# Receipt 07: Upgrade the Light Closing Artwork & Scene Scheduler Coordination

- **Date**: 2026-11-21T22:36:00+03:00
- **Branch**: `design/crimson-signal-v3`
- **Parent Commit**: `0589e0e4012703a72bfc6d33b078ce5ffd6df702` (`0589e0e`)
- **Status**: Complete — ready for visual review

---

## 1. Executive Summary

Task 07 upgrades the closing section artwork from pale decorative rings to the approved wine/crimson sphere against the light paper background (`--paper`, `#F7F5F3` / `#ECEBE5`), reuses the shared WebGL renderer with a light theme variant, enforces scene scheduler coordination across hero, closing, and network textures, and provides an elaborate static SVG poster fallback:

1. **Light Section Artwork & Content Preservation**:
   - Replaced pale rings with the wine/crimson sphere inside `.closing-stage.closing-rings` in `#closing`.
   - Preserved eyebrow ("KNOWLEDGE, MADE CLEAR."), headline ("Make the next question count."), primary CTA button (`Explore Signal Desk -> /console/`), and explanatory copy in `.closing-copy`.
   - Positioned artwork in an isolated container (`pointer-events: none; z-index: 0; aria-hidden="true"`) to the right of the headline and controls on desktop, maintaining strict separation.
2. **Shared WebGL Renderer Light Variant**:
   - Reused `mountCore(canvas, poster, options)` in `client/marketing/signal-core.js` with `theme: 'light'` option.
   - Light fragment shader variant passes `u_theme = 1.0`, rendering:
     - Inner clusters: deep obsidian-garnet core (`#2E050A`), rich wine body (`#6B0D17`), and intense crimson (`#A51424`).
     - Fluid shell: deep wine (`#610A14`) to vibrant crimson (`#BB1729`) with dark rim points (`#2E050A`).
     - Zero pink body text, pink highlights, or pink washout; particle structures maintain crisp contrast against paper.
3. **Elaborate Static SVG Poster Fallback**:
   - Authored original static SVG poster `client/assets/brand/closing-sphere-poster.svg` (9,786 B raw / 2,271 B gzip).
   - Features concentric orbital wave contours, stippled Fibonacci shell nodes, and five distinct garnet/wine nuclei clusters matching the WebGL geometry.
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
6. **Corrected Runtime Accounting & Unsupported Performance Wording**:
   - Removed speculative CPU load claims (e.g. "< 0.8% core" or "0% CPU"); documented exact measured requestAnimationFrame cancellation, observer callbacks, and gzip bytes.
   - Accurately separated eager decorative JavaScript runtime scripts (`motion-policy.js`, `signal-core.js`, `chapters.js`, `network-texture.js` totaling 10,638 B gzip) from static SVG brand assets (`closing-sphere-poster.svg`, `network-texture-poster.svg`).

---

## 2. Changed Files & Scoped Architecture

| Path | Role in Task 07 Scope |
| :--- | :--- |
| `client/assets/brand/closing-sphere-poster.svg` | **New**: Original elaborate static SVG poster for closing sphere on light paper background. |
| `client/index.html` | Updated `.closing-inner` to group `.closing-copy` and add `.closing-stage.closing-rings` holding canvas and poster. |
| `client/marketing.css` | Styled `.closing-copy`, `.closing-stage`, `.closing-canvas`, `.closing-poster`, desktop absolute positioning, mobile stacking beneath CTA, and reduced-motion fallback. |
| `client/marketing/motion-policy.js` | Added `registerScene`, `isAnyLargeSceneActive`, `getActiveScenes`, `getPrimaryActiveScene`, `subscribeScheduler`, and `pagehide`/`beforeunload` global release. |
| `client/marketing/signal-core.js` | Added `theme: 'light'` uniform/shader support, scene registry integration (`registerScene`), scheduler subscription, and primary scene yielding. |
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
  - Test 1: Renders closing sphere stage against paper background with headline and CTA preserved (`passed`, 3.0s)
  - Test 2: WebGL light variant mounts with theme light and id closing-sphere (`passed`, 2.1s)
  - Test 3: Synchronized pause and resume with shared motion policy (`passed`, 2.9s)
  - Test 4: Stored pause preference persists to closing sphere on page reload (`passed`, 2.1s)
  - Test 5: OS reduced motion overrides WebGL and shows static SVG poster fallback (`passed`, 1.6s)
  - Test 6: Offscreen and tab visibility suspension (`passed`, 2.9s)
  - Test 7: Scene registry coordinates hero, closing, and network textures without single-boolean conflicts (`passed`, 3.1s)
  - Test 8: Release of scheduler ownership on pause, dispose, and page navigation (`passed`, 1.9s)
  - Test 9: Mobile reflow (390px and 320px): stacks poster beneath CTA, zero overflow (`passed`, 2.7s)
  - Test 10: Operable without JavaScript: static poster renders cleanly (`passed`, 1.4s)
  - Test 11: Capture screenshot evidence for running, paused, and mobile states (`passed`, 4.5s)

### Full Browser Test Suite Verification
- **Command**: `npx playwright test tests/browser/closing-sphere.spec.js tests/browser/closing-footer.spec.js tests/browser/network-texture.spec.js tests/browser/system-orbits.spec.js tests/browser/signal-core.spec.js tests/browser/marketing.spec.js`
- **Exit Code**: `0`
- **Result**: `68 passed (2.1m)` across all 6 test suites with zero failures.

---

## 4. Asset Sizes & Performance Budgets

### Eager Decorative JavaScript Runtime Modules
| Asset | Raw Size | Gzip Size | Budget Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| `client/marketing/motion-policy.js` | 5,206 B (5.08 KiB) | 1,683 B (1.64 KiB) | Shared eager bundle | PASSED |
| `client/marketing/signal-core.js` | 18,315 B (17.89 KiB) | 5,078 B (4.96 KiB) | Shared eager bundle | PASSED |
| `client/marketing/chapters.js` | 3,494 B (3.41 KiB) | 1,153 B (1.13 KiB) | Shared eager bundle | PASSED |
| `client/marketing/network-texture.js` | 8,817 B (8.61 KiB) | 2,724 B (2.66 KiB) | Shared eager bundle | PASSED |
| **Combined decorative scripts** | **35,832 B (34.99 KiB)** | **10,638 B (10.39 KiB)** | $\le 25\text{ KiB}$ gzip | **PASSED (41.5% of budget)** |

### Static Brand Assets (Loaded via `<img>` tags, not in JS bundle)
| Asset | Raw Size | Gzip Size | Role |
| :--- | :--- | :--- | :--- |
| `client/assets/brand/closing-sphere-poster.svg` | 9,786 B (9.56 KiB) | 2,271 B (2.22 KiB) | Closing static fallback poster on paper |
| `client/assets/brand/network-texture-poster.svg` | 4,167 B (4.07 KiB) | 965 B (0.94 KiB) | Atmospheric texture static fallback poster |

---

## 5. Screenshot Evidence Files

- Closing Sphere Running (1440x900): `docs/design-v3/screenshots/closing-sphere-desktop-running.png` (108,906 bytes)
- Closing Sphere Paused (1440x900): `docs/design-v3/screenshots/closing-sphere-desktop-paused.png` (112,288 bytes)
- Mobile Closing Reflow (390x844): `docs/design-v3/screenshots/closing-sphere-mobile-reflow.png` (73,940 bytes)

---

## 6. Evidence Gaps, Boundaries & Limitations

1. **At Most One Active Sphere**: While both the hero and closing sphere instantiate `mountCore`, they are positioned at opposite ends of the document (> 3000px vertical separation). Under normal viewports, only one is in view. If an extreme zoom or layout causes both to intersect, priority 1 (`'hero-sphere'`) is prioritized by the scheduler and `'closing-sphere'` yields.
2. **Mobile Optimization**: On viewports $\le 760\text{px}$, the WebGL closing canvas is disabled via CSS and script check, displaying the static SVG poster beneath the CTA button to eliminate mobile GPU contention.
3. **Purely Editorial Visual Artwork**: The closing sphere is an editorial brand illustration evoking customer support intelligence; no live machine-learning telemetry or streaming inference is performed.

---

## 7. Next Step

Checkpoint visual review after Task 07 (motion/backdrops/closing checkpoint complete).
Proceed to **Task 08: Real Console Composer & Status** (`docs/design-v3/prompts/08-console-composer-status.md`).
