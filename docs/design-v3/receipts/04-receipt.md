# Receipt 04: Default-On Motion, Global Pause & Hover Tilt

- **Date**: 2026-11-21T20:15:00+03:00
- **Branch**: `design/crimson-signal-v3`
- **Parent Commit**: `128223c428b5923b4397a1e9f726606ce54e5aa8` (`128223c`)
- **Status**: Complete — ready for review

---

## 1. Executive Summary

Task 04 implements the Signal Core motion policy and lifecycle state machine on `design/crimson-signal-v3`, transitioning the marketing hero sculpture from the v2 opt-in model to the approved default-on policy while preserving all Task 03 visual artwork and defensive lifecycle guarantees:
1. **Default-On Motion Policy**: The native WebGL sculpture auto-starts after initial semantic and SVG poster paint when the scene is visible in the viewport and neither OS reduced-motion nor a stored user pause is active.
2. **Persistent Global Preference**: "Pause animations" / "Resume animations" button toggles motion state and persists preference under versioned `localStorage` key `sg_motion_v1` using fail-safe `try/catch` and in-memory fallback. If `localStorage` throws a `SecurityError` (e.g. sandboxed iframe or private browsing), in-page controls continue operating without unhandled exceptions.
3. **OS Reduced-Motion Override**: `prefers-reduced-motion: reduce` overrides default-on behavior, suppresses WebGL import, tears down any running instance immediately upon runtime media changes, and displays "Reduced motion enabled" with `aria-pressed="false"`.
4. **Lifecycle State Machine**: Explicitly models `poster`, `eligible`, `loading`, `running`, `user-paused`, `system-reduced`, `suspended`, `failed`, and `disposed` states, tracked on `.core-stage` via `data-motion-state`. In-flight dynamic module imports are strictly cancelled on preference changes, `pagehide`, or document hiding. True failed states (e.g. network import failure or unsupported WebGL) permanently lock the control to "Static artwork active" (`disabled="true"`).
5. **Fine-Pointer Hover Tilt & Displacement with Cached Dimensions**: Eliminated per-frame layout thrashing by caching dimensions and DPR via `ResizeObserver` (removing `getBoundingClientRect()` from the frame loop). Fine-pointer interaction applies delta-time smoothed hover tilt (capped at $\pm 6^\circ \approx \pm 0.1047\text{ rad}$) and $+12\%$ shell wave displacement (`u_disp_mult = 1.12`), smoothly easing back to rest over $\sim 250\dots400\text{ms}$ upon `pointerleave`. Touch interactions (`pointerType: 'touch'`) fallback to ambient motion without hover dependence.
6. **Mobile Screenshot Discrepancy Resolution**: Reset scroll position to `(0, 0)` and verified resting skip-link geometry (`rect.bottom <= 0 || rect.top < 0`) both before and after screenshot capture, ensuring screenshot-induced scrolling does not leave the skip link in an invalid state. Dedicated keyboard focus evidence is captured separately on `#motion-toggle` without weakening the accessible skip link.

---

## 2. Changed Files & Scoped Architecture

| Path | Role in Task 04 Scope |
| :--- | :--- |
| `client/marketing/motion-policy.js` | **New**: Shared motion policy module defining versioned key (`sg_motion_v1`), explicit lifecycle states (`MotionState`), `try/catch`-wrapped storage getters/setters with in-memory fallback, and OS reduced-motion helpers. |
| `client/landing.js` | **Controller**: Implemented default-on auto-start after first paint for visible hero, preference precedence resolver, in-flight import cancellation token (`generation`), runtime reduced-motion & visibility event handlers, and `data-motion-state` tracking. |
| `client/marketing/signal-core.js` | **WebGL Engine**: Replaced per-frame `getBoundingClientRect()` with `ResizeObserver` cached dimensions; added vertex shader uniforms `u_tilt` (vec2) and `u_disp_mult` (float); added pointer listeners on `.core-stage` with delta-time smoothed easing and touch fallback; clean disposal of pointer listeners and observers. |
| `client/index.html` | Initialized `#motion-toggle` with `Pause animations` and `disabled` attribute to guarantee disabled state under no-JS environments while matching default-on expectations when hydrated. |
| `tests/browser/signal-core.spec.js` | **Test Suite**: Authored 20 comprehensive behavioral assertions covering default-on auto-start, persistent pause, reload persistence, resuming, repeated cycles, `localStorage` `SecurityError` resilience, OS reduced-motion override & runtime changes, in-flight cancellation, offscreen/visibility suspension, WebGL context loss, fallback, `/console/` navigation, hover tilt easing & touch fallback, and no-JS resilience. |
| `tests/browser/hero-capture.spec.js` | **Verification Spec**: Updated full-hero screenshot capture spec for default-on policy, verifying skip-link geometry both before and after capture to address screenshot-induced scroll discrepancies. |
| `docs/design-v3/screenshots/*` | Refreshed resting poster, resting render, and dedicated keyboard focus screenshot evidence. |

---

## 3. Actual Command Execution & Verification Results

### Unit Test Suite
- **Command**: `npm test`
- **Exit Code**: `0`
- **Result**: `16 passed (16 files, 151 passed)` (Duration: 7.94s)

