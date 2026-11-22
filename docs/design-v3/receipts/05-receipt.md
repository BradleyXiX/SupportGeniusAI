# Receipt 05: System Logo Orbits, Canonical Prism & Shared Motion Policy

- **Date**: 2026-11-21T21:16:00+03:00
- **Branch**: `design/crimson-signal-v3`
- **Parent Commit**: `54b2a2cba728c99bd84eb9553ab459f339e270d8` (`54b2a2c`)
- **Status**: Complete — ready for review

---

## 1. Executive Summary

Task 05 replaces the legacy "SG" text in `#system` with the canonical prism mark and adds three coordinated, slow orbit rotations governed strictly by the shared motion policy on `design/crimson-signal-v3`:
1. **Canonical Prism Mark**: Replaced center `<b>SG</b>` text with the canonical brand prism asset (`/assets/brand/supportgenius-mark.svg`) anchored in an isolated, fixed center container (`.orbit-center`) that stays completely static without rotating.
2. **Single Transform Owner Architecture**: Implemented separate wrappers for static 3D tilt and continuous 2D rotation:
   - Outer wrapper `.orbit-tilt` exclusively owns the static tilt transform (`rotateZ(...) rotateX(...)`), with zero animation keyframes.
   - Inner wrapper `.orbit-spin` exclusively owns continuous rotation animation (`transform: rotate(0deg) -> rotate(360deg)`), preventing competing transform property owners.
   - Track 1 (Chapter 01 - Knowledge): 18s period, clockwise (`orbit-spin-cw`).
   - Track 2 (Chapter 02 - Context): 24s period, counter-clockwise (`orbit-spin-ccw`).
   - Track 3 (Chapter 03 - Reply): 30s period, clockwise (`orbit-spin-cw`).
   - Orbit paths rendered with fine crimson/wine borders (`1px solid rgba(187, 23, 41, 0.35)`) and 6px glowing nodes.
3. **Shared Motion Policy Subscription**:
   - Zero independent frame loops or storage preferences: rings subscribe directly to `isMotionAllowed()` and `subscribeMotionPreference` via `client/marketing/motion-policy.js`.
   - Global pause: clicking "Pause animations" in the hero immediately pauses orbit rotations via `animation-play-state: paused`. Resuming immediately unpauses.
   - Reload persistence: stored pause preference (`localStorage.getItem('sg_motion_v1') === 'paused'`) initializes orbits in paused state.
   - Reduced motion: `prefers-reduced-motion: reduce` halts animations completely (`animation: none !important`).
   - Offscreen & tab visibility suspension: `IntersectionObserver` on `.orbit-small` and `visibilitychange` suspend rotations whenever offscreen or backgrounded, consuming zero compositor cycles.
4. **Illustrative Chapter Highlighting**:
   - As native `<details name="system-chapters">` disclosures are toggled, `.orbit-small` updates `data-active-chapter="1"|"2"|"3"`.
   - The active ring receives a subtle wine/crimson highlight (`border-color: rgba(187, 23, 41, 0.85); box-shadow: 0 0 8px rgba(187, 23, 41, 0.25)` and warm-white node) without any flashing.
   - Explanatory copy (`<p class="fine">`) remains completely static and accessible, truthfully disclosing: "Select a step to explore the system. Illustration, not live processing telemetry."
5. **Mobile Reflow & No-JS Fallback**:
   - At $\le 760\text{px}$, the decorative sidebar (`.chapter-index`) is hidden (`display: none;`) as specified in `design.md`, while the chapter disclosures stack and remain fully functional.
   - In No-JS environments, the static tilted rings and canonical prism logo render cleanly without throwing errors.

---

## 2. Changed Files & Scoped Architecture

| Path | Role in Task 05 Scope |
| :--- | :--- |
| `client/index.html` | Updated `.chapter-index` to replace `<b>SG</b>` with `.orbit-center` holding `/assets/brand/supportgenius-mark.svg` and three distinct tracks (`track-1`, `track-2`, `track-3`) each with `.orbit-tilt` and `.orbit-spin` wrappers. |
| `client/marketing.css` | Defined 3D perspective, outer static tilt transforms, inner keyframe rotation animations (18s / 24s / 30s in alternating directions), fine red/wine borders, chapter active highlights, paused play-state rules, and `prefers-reduced-motion` overrides. |
| `client/marketing/chapters.js` | Subscribed `.orbit-small` to shared motion policy (`motion-policy.js`), wired `IntersectionObserver` offscreen pausing, tab `visibilitychange` suspension, and exclusive disclosure active-chapter tracking. |
| `client/marketing/motion-policy.js` | Added subscription mechanism (`subscribeMotionPreference`, `notifyMotionPreferenceChange`) and hooked storage change notifications. |
| `client/landing.js` | Connected OS reduced motion media query listener to `notifyMotionPreferenceChange` to broadcast OS preference changes. |
| `tests/browser/system-orbits.spec.js` | **New**: Comprehensive Playwright test suite with 10 assertions covering canonical prism presence, separate tilt/rotation transform ownership, hero pause/resume synchronization, reload persistence, reduced-motion overrides, offscreen/hidden suspension, chapter highlighting, mobile reflow, and no-JS resilience. |
| `docs/design-v3/screenshots/*` | Added desktop running, desktop paused, and mobile chapters reflow screenshot evidence. |

---

## 3. Actual Command Execution & Verification Results

### Unit Test Suite
- **Command**: `npm test`
- **Exit Code**: `0`
- **Result**: `16 passed (16 files, 151 passed)` (Duration: 6.78s)

### System Orbits Playwright Test Suite
- **Command**: `npx playwright test tests/browser/system-orbits.spec.js`
- **Exit Code**: `0`
- **Result**: `10 passed (24.4s)`
  - Test 1: Fixed canonical prism mark replaces legacy SG text (`passed`, 1.4s)
  - Test 2: Three separate-wrapper orbit tracks enforce single transform owner (`passed`, 2.1s)
  - Test 3: Synchronized pause and resume with hero motion policy (`passed`, 2.2s)
  - Test 4: Stored pause preference persists to orbits on page reload (`passed`, 1.3s)
  - Test 5: OS reduced motion overrides animation without frame loop (`passed`, 1.3s)
  - Test 6: Offscreen and tab visibility suspension (`passed`, 2.9s)
  - Test 7: Illustrative chapter highlight tracks active chapter disclosure (`passed`, 1.9s)
  - Test 8: Mobile reflow omits decorative orbit mark and preserves chapter disclosure usability (`passed`, 1.2s)
  - Test 9: No-JS resilience: static tilted rings and canonical logo render without script (`passed`, 1.1s)
  - Test 10: Capture screenshot evidence for running, paused, and mobile states (`passed`, 3.2s)

### Regression Test Verification
- **Command**: `npx playwright test tests/browser/signal-core.spec.js tests/browser/marketing.spec.js`
- **Exit Code**: `0`
- **Result**: `28 passed (59.3s)` (all 20 Signal Core tests and 8 Marketing tests passed with zero regressions)

---

## 4. Asset Sizes & Performance Budgets

| Asset | Raw Size | Gzip Size | Budget Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| `client/marketing/chapters.js` | 3,494 B (3.41 KiB) | 1,153 B (1.13 KiB) | Shared eager bundle | PASSED |
| `client/marketing/motion-policy.js` | 2,394 B (2.34 KiB) | 904 B (0.88 KiB) | Shared eager bundle | PASSED |
| `client/marketing.css` | 35,130 B (34.31 KiB) | 5,634 B (5.50 KiB) | Critical CSS | PASSED |
| **Combined decorative runtime** | **29,545 B (28.85 KiB)** | **8,336 B (8.14 KiB)** | $\le 25\text{ KiB}$ gzip | **PASSED (33% of budget)** |

---

## 5. Screenshot Evidence Files

- Desktop Orbits Running (1440x900): `docs/design-v3/screenshots/system-orbits-desktop-running.png` (94,224 bytes)
- Desktop Orbits Paused (1440x900): `docs/design-v3/screenshots/system-orbits-desktop-paused.png` (94,134 bytes)
- Mobile System Chapters Reflow (390x844): `docs/design-v3/screenshots/system-chapters-mobile.png` (53,242 bytes)

---

## 6. Correction-Free Limitations & Boundaries

1. **Illustrative Only**: The active chapter orbit ring highlight is strictly an editorial visual accompaniment. No live processing telemetry, WebSocket streaming, or backend inspection is performed.
2. **GPU Composited Rotation**: Orbit rotations use native CSS keyframe transforms without allocating JavaScript frame loops or per-frame timer callbacks.
3. **Responsive Mobile Exemption**: In accordance with `design.md`, the decorative orbit mark is omitted on viewports $\le 760\text{px}$ (`display: none;`) to maximize vertical clearance and readability of the functional chapter disclosures.

---

## 7. Next Step

Proceed to **Task 06: Bounded network texture in sidebar and deployment backdrops** (`docs/design-v3/prompts/06-network-texture.md`).