### Signal Core Browser Lifecycle & Hover Test Suite
- **Command**: `npx playwright test tests/browser/signal-core.spec.js`
- **Exit Code**: `0`
- **Result**: `20 passed (27.6s)`
  - Test 1: Default-on auto-start after first paint for eligible visible scene (`passed`, 1.1s)
  - Test 2: Persistent global pause: clicking 'Pause animations' halts WebGL, hides canvas, restores poster, and stores preference (`passed`, 954ms)
  - Test 3: Pause persistence on page reload: stays paused on first paint without auto-starting (`passed`, 1.0s)
  - Test 4: Resuming animations: clicking 'Resume animations' removes pause preference and mounts WebGL (`passed`, 981ms)
  - Test 5: Repeated pause/resume cycles transition cleanly without leaks or stale state (`passed`, 2.2s)
  - Test 6: Storage failure resilience: controls work for current page even if localStorage throws SecurityError (`passed`, 1.0s)
  - Test 7: OS reduced motion overrides default-on: prevents module import, displays 'Reduced motion enabled' (`passed`, 1.1s)
  - Test 8: Runtime change to reduced motion while running immediately tears down WebGL (`passed`, 1.1s)
  - Test 9: Reduced-motion changes during async module loading aborts mounting (`passed`, 779ms)
  - Test 10: Offscreen pausing: IntersectionObserver stops animation loop when canvas is out of viewport (`passed`, 2.1s)
  - Test 11: Document visibility: cancels RAF when document is hidden and resumes when visible (`passed`, 2.4s)
  - Test 12: WebGL context loss cleanly restores poster, hides canvas, and resets toggle to Resume animations (`passed`, 1.3s)
  - Test 13: WebGL unsupported gracefully falls back to static artwork (`passed`, 978ms)
  - Test 14: Navigation to /console/ cleans up WebGL without console errors (`passed`, 1.2s)
  - Test 15: Failed enhancement module permanently disables control and displays static artwork text (`passed`, 824ms)
  - Test 16: Pagehide during delayed import cancels activation and pageshow restores usable control (`passed`, 922ms)
  - Test 17: Temporary document visibility change during delayed import cancels activation and restores usable control (`passed`, 779ms)
  - Test 18: Fine-pointer hover tilt and shell displacement applies delta-time smoothed response (`passed`, 1.5s)
  - Test 19: Touch fallback: pointerType='touch' does not trigger hover tilt or displacement (`passed`, 971ms)
  - Test 20: No-JS resilience: #motion-toggle remains disabled and semantic content / poster is visible (`passed`, 703ms)

### Full Hero Capture & Clearance Verification
- **Command**: `npx playwright test tests/browser/hero-capture.spec.js`
- **Exit Code**: `0`
- **Result**: `1 passed (10.3s)`
- **Actual Computed Focus Outline on `#motion-toggle`**:
  `{"outline":"rgb(255, 255, 255) solid 3px","outlineWidth":"3px","outlineStyle":"solid","outlineColor":"rgb(255, 255, 255)","outlineOffset":"3px"}`
- **Resting Skip-Link Geometry**: Verified offscreen (`rect.bottom <= 0 || rect.top < 0`) across desktop and mobile, both before capture and post-screenshot scroll reset.

### Marketing Full Suite Verification
- **Command**: `npx playwright test tests/browser/marketing.spec.js`
- **Exit Code**: `0`
- **Result**: `8 passed (13.1s)`

---

## 4. Asset Sizes & Performance Budgets

| Asset | Raw Size | Gzip Size | Budget Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| `client/landing.js` | 11,743 B (11.47 KiB) | 2,753 B (2.69 KiB) | Shared eager bundle | PASSED |
| `client/marketing/motion-policy.js` | 1,987 B (1.94 KiB) | 789 B (0.77 KiB) | Shared eager bundle | PASSED |
| `client/marketing/signal-core.js` | 14,666 B (14.32 KiB) | 4,387 B (4.28 KiB) | Lazy enhancement | PASSED |
| **Combined decorative runtime** | **28,396 B (27.73 KiB)** | **7,929 B (7.74 KiB)** | $\le 25\text{ KiB}$ gzip | **PASSED (31% of budget)** |
| `assets/brand/signal-core-poster.svg` | 71,402 B (69.73 KiB) | 16,346 B (15.96 KiB) | Static poster | PASSED |

---

## 5. Screenshot Evidence Files

- Desktop Resting Poster (1440x900): `docs/design-v3/screenshots/hero-final-poster-desktop.png` (258,635 bytes)
- Desktop Dedicated Keyboard Focus (1440x900): `docs/design-v3/screenshots/hero-final-focus-desktop.png` (259,172 bytes)
- Desktop Resting Render Default-On (1440x900): `docs/design-v3/screenshots/hero-final-render-desktop.png` (256,724 bytes)
- Mobile Resting Poster (390x844): `docs/design-v3/screenshots/hero-final-poster-mobile.png` (118,200 bytes)
- Mobile Resting Render Default-On (390x844): `docs/design-v3/screenshots/hero-final-render-mobile.png` (134,344 bytes)

---

## 6. Evidence Gaps & Non-Functional Boundaries

1. **No Backend or Customer Action Changes**: No mock or live customer actions, webhooks, or durable session endpoints were introduced.
2. **Native Architecture Preserved**: Zero dependencies on Lenis smooth scroll, custom cursor managers, Three.js, or client-side application frameworks.
3. **No Network Provider Requests**: All tests ran under local synthetic fixtures without live LLM or embedding provider requests.

---

## 7. Next Step

Proceed to **Task 05: System logo orbits and chapter indicators** (`docs/design-v3/prompts/05-system-orbits-chapters.md`) to integrate the canonical prism mark with coordinated orbit animations governed by the shared motion policy.
